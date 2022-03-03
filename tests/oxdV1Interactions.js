const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { batchConnect } = require("../../deployedLogger/addressGetter");
const deployAll = require("../../scripts/deployAll");
let i;
let amount;
const oxdV1veSOLID = ethers.BigNumber.from("2376588000000000000000000");
const oxdV1SnapshotTotalSupply = ethers.BigNumber.from(
  "1294802716773849662269150314"
);
let oxSolidRedeemed;
let oxdV1RewardsBalance;
const ETHERS = ethers.BigNumber.from("1000000000000000000");
const UST = ethers.BigNumber.from("1000000");

describe("OXDv1 Interactions", function () {
  beforeEach(async function () {
    [, owner2, owner3] = await ethers.getSigners(3);
  });

  it("Fetch interfaces", async () => {
    i = await deployAll(true);
    owner = Deployer;
    await i.userProxyInterface.connect(Deployer).clearVoteDelegate();
    userProxyAddress = i.oxLens.userProxyByAccount(Deployer.address);
    i.userProxy = await ethers.getContractAt(
      "UserProxyInterface",
      userProxyAddress
    );
    i = await batchConnect(i, Deployer);
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
    await i.oxdV1.approve(i.userProxyInterface.address, amount);
    await i.userProxyInterface["redeemOxdV1(uint256)"](amount);
    oxSolidRedeemed = (await i.oxSolid.balanceOf(owner.address)).sub(
      oxSolidBefore
    );
    expectedAmount = amount.mul(oxdV1veSOLID).div(oxdV1SnapshotTotalSupply);
    expect(oxSolidRedeemed).eq(expectedAmount);
  });

  it("Stake some oxSOLID in oxdV1Rewards", async () => {
    amount = oxSolidRedeemed;
    console.log("redeemed:", oxSolidRedeemed);
    console.log("cap:", await i.oxdV1Rewards.stakingCap(i.userProxy.address));
    await i.oxSolid.approve(i.userProxyInterface.address, amount);
    await i.userProxyInterface["stakeOxSolidInOxdV1(uint256)"](amount);
    oxdV1RewardsBalance = await i.oxdV1Rewards.balanceOf(i.userProxy.address);
    expect(oxdV1RewardsBalance).gt(0);

    await network.provider.send("evm_increaseTime", [86400 * 1]);
    await network.provider.send("evm_mine");

    positionsOf = await i.oxLens["positionsOf(address)"](owner.address);
    console.log(positionsOf);
  });

  it("Redeem and Stake OXDv1 for oxSOLID", async () => {
    amount = new ethers.BigNumber.from("100000000000000000");
    oxSolidBefore = await i.oxSolid.balanceOf(owner.address);
    await i.oxdV1.approve(i.userProxyInterface.address, amount);
    await i.userProxyInterface["redeemAndStakeOxdV1(uint256)"](amount);
    oxSolidRedeemed = (await i.oxSolid.balanceOf(owner.address))
      .sub(oxSolidBefore)
      .add(await i.oxdV1Rewards.balanceOf(i.userProxy.address))
      .sub(oxSolidRedeemed);
    expectedAmount = amount.mul(oxdV1veSOLID).div(oxdV1SnapshotTotalSupply);
    expect(oxSolidRedeemed).eq(expectedAmount);
    expect(await i.oxdV1Rewards.balanceOf(i.userProxy.address)).gt(
      oxdV1RewardsBalance
    );
    positionsOf = await i.oxLens.positionsOf(owner.address);
    console.log(positionsOf);
  });
});
