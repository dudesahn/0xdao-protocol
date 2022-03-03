const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { batchConnect } = require("../../deployedLogger/addressGetter");
const deployAll = require("../../scripts/deployAll");
let i;
let lpBalanceBefore, positions, userProxyAddress, solidAmount, zeroAddress;
const week = 86400 * 7;

describe("End-to-end", function () {
  beforeEach(async function () {
    [, owner2, owner3, owner4] = await ethers.getSigners(3);
  });

  it("Fetch interfaces", async () => {
    i = await deployAll(true);
    owner = beep;
    i = await batchConnect(i, beep);
  });

  it("Setup and get LP token", async () => {
    // Transfer LP to owner 2
    await i.pool.transfer(
      owner2.address,
      await i.pool.balanceOf(owner.address)
    );

    // Make sure balance is greater than zero
    lpBalanceBefore = await i.pool.balanceOf(owner2.address);
    expect(lpBalanceBefore).gt(0);
  });

  it("Deposit and stake LP token in oxPool", async () => {
    i.pool
      .connect(owner2)
      .approve(i.userProxyInterface.address, lpBalanceBefore);
    await i.userProxyInterface
      .connect(owner2)
      ["depositLpAndStake(address,uint256)"](i.pool.address, lpBalanceBefore);

    // Wait for earnings to accumulate
    for (let index = 0; index < 10; index++) {
      await ethers.provider.send("evm_mine");
    }

    // Make sure staking positions increase
    const stakingPoolsPositions = await i.oxLens
      .connect(owner2)
      ["stakingPoolsPositions()"]();
    expect(stakingPoolsPositions.length).eq(1);

    console.log("teh pool", await i.oxLens.oxPoolData(i.oxPool.address));
    console.log(stakingPoolsPositions);

    // Make sure positions of contains staking pools
    positions = await i.oxLens.positionsOf(owner2.address);
    expect(positions.stakingPools.length).eq(1);
  });

  it("Withdraw and unstake LP token", async () => {
    // Withdraw and unstake
    await i.userProxyInterface
      .connect(owner2)
      ["unstakeLpWithdrawAndClaim(address,uint256)"](
        i.pool.address,
        lpBalanceBefore
      );

    // Make sure staking positions decrease
    const stakingPoolsPositions = await i.oxLens
      .connect(owner2)
      ["stakingPoolsPositions()"]();
    expect(stakingPoolsPositions.length).to.eq(0);

    // Make sure lp balance increases
    let lpBalanceAfter = await i.pool.balanceOf(owner2.address);
    expect(lpBalanceAfter).to.eq(lpBalanceBefore);
  });

  it("Deposit and stake SOLID", async () => {
    // Get some SOLID (first get rid of SOLID and OXD)
    await i.solid
      .connect(owner2)
      .transfer(owner4.address, await i.oxLens.solidBalanceOf(owner2.address));
    await i.oxd
      .connect(owner2)
      .transfer(owner4.address, await i.oxd.balanceOf(owner2.address));
    positions = await i.oxLens.positionsOf(owner2.address);

    expect(await i.oxLens.solidBalanceOf(owner2.address)).eq(0);
    expect(positions.solidBalanceOf).eq(0);
    solidAmount = "1000000000000000000000";
    i.solid.transfer(owner2.address, solidAmount);
    expect(await i.solid.balanceOf(owner2.address)).eq(solidAmount);
    expect(await i.oxLens.solidBalanceOf(owner2.address)).eq(solidAmount);

    // Check SOLID balance on lens
    positions = await i.oxLens.positionsOf(owner2.address);
    expect(positions.solidBalanceOf).eq(solidAmount);

    // Check oxSOLID balance on lens
    expect(positions.oxSolidBalanceOf).eq(0);
    expect(await i.oxLens.oxSolidBalanceOf(owner2.address)).eq(0);

    // Lock solid
    await i.solid
      .connect(owner2)
      .approve(i.userProxyInterface.address, solidAmount);
    await i.userProxyInterface
      .connect(owner2)
      ["convertSolidToOxSolidAndStake(uint256)"](solidAmount);

    // Make sure SOLID balance is reduced
    positions = await i.oxLens.positionsOf(owner2.address);
    expect(positions.solidBalanceOf).eq(0);

    // Make sure oxSOLID stays the same
    positions = await i.oxLens.positionsOf(owner2.address);
    expect(positions.oxSolidBalanceOf).eq(0);
    expect(await i.oxLens.oxSolidBalanceOf(owner2.address)).eq(0);

    // Make sure staked oxSOLID balance increases
    expect(positions.stakedOxSolidBalanceOf).eq(solidAmount);
    userProxyAddress = await i.userProxyFactory.userProxyByAccount(
      owner2.address
    );
    expect(await i.oxLens.stakedOxSolidBalanceOf(owner2.address)).eq(
      solidAmount
    );

    // Unstake oxSOLID
    await i.userProxyInterface
      .connect(owner2)
      ["unstakeOxSolid(uint256)"](solidAmount);

    // Make sure oxSOLID increases
    positions = await i.oxLens.positionsOf(owner2.address);
    expect(positions.oxSolidBalanceOf).eq(solidAmount);
    expect(await i.oxLens.oxSolidBalanceOf(owner2.address)).eq(solidAmount);

    // Make sure staked oxSOLID balance decreases
    expect(positions.stakedOxSolidBalanceOf).eq(0);
  });

  it("Deposit and stake NFT", async () => {
    // Make sure user has no ve positions
    positions = await i.oxLens.positionsOf(owner2.address);
    let vePositions = positions.vePositions;
    expect(vePositions.length).eq(0);

    // Get some veNFT
    const tokenId = await i.ve.tokenOfOwnerByIndex(owner.address, 0);
    console.log("tokenid", tokenId);
    await i.ve.transferFrom(owner.address, owner2.address, tokenId);
    await network.provider.send("evm_mine");
    expect(await i.ve.ownerOf(tokenId)).eq(owner2.address);

    // ve positions should increase
    const lockedAmount = (await i.ve.locked(tokenId)).amount;
    positions = await i.oxLens.positionsOf(owner2.address);
    vePositions = positions.vePositions;
    console.log(vePositions);
    expect(vePositions.length).to.eq(1);
    expect(vePositions[0].tokenId).eq(tokenId);
    expect(vePositions[0].balanceOf).gt(0);
    expect(vePositions[0].locked).eq(lockedAmount);

    // Track oxSolid balance before
    positions = await i.oxLens.positionsOf(owner2.address);
    const oxSolidBalanceBefore = positions.oxSolidBalanceOf;

    // Deposit and stake NFT
    await i.ve.connect(owner2).approve(i.userProxyInterface.address, tokenId);
    await i.userProxyInterface
      .connect(owner2)
      .convertNftToOxSolidAndStake(tokenId);

    // Expect owner of NFT to be equal to zero address (token is merged now)
    zeroAddress = "0x0000000000000000000000000000000000000000";
    expect(await i.ve.ownerOf(tokenId)).eq(zeroAddress);

    // Make sure staked oxSOLID increases
    positions = await i.oxLens.positionsOf(owner2.address);
    expect(positions.stakedOxSolidBalanceOf).eq(lockedAmount);

    // oxSOLID balance should not change
    const oxSolidBalanceAfter = positions.oxSolidBalanceOf;
    expect(oxSolidBalanceBefore).eq(oxSolidBalanceAfter);
  });

  it("Test locking OXD for vlOxd", async () => {
    // Get some OXD
    positions = await i.oxLens.positionsOf(owner2.address);
    expect(positions.oxdBalanceOf).eq(0);
    let oxdBalanceBefore = await i.oxd.balanceOf(owner.address);
    const oxdBalanceIsOdd = oxdBalanceBefore % 2 !== 0;
    if (oxdBalanceIsOdd) {
      await i.oxd.transfer(owner4.address, 1);
    }
    oxdBalanceBefore = await i.oxd.balanceOf(owner.address);

    await i.oxd.transfer(owner2.address, oxdBalanceBefore);
    positions = await i.oxLens.positionsOf(owner2.address);
    expect(positions.oxdBalanceOf).eq(oxdBalanceBefore);

    // Check vlOxd balance before
    expect(positions.vlOxdBalanceOf).eq(0);

    // Lock OXD
    const oxdBalanceSplit = oxdBalanceBefore.div(2);
    await i.oxd
      .connect(owner2)
      .approve(i.userProxyInterface.address, oxdBalanceBefore);
    await i.userProxyInterface.connect(owner2).voteLockOxd(oxdBalanceSplit, 0);

    // Check positions
    let oxdBalanceAfter = await i.oxd.balanceOf(owner2.address);
    expect(oxdBalanceAfter).eq(oxdBalanceSplit);
    positions = await i.oxLens.positionsOf(owner2.address);
    expect(positions.oxdBalanceOf).eq(oxdBalanceSplit);
    expect(positions.vlOxdBalanceOf).eq(oxdBalanceSplit);

    let locksData = await i.oxLens.vlOxdLocksData(userProxyAddress);

    // Add a week to make sure we are in another epoch
    await network.provider.send("evm_increaseTime", [week]);
    await network.provider.send("evm_mine");

    // Lock more OXD
    await i.userProxyInterface.connect(owner2).voteLockOxd(oxdBalanceSplit, 0);

    // Check positions
    positions = await i.oxLens.positionsOf(owner2.address);
    expect(positions.oxdBalanceOf).eq(0);
    expect(positions.vlOxdBalanceOf).eq(oxdBalanceBefore);

    // Make sure lock info matches
    positions = await i.oxLens.positionsOf(owner2.address);
    locksData = await i.oxLens.vlOxdLocksData(userProxyAddress);

    // Make sure locks add up
    const totalLocked = locksData.locks[0].amount.add(
      locksData.locks[1].amount
    );
    expect(totalLocked).eq(positions.vlOxdBalanceOf);
  });

  it("Test withdrawing expired vlOXD", async () => {
    // Track vlOxd balance before withdraw
    positions = await i.oxLens.positionsOf(owner2.address);
    const vlOxdBalanceBefore = positions.vlOxdBalanceOf;
    const oxdBalanceBefore = positions.oxdBalanceOf;
    expect(vlOxdBalanceBefore).gt(0);
    expect(oxdBalanceBefore).eq(0);

    // Find unlock time
    let locksData = await i.oxLens.vlOxdLocksData(userProxyAddress);
    const firstUnlockTime = locksData.locks[0].unlockTime;

    // Cannot withdraw before lock expires
    await expect(i.userProxyInterface.connect(owner2).withdrawVoteLockedOxd(0))
      .to.be.reverted;

    // Fast-forward to unlock time
    await network.provider.send("evm_setNextBlockTimestamp", [
      firstUnlockTime - week,
    ]);
    await network.provider.send("evm_mine");

    // Withdrawal should still fail
    await expect(i.userProxyInterface.connect(owner2).withdrawVoteLockedOxd(0))
      .to.be.reverted;

    // Fast-forward one week (to account for epoch offset)
    await network.provider.send("evm_increaseTime", [week]);
    await network.provider.send("evm_mine");

    // Withdrawal should succeed
    await i.userProxyInterface.connect(owner2).withdrawVoteLockedOxd(0);

    // Check balances
    positions = await i.oxLens.positionsOf(owner2.address);
    const vlOxdBalanceAfter = positions.vlOxdBalanceOf;
    const oxdBalanceAfter = positions.oxdBalanceOf;
    expect(vlOxdBalanceAfter).eq(locksData.locks[1].amount);
    expect(oxdBalanceAfter).eq(
      vlOxdBalanceBefore.sub(locksData.locks[0].amount)
    );

    // Make sure number of locks updates
    locksData = await i.oxLens.vlOxdLocksData(userProxyAddress);
    expect(locksData.locks.length).eq(1);

    // Make sure second lock is still locked
    await expect(i.userProxyInterface.connect(owner2).withdrawVoteLockedOxd(0))
      .to.be.reverted;

    // Fast-forward one week (to make second lock expire)
    await network.provider.send("evm_increaseTime", [week]);
    await network.provider.send("evm_mine");

    // Relock
    await i.userProxyInterface.connect(owner2).relockVoteLockedOxd(0);

    // Check balances
    locksData = await i.oxLens.vlOxdLocksData(userProxyAddress);
    expect(locksData.locks.length).eq(1);
    positions = await i.oxLens.positionsOf(owner2.address);
    const vlOxdBalanceFinal = positions.vlOxdBalanceOf;
    const oxdBalanceFinal = positions.oxdBalanceOf;
    expect(vlOxdBalanceFinal).eq(vlOxdBalanceAfter);
    expect(oxdBalanceFinal).eq(oxdBalanceAfter);
  });

  it("Test voting", async () => {
    // User has not used any weight yet
    let votePositions = await i.oxLens.votePositionsOf(userProxyAddress);
    const weightAvailable = votePositions.weightAvailable;
    expect(weightAvailable).gt(0);
    expect(votePositions.weightUsed).eq(0);

    // Expect lens positionsOf to contain vote data
    positions = await i.oxLens.positionsOf(owner2.address);
    expect(positions.votesData.weightAvailable).gt(0);
    expect(positions.votesData.weightUsed).eq(0);
    expect(positions.votesData.votes.length).eq(0);

    // Vote
    await i.userProxyInterface
      .connect(owner2)
      ["vote(address,int256)"](i.pool.address, weightAvailable.mul(-1));
    positions = await i.oxLens.positionsOf(owner2.address);

    // Expect available vote weight to go down
    expect(positions.votesData.weightAvailable).eq(0);

    // Expect weight used to go up
    expect(positions.votesData.weightUsed).eq(weightAvailable);

    // Expect votes length to increase
    expect(positions.votesData.votes.length).eq(1);

    // Expect vote to be visible
    expect(positions.votesData.votes[0].poolAddress).eq(i.pool.address);
    expect(positions.votesData.votes[0].weight).eq(weightAvailable.mul(-1));

    // Remove vote
    await i.userProxyInterface.connect(owner2).removeVote(i.pool.address);
    positions = await i.oxLens.positionsOf(owner2.address);

    // Expect available vote weight to go up
    expect(positions.votesData.weightAvailable).eq(weightAvailable);

    // Expect weight used to go down
    expect(positions.votesData.weightUsed).eq(0);

    // Expect votes length to decrease
    expect(positions.votesData.votes.length).eq(0);

    // Batch vote
    await i.userProxyInterface
      .connect(owner2)
      ["vote((address,int256)[])"]([[i.pool.address, weightAvailable]]);
    positions = await i.oxLens.positionsOf(owner2.address);

    // Expect available vote weight to go down
    expect(positions.votesData.weightAvailable).eq(0);

    // Expect weight used to go up
    expect(positions.votesData.weightUsed).eq(weightAvailable);

    // Expect votes length to increase
    expect(positions.votesData.votes.length).eq(1);

    // Non-delegates cannot reset votes
    await expect(i.votingSnapshot["resetVotes(address)"](userProxyAddress)).to
      .be.reverted;

    // Set delegate
    await i.userProxyInterface.connect(owner2).setVoteDelegate(owner.address);
    positions = await i.oxLens.positionsOf(owner2.address);
    expect(positions.votesData.delegateAddress).eq(owner.address);

    // Reset votes from delegate
    await i.votingSnapshot["resetVotes(address)"](userProxyAddress);
    positions = await i.oxLens.positionsOf(owner2.address);

    // Expect votes length to decrease
    expect(positions.votesData.votes.length).eq(0);

    // Clear delegate
    await i.userProxyInterface.connect(owner2).clearVoteDelegate();
    positions = await i.oxLens.positionsOf(owner2.address);
    expect(positions.votesData.delegateAddress).eq(zeroAddress);
  });
});
