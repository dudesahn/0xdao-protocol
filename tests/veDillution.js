const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const deployAll = require("../../scripts/deployAll");
let i;
let userProxyInterface;
let userProxyAddress;
const ETHERS = ethers.BigNumber.from("1000000000000000000");
const UST = ethers.BigNumber.from("1000000");
let oxSolidTotalSupplyBefore;
let oxSolidRewardsPoolBalanceBefore;
let partnersRewardsPoolBalanceBefore;
let veNftLockedBalance;
let solidInflationSinceInception;

describe("Testing testingPrep", function () {
  beforeEach(async function () {
    [owner, owner2, owner3] = await ethers.getSigners(3);
  });

  it("Fetch interfaces", async () => {
    i = await deployAll(true, true);
  });

  it("Record base balances", async () => {
    //oxSOLID total supply
    oxSolidTotalSupplyBefore = await i.oxSolid.totalSupply();

    // oxSOLID in oxSOLID staking and partner pools
    oxSolidRewardsPoolBalanceBefore = await i.oxSolid.balanceOf(
      i.oxSolidRewardsPool.address
    );
    partnersRewardsPoolBalanceBefore = await i.oxSolid.balanceOf(
      i.partnersRewardsPool.address
    );

    // voterProxy data
    primaryTokenId = await i.voterProxy.primaryTokenId();
    lockData = await i.ve.locked(primaryTokenId);
    veNftLockedBalance = lockData.amount;
    solidInflationSinceInception =
      await i.voterProxy.solidInflationSinceInception();
    console.log("solidInflationSinceInception", solidInflationSinceInception);
  });

  it("Claim inflation", async () => {
    //wait a bit more than a week to ensure a distro happens
    await network.provider.send("evm_increaseTime", [86400 * 8]);
    await network.provider.send("evm_mine");

    //claim inflation
    await i.voterProxy.claim();

    // Record changes after claiming
    solidInflationSinceInceptionBefore = solidInflationSinceInception;
    solidInflationSinceInception =
      await i.voterProxy.solidInflationSinceInception();
    lockData = await i.ve.locked(primaryTokenId);
    console.log(lockData);
    console.log(lockData.amount);

    // Our veNFT's locked balance increased by this much
    veNftLockedIncrease = lockData.amount.sub(veNftLockedBalance);

    // Expected total inflation is (Δ+veNFT)/veNFT * previouslyRecordedInflation
    expectedInflation = veNftLockedIncrease
      .add(veNftLockedBalance)
      .mul(solidInflationSinceInceptionBefore)
      .div(veNftLockedBalance);

    console.log("solidInflationSinceInception", solidInflationSinceInception);
    console.log("expectedInflation", expectedInflation);

    // recorded solidInflationSinceInception should be equal to expectedInflation after rounding
    delta = solidInflationSinceInception.sub(expectedInflation).abs();
    expect(delta).lt(2);

    // solidInflationSinceInception should be > 1
    expect(solidInflationSinceInception).gt(ETHERS);

    // oxSOLID balance in oxSOLID staking pool should increase
    expect(await i.oxSolid.balanceOf(i.oxSolidRewardsPool.address)).gt(
      oxSolidRewardsPoolBalanceBefore
    );

    // oxSOLID balance in partners staking pool should increase
    expect(await i.oxSolid.balanceOf(i.partnersRewardsPool.address)).gt(
      partnersRewardsPoolBalanceBefore
    );
  });
});
