const { expect } = require("chai");
const { ethers } = require("hardhat");
const deployAll = require("../../scripts/deployAll");
let i;
let nonpartnerAmount = "4000000000000000000";
let partnerAmount = "6000000000000000000";
let partnersReceiveCvlOXD;
let owner3UserProxyAddress;
describe("Migrating to Partner Pool as a Non-partner After Being Whitelisted", function () {
  beforeEach(async function () {
    [owner, owner2, owner3] = await ethers.getSigners(3);
  });

  it("Fetch interfaces", async () => {
    i = await deployAll(true);
  });

  it("Lock SOLID -> oxSOLID -> stake (as non-partner, owner3)", async () => {
    //deposit SOLID->oxSOLID
    nonpartnerAmount = "4000000000000000000";
    await i.solid.transfer(owner3.address, nonpartnerAmount);
    console.log(
      "owner3 has this much SOLID",
      await i.solid.balanceOf(owner.address)
    );

    await i.solid
      .connect(owner3)
      .approve(i.voterProxy.address, nonpartnerAmount);
    oxSolidBefore = await i.oxSolid.balanceOf(owner3.address);

    await i.voterProxy.connect(owner3).lockSolid(nonpartnerAmount);
    oxSolidAfter = await i.oxSolid.balanceOf(owner3.address);
    expect(oxSolidAfter).to.be.above(oxSolidBefore);
    console.log("owner has this much oxSOLID: ", oxSolidAfter);
    expect(oxSolidAfter).to.be.above(oxSolidBefore);

    oxSolidBefore = oxSolidAfter;

    oxSolidStakedBefore = await i.oxSolidRewardsPool.balanceOf(owner3.address);
    await i.oxSolid
      .connect(owner3)
      .approve(i.userProxyInterface.address, nonpartnerAmount);

    await i.userProxyInterface
      .connect(owner3)
      ["stakeOxSolid(uint256)"](nonpartnerAmount);

    oxSolidStakedAfter = await i.oxLens.stakedOxSolidBalanceOf(owner3.address);
    oxSolidAfter = await i.oxSolid.balanceOf(owner3.address);

    console.log("owner3 has this much oxSOLID after staking: ", oxSolidAfter);
    console.log("owner3 has this much oxSOLID staked: ", oxSolidStakedAfter);

    expect(oxSolidStakedAfter).to.be.above(oxSolidStakedBefore);
  });

  it("Whitelist owner3 as a partner", async () => {
    owner3UserProxyAddress = await i.oxLens.userProxyByAccount(owner3.address);
    await i.partnersRewardsPool.setPartner(owner3UserProxyAddress, true);
    expect(await i.oxLens.isPartner(owner3UserProxyAddress)).eq(true);
  });

  it("Migrate owner3 to partner pool", async () => {
    UserProxyInterface = await ethers.getContractFactory("UserProxyInterface");
    owner3UserProxy = await UserProxyInterface.attach(owner3UserProxyAddress);
    await i.userProxyInterface.connect(owner3)["migrateOxSolidToPartner()"]();
    expect(await i.oxLens.stakedOxSolidBalanceOf(owner3.address)).eq(
      nonpartnerAmount
    );
  });

  it("Unstake oxSOLID -> oxSOLID as partner for owner3", async () => {
    oxSolidBefore = await i.oxSolid.balanceOf(owner3.address);
    await i.userProxyInterface.connect(owner3)["unstakeOxSolid()"]();
    oxSolidAfter = await i.oxSolid.balanceOf(owner3.address);

    console.log(
      "Unstaked oxSOLID + reward oxSOLID:",
      oxSolidAfter - oxSolidBefore
    );
    expect(oxSolidAfter).to.be.above(oxSolidBefore);
  });
});
