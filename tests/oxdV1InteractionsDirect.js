const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const deployAll = require("../../scripts/deployAll");
let i;
let amount;
const oxdV1veSOLID = ethers.BigNumber.from("2376588000000000000000000");
const oxdV1SnapshotTotalSupply = ethers.BigNumber.from(
  "1294802716773849662269150314"
);
let oxSolidRedeemed;
const ETHERS = ethers.BigNumber.from("1000000000000000000");
const UST = ethers.BigNumber.from("1000000");

describe("OXDv1 Interactions", function () {
  beforeEach(async function () {
    [owner, owner2, owner3] = await ethers.getSigners(3);
  });

  it("Fetch interfaces", async () => {
    i = await deployAll(true, true);
  });

  it("Get some oxSOLID and stake into oxdV1Redeem for people to redeem later", async () => {
    amount = oxdV1veSOLID;
    await i.solid.approve(i.voterProxy.address, amount);
    await i.voterProxy.lockSolid(amount);
    await i.oxSolid.approve(i.oxdV1Redeem.address, amount);
    await i.oxdV1Redeem.stake(amount);
    expect(await i.oxdV1Rewards.balanceOf(i.oxdV1Redeem.address)).eq(amount);
    expect(await i.oxdV1Redeem.redeemableOxSolid()).eq(amount);
    expect(await i.partnersRewardsPool.balanceOf(i.oxdV1Rewards.address)).eq(
      amount
    );
  });
  it("Burn some OXDv1 for oxSOLID", async () => {
    amount = new ethers.BigNumber.from("100000000000000000");
    oxSolidBefore = await i.oxSolid.balanceOf(owner.address);
    await i.oxdV1.approve(i.oxdV1Redeem.address, amount);
    await i.oxdV1Redeem.redeem(amount);
    oxSolidRedeemed = (await i.oxSolid.balanceOf(owner.address)).sub(
      oxSolidBefore
    );
    expecteddAmouht = amount.mul(oxdV1veSOLID).div(oxdV1SnapshotTotalSupply);
    expect(oxSolidRedeemed).eq(expecteddAmouht);
  });
  it("Stake some oxSOLID in oxdV1Rewards", async () => {
    amount = oxSolidRedeemed;
    console.log("redeemed:", oxSolidRedeemed);
    console.log("cap:", await i.oxdV1Rewards.stakingCap(owner.address));
    await i.oxSolid.approve(i.oxdV1Rewards.address, amount);
    await i.oxdV1Rewards.stake(amount);
    expect(await i.oxdV1Rewards.balanceOf(owner.address)).gt(0);
    positionsOf = await i.oxLens["positionsOf(address)"](owner.address);
    console.log(positionsOf);
  });
});
