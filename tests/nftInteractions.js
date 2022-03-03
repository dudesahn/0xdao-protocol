const { expect } = require("chai");
const { ethers } = require("hardhat");
const { batchConnect } = require("../../deployedLogger/addressGetter");
const deployAll = require("../../scripts/deployAll");
let i;
let solidAmountToConvert;

describe("NFT interactions", function () {
  beforeEach(async function () {
    [, owner2, owner3] = await ethers.getSigners(3);
  });

  it("Fetch interfaces", async () => {
    i = await deployAll(true);
    owner = beep;
    i = await batchConnect(i, beep);
  });

  it("SOLID -> veNFT -> oxSOLID", async () => {
    // Track balances
    const solidBalanceBefore = await i.solid.balanceOf(owner.address);
    solidAmountToConvert = solidBalanceBefore.div(100);
    expect(solidAmountToConvert).gt(0);
    const oxSolidBalanceBefore = await i.oxSolid.balanceOf(owner.address);
    const primaryTokenId = await i.voterProxy.primaryTokenId();
    const veBalanceOfNftBefore = await i.ve.balanceOfNFT(primaryTokenId);

    // Convert SOLID to oxSOLID
    await i.solid.approve(i.userProxyInterface.address, solidAmountToConvert);
    await i.userProxyInterface["convertSolidToOxSolid(uint256)"](
      solidAmountToConvert
    );

    // veBalanceOfNFT should go up
    const veBalanceOfNftAfter = await i.ve.balanceOfNFT(primaryTokenId);
    expect(veBalanceOfNftAfter).gt(veBalanceOfNftBefore);

    // oxSOLID amount should go up
    const oxSolidBalanceAfter = await i.oxSolid.balanceOf(owner.address);
    expect(oxSolidBalanceAfter).to.equal(
      ethers.BigNumber.from(oxSolidBalanceBefore).add(solidAmountToConvert)
    );

    // SOLID balance should go down
    const solidBalanceAfter = await i.solid.balanceOf(owner.address);
    expect(solidBalanceAfter).to.equal(
      solidBalanceBefore.sub(solidAmountToConvert)
    );
  });

  it("SOLID -> veNFT -> oxSOLID -> Staked oxSOLID", async () => {
    // Track balances
    const solidBalanceBefore = await i.solid.balanceOf(owner.address);
    expect(solidBalanceBefore).gt(0);
    const oxSolidBalanceBefore = await i.oxSolid.balanceOf(owner.address);
    const stakedBalanceBefore = await i.oxLens.stakedOxSolidBalanceOf(
      owner.address
    );
    const gaugeBalanceBefore = await i.solidGauge.balanceOf(
      i.voterProxy.address
    );

    // Convert SOLID to staked oxSOLID
    await i.solid.approve(i.userProxyInterface.address, solidAmountToConvert);
    await i.userProxyInterface["convertSolidToOxSolidAndStake(uint256)"](
      solidAmountToConvert
    );

    // SOLID amount should go down
    const solidBalanceAfter = await i.solid.balanceOf(owner.address);
    expect(solidBalanceAfter).to.equal(
      solidBalanceBefore.sub(solidAmountToConvert)
    );

    // oxSOLID amount should stay the same
    const oxSolidBalanceAfter = await i.oxSolid.balanceOf(owner.address);
    expect(oxSolidBalanceAfter).to.equal(oxSolidBalanceBefore);

    // Staked balance should go up
    const stakedBalanceAfter = await i.oxLens.stakedOxSolidBalanceOf(
      owner.address
    );
    expect(stakedBalanceAfter).to.equal(
      stakedBalanceBefore.add(solidAmountToConvert)
    );

    // Gauge balance should stay the same
    const gaugeBalanceAfter = await i.solidGauge.balanceOf(
      i.voterProxy.address
    );
    expect(gaugeBalanceAfter).to.equal(gaugeBalanceBefore);
  });

  it("veNFT -> oxSOLID", async () => {
    // Track balances
    const veBalanceBefore = await i.ve.balanceOf(owner.address);
    expect(veBalanceBefore).gt(0);
    const oxSolidBalanceBefore = await i.oxSolid.balanceOf(owner.address);
    tokenId = await i.ve.tokenOfOwnerByIndex(owner.address, 0);
    const amount = (await i.ve.locked(tokenId)).amount;

    // Convert
    await i.ve.setApprovalForAll(i.userProxyInterface.address, true);
    await i.userProxyInterface.convertNftToOxSolid(tokenId);

    // veBalance should go down
    const veBalanceAfter = await i.ve.balanceOf(owner.address);
    expect(veBalanceAfter).to.equal(veBalanceBefore.sub(1));

    // oxSolid should go up
    const oxSolidBalanceAfter = await i.oxSolid.balanceOf(owner.address);
    expect(oxSolidBalanceAfter).to.equal(oxSolidBalanceBefore.add(amount));
  });

  it("veNFT -> oxSOLID -> Staked oxSOLID", async () => {
    // Create new NFT
    await i.solid.approve(i.ve.address, solidAmountToConvert);
    await i.ve.create_lock(solidAmountToConvert, 31557600);
    const tokenId = await i.ve.tokenOfOwnerByIndex(owner.address, 0);

    // Track balances
    const veBalanceBefore = await i.ve.balanceOf(owner.address);
    expect(veBalanceBefore).gt(0);
    const oxSolidBalanceBefore = await i.oxSolid.balanceOf(owner.address);
    const stakedBalanceBefore = await i.oxLens.stakedOxSolidBalanceOf(
      owner.address
    );
    const primaryTokenId = await i.voterProxy.primaryTokenId();
    const veBalanceOfNftBefore = await i.ve.balanceOfNFT(primaryTokenId);
    const solidInNft = (await i.ve.locked(tokenId)).amount;

    // Convert
    await i.ve.setApprovalForAll(i.userProxyInterface.address, true);
    await i.userProxyInterface.convertNftToOxSolidAndStake(tokenId);

    // veBalance should go down
    const veBalanceAfter = await i.ve.balanceOf(owner.address);
    expect(veBalanceAfter).to.equal(veBalanceBefore.sub(1));

    // oxSolid should stay the same
    const oxSolidBalanceAfter = await i.oxSolid.balanceOf(owner.address);
    expect(oxSolidBalanceAfter).to.equal(oxSolidBalanceBefore);

    // Staked balance should go up
    stakedBalanceAfter = await i.oxLens.stakedOxSolidBalanceOf(owner.address);
    stakedBalanceAfter = await i.oxLens.stakedOxSolidBalanceOf(owner.address);
    expect(stakedBalanceAfter).to.equal(stakedBalanceBefore.add(solidInNft));

    // Primary token balance should go up
    const veBalanceOfNftAfter = await i.ve.balanceOfNFT(primaryTokenId);
    expect(veBalanceOfNftAfter).gt(veBalanceBefore);
  });

  it("oxSOLID -> Staked oxSOLID", async () => {
    // Convert SOLID to oxSOLID
    await i.solid.approve(i.userProxyInterface.address, solidAmountToConvert);
    await i.userProxyInterface["convertSolidToOxSolid(uint256)"](
      solidAmountToConvert
    );

    // Save balances
    const veBalanceBefore = await i.ve.balanceOf(owner.address);
    const oxSolidBalanceBefore = await i.oxSolid.balanceOf(owner.address);
    const oxSolidAmountToConvert = oxSolidBalanceBefore.div(2);
    const stakedBalanceBefore = await i.oxLens.stakedOxSolidBalanceOf(
      owner.address
    );
    const primaryTokenId = await i.voterProxy.primaryTokenId();
    const veLockedBefore = (await i.ve.locked(primaryTokenId)).amount;

    // Stake oxSOLID
    await i.oxSolid.approve(i.userProxyInterface.address, oxSolidBalanceBefore);
    await i.userProxyInterface["stakeOxSolid(uint256)"](oxSolidAmountToConvert);

    // veBalance should stay the same
    const veBalanceAfter = await i.ve.balanceOf(owner.address);
    expect(veBalanceAfter).to.equal(veBalanceBefore);

    // oxSolid balance should go down
    const oxSolidBalanceAfter = await i.oxSolid.balanceOf(owner.address);
    expect(oxSolidBalanceAfter).to.equal(
      oxSolidBalanceBefore.sub(oxSolidAmountToConvert)
    );

    // Staked should go up
    const stakedBalanceAfter = await i.oxLens.stakedOxSolidBalanceOf(
      owner.address
    );
    expect(stakedBalanceAfter).to.equal(
      stakedBalanceBefore.add(oxSolidAmountToConvert)
    );

    // Primary locked token balance should stay the same
    const veLockedAfter = (await i.ve.locked(primaryTokenId)).amount;
    expect(veLockedAfter).eq(veLockedBefore);
  });

  it("Staked oxSOLID -> oxSOLID", async () => {
    // Save balances
    const oxSolidBalanceBefore = await i.oxSolid.balanceOf(owner.address);
    const primaryTokenId = await i.voterProxy.primaryTokenId();
    const stakedBalanceBefore = await i.oxLens.stakedOxSolidBalanceOf(
      owner.address
    );

    expect(stakedBalanceBefore).gt(0);
    const unstakeAmount = stakedBalanceBefore.div(2);
    expect(unstakeAmount).gt(0);

    // Unstake oxSOLID
    await i.userProxyInterface["unstakeOxSolid(uint256)"](unstakeAmount);

    // oxSolid balance should go up
    const oxSolidBalanceAfter = await i.oxSolid.balanceOf(owner.address);
    expect(oxSolidBalanceAfter).gt(oxSolidBalanceBefore);

    // Staked balance should go down
    const stakedBalanceAfter = await i.oxLens.stakedOxSolidBalanceOf(
      owner.address
    );
    expect(stakedBalanceAfter).to.equal(stakedBalanceBefore.sub(unstakeAmount));
  });
});
