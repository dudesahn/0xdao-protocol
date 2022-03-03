const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const deployAll = require("../../scripts/deployAll");
let i;
let userProxyInterface;
let userProxyAddress;
const ETHERS = ethers.BigNumber.from("1000000000000000000");
const UST = ethers.BigNumber.from("1000000");

describe("Testing testingPrep", function () {
  beforeEach(async function () {
    [owner, owner2, owner3] = await ethers.getSigners(3);
  });

  it("Fetch interfaces", async () => {
    i = await deployAll(true, true, false, false);
  });

  it("Check PositionsOf", async () => {
    oxSolidRewards = await i.oxLens["rewardTokensPositionsOf(address,address)"](
      owner.address,
      i.oxSolidRewardsPool.address
    );
    lpRewards = await i.oxLens["rewardTokensPositionsOf(address,address)"](
      owner.address,
      i.oxPoolMultirewards.address
    );
    aggregatedRewards = await i.oxLens["rewardTokensPositionsOf(address)"](
      owner.address
    );
    positionsOf = await i.oxLens["positionsOf(address)"](owner.address);
    console.log("lpRewards:", lpRewards);
    // console.log(oxSolidRewards);
    //console.log(aggregatedRewards[0].rewardTokens[0]);
    console.log(positionsOf);
  });
  it("others", async () => {
    tx = await i.voterProxy.claimSolid(i.oxPool.address);
    receipt = await tx.wait();
    console.log("gasUsed:", receipt.gasUsed);
    await i.userProxyInterface.claimAllStakingRewards();

    console.log(i.tokensAllowlist.signer);
    await i.tokensAllowlist.setFeeClaimingDisabled(i.oxPool.address, false);
    tx = await i.oxPool.notifyFeeTokens();
    receipt = await tx.wait();
    console.log("gasUsed:", receipt.gasUsed);
    await i.tokensAllowlist.setNotifyRelativeFrequency(1, 1);
    frequencies = await i.tokensAllowlist.notifyFrequency();
    console.log(frequencies);
    expect(frequencies.bribeFrequency).eq(1);
    expect(frequencies.feeFrequency).eq(1);

    await i.tokensAllowlist.setNotifyRelativeFrequency(5, 1);
    frequencies = await i.tokensAllowlist.notifyFrequency();
    console.log(frequencies);
    expect(frequencies.bribeFrequency).eq(5);
    expect(frequencies.feeFrequency).eq(1);

    // Check if we have votes in bribe
    primaryTokenId = await i.voterProxy.primaryTokenId();
    expect(await i.bribe.balanceOf(primaryTokenId)).gt(0);

    // Allow userProxyInterface to spend solid pool LP
    const lpBalanceBefore = await i.solidPool.balanceOf(owner.address);
    expect(lpBalanceBefore).gt(0);
    await i.solidPool.approve(i.userProxyInterface.address, lpBalanceBefore);

    // Set pagination
    await i.tokensAllowlist.setBribeTokensSyncPageSize(1);
    await i.tokensAllowlist.setBribeTokensNotifyPageSize(1);

    receipts = [];
    for (j = 0; j < 5; j++) {
      //advance evm
      await network.provider.send("evm_increaseTime", [3600 * 8]);
      await network.provider.send("evm_mine");

      // Deposit and stake
      bribeOrFeeIndex1 = await i.oxPool.bribeOrFeesIndex();
      tx1 = await i.userProxyInterface["depositLpAndStake(address,uint256)"](
        i.solidPool.address,
        1
      );

      // Withdraw and unstake
      bribeOrFeeIndex2 = await i.oxPool.bribeOrFeesIndex();
      tx2 = await i.userProxyInterface["unstakeLpAndWithdraw(address,uint256)"](
        i.solidPool.address,
        1
      );

      console.log("round", j);
      receipt1 = await tx1.wait();
      gasUsed1 = receipt1.gasUsed;
      receipt2 = await tx2.wait();
      gasUsed2 = receipt2.gasUsed;

      roundReceipt = {
        round: j,
        bribeOrFeeIndex1: bribeOrFeeIndex1,
        deposit: gasUsed1,
        bribeOrFeeIndex2: bribeOrFeeIndex2,
        withdrawal: gasUsed2,
      };
      receipts.push(roundReceipt);
    }
    console.log(receipts);

    // check gas for xoPool.updateTokenAllowedState()
    tx = await i.oxPool.updateTokenAllowedState(i.usdt.address);
    receipt = await tx.wait();
    console.log("gasUsed", receipt.gasUsed);

    // check gas for xoPool.syncBribeTokens()
    tx = await i.oxPool["syncBribeTokens()"]();
    receipt = await tx.wait();
    console.log("gasUsed", receipt.gasUsed);

    //
    tx = await i.voterProxy.getRewardFromBribe(i.oxPool.address, [
      "0x0000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000",
    ]);
    receipt = await tx.wait();
    console.log("gasUsed", receipt.gasUsed);
  });
});
