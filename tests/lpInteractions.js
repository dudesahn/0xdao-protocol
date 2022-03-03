const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { batchConnect } = require("../../deployedLogger/addressGetter");
const deployAll = require("../../scripts/deployAll");
let i;
let userProxyInterface;
let userProxyAddress;

describe("Lp deposits and staking", function () {
  beforeEach(async function () {
    [, owner2, owner3] = await ethers.getSigners(3);
  });

  it("Fetch interfaces", async () => {
    i = await deployAll(true);
    owner = beep;
    i = await batchConnect(i, beep);
  });

  it("Deposit without staking", async () => {
    // First unstake and withdraw all
    await i.userProxyInterface["unstakeLpAndWithdraw(address)"](
      i.solidPool.address
    );

    // Fetch user proxy address
    await i.userProxyFactory.createAndGetUserProxy(owner.address);
    userProxyAddress = await i.userProxyFactory.userProxyByAccount(
      owner.address
    );

    // Allow userProxyInterface to spend solid pool LP
    const lpBalanceBefore = await i.solidPool.balanceOf(owner.address);
    expect(lpBalanceBefore).gt(0);
    await i.solidPool.approve(i.userProxyInterface.address, lpBalanceBefore);

    // Save before balances
    const gaugeBalanceBefore = await i.solidGauge.balanceOf(
      i.voterProxy.address
    );
    const stakedBalanceBefore = await i.oxPoolMultirewards.balanceOf(
      userProxyAddress
    );
    const oxPoolBalanceBefore = await i.oxPool.balanceOf(owner.address);

    // Deposit
    await i.userProxyInterface["depositLp(address)"](i.solidPool.address);

    // LP balance should be be zero
    const lpBalanceAfter = await i.solidPool.balanceOf(owner.address);
    const gaugeBalanceAfter = await i.solidGauge.balanceOf(
      i.voterProxy.address
    );
    expect(lpBalanceAfter).to.equal(0);

    // Make sure user's staked multirewards balance has stayed the same
    const stakedBalanceAfter = await i.oxPoolMultirewards.balanceOf(
      userProxyAddress
    );
    expect(stakedBalanceAfter).to.equal(stakedBalanceBefore);

    // Make sure the LP gets staked in the gauge on behalf of voter
    expect(gaugeBalanceAfter).to.equal(
      ethers.BigNumber.from(gaugeBalanceBefore).add(lpBalanceBefore)
    );

    // oxPool balance should go up
    const oxPoolBalanceAfter = await i.oxPool.balanceOf(owner.address);
    expect(oxPoolBalanceAfter).is.equal(
      oxPoolBalanceBefore.add(lpBalanceBefore)
    );
  });

  it("Withdraw unstaked LP", async () => {
    // Save balances before
    const oxPoolBalanceBefore = await i.oxPool.balanceOf(owner.address);
    expect(oxPoolBalanceBefore).gt(0);
    const lpBalanceBefore = await i.solidPool.balanceOf(owner.address);
    const stakedBalanceBefore = await i.oxPoolMultirewards.balanceOf(
      userProxyAddress
    );
    const gaugeBalanceBefore = await i.solidGauge.balanceOf(
      i.voterProxy.address
    );
    expect(gaugeBalanceBefore).gt(0);

    // Withdraw LP
    await i.oxPool.approve(i.userProxyInterface.address, oxPoolBalanceBefore);
    await i.userProxyInterface["withdrawLp(address,uint256)"](
      i.solidPool.address,
      oxPoolBalanceBefore
    );

    // LP balance should go up
    const lpBalanceAfter = await i.solidPool.balanceOf(owner.address);
    expect(lpBalanceAfter).to.equal(
      ethers.BigNumber.from(lpBalanceBefore).add(oxPoolBalanceBefore)
    );

    // Staked balance should stay the same
    const stakedBalanceAfter = await i.oxPoolMultirewards.balanceOf(
      userProxyAddress
    );
    expect(stakedBalanceAfter).to.equal(stakedBalanceAfter);

    // Gauge balance should go down
    const gaugeBalanceAfter = await i.solidGauge.balanceOf(
      i.voterProxy.address
    );
    expect(gaugeBalanceAfter).to.equal(
      ethers.BigNumber.from(gaugeBalanceBefore).sub(oxPoolBalanceBefore)
    );

    // oxPool balance should go down
    const oxPoolBalanceAfter = await i.oxPool.balanceOf(owner.address);
    expect(oxPoolBalanceAfter).is.equal(
      oxPoolBalanceBefore.sub(oxPoolBalanceBefore)
    );
  });

  it("Deposit and stake LP", async () => {
    // Fetch user proxy address
    await i.userProxyFactory.createAndGetUserProxy(owner.address);
    userProxyAddress = await i.userProxyFactory.userProxyByAccount(
      owner.address
    );

    // Allow userProxyInterface to spend solid pool LP
    const lpBalanceBefore = await i.solidPool.balanceOf(owner.address);
    expect(lpBalanceBefore).gt(0);
    await i.solidPool.approve(i.userProxyInterface.address, lpBalanceBefore);

    // Save before balances
    const gaugeBalanceBefore = await i.solidGauge.balanceOf(
      i.voterProxy.address
    );
    const stakedBalanceBefore = await i.oxPoolMultirewards.balanceOf(
      userProxyAddress
    );
    const positionsBefore = (await i.oxLens.positionsOf(owner.address))
      .stakingPools;

    // Deposit and stake
    await i.userProxyInterface["depositLpAndStake(address)"](
      i.solidPool.address
    );

    // LP balance should be be zero
    const lpBalanceAfter = await i.solidPool.balanceOf(owner.address);
    expect(lpBalanceAfter).to.equal(0);

    // Staked balance should  go up
    const stakedBalanceAfter = await i.oxPoolMultirewards.balanceOf(
      userProxyAddress
    );
    expect(stakedBalanceAfter).to.equal(
      ethers.BigNumber.from(stakedBalanceBefore).add(lpBalanceBefore)
    );

    // Gauge balance should go up
    const gaugeBalanceAfter = await i.solidGauge.balanceOf(
      i.voterProxy.address
    );
    expect(gaugeBalanceAfter).to.equal(
      ethers.BigNumber.from(gaugeBalanceBefore).add(lpBalanceBefore)
    );

    // Make sure lens positions are updated
    const positionsAfter = (await i.oxLens.positionsOf(owner.address))
      .stakingPools;
    expect(positionsAfter.length).to.equal(positionsBefore.length + 1);
  });

  it("Withdraw and unstake LP", async () => {
    // Save balances before
    const lpBalanceBefore = await i.solidPool.balanceOf(owner.address);
    const stakedBalanceBefore = await i.oxPoolMultirewards.balanceOf(
      userProxyAddress
    );
    const gaugeBalanceBefore = await i.solidGauge.balanceOf(
      i.voterProxy.address
    );
    expect(stakedBalanceBefore).gt(0);

    // Withdraw and unstake
    await i.userProxyInterface["unstakeLpAndWithdraw(address,uint256)"](
      i.solidPool.address,
      stakedBalanceBefore
    );

    // LP balance should go up
    const lpBalanceAfter = await i.solidPool.balanceOf(owner.address);
    expect(lpBalanceAfter).to.equal(
      ethers.BigNumber.from(lpBalanceBefore).add(stakedBalanceBefore)
    );

    // Staked balance should go down
    const stakedBalanceAfter = await i.oxPoolMultirewards.balanceOf(
      userProxyAddress
    );
    expect(stakedBalanceAfter).to.equal(0);

    // Gauge balance should go down
    const gaugeBalanceAfter = await i.solidGauge.balanceOf(
      i.voterProxy.address
    );
    expect(gaugeBalanceAfter).to.equal(
      ethers.BigNumber.from(gaugeBalanceBefore).sub(stakedBalanceBefore)
    );
  });

  it("Stake oxPool LP", async () => {
    // Allow userProxyInterface to spend solid pool LP
    let originalLpBalance = await i.solidPool.balanceOf(owner.address);
    expect(originalLpBalance).gt(0);
    await i.solidPool.approve(i.userProxyInterface.address, originalLpBalance);

    // Deposit to get oxPool LP
    await i.userProxyInterface["depositLp(address)"](i.solidPool.address);

    // Save balances
    const stakedBalanceBefore = await i.oxPoolMultirewards.balanceOf(
      userProxyAddress
    );
    const oxPoolBalanceBefore = await i.oxPool.balanceOf(owner.address);
    const gaugeBalanceBefore = await i.solidGauge.balanceOf(
      i.voterProxy.address
    );
    const lpBalanceBefore = await i.solidPool.balanceOf(owner.address);

    // Approve and stake oxPool LP
    await i.oxPool.approve(i.userProxyInterface.address, originalLpBalance);
    await i.userProxyInterface["stakeOxLp(address,uint256)"](
      i.oxPool.address,
      originalLpBalance
    );

    // Staked balance should go up
    const stakedBalanceAfter = await i.oxPoolMultirewards.balanceOf(
      userProxyAddress
    );
    expect(stakedBalanceAfter).to.equal(
      stakedBalanceBefore.add(originalLpBalance)
    );

    // Gauge balance should stay the same
    const gaugeBalanceAfter = await i.solidGauge.balanceOf(
      i.voterProxy.address
    );
    expect(gaugeBalanceAfter).to.equal(gaugeBalanceBefore);

    // LP balance should stay the same
    const lpBalanceAfter = await i.solidPool.balanceOf(owner.address);
    expect(lpBalanceAfter).to.equal(lpBalanceBefore);

    // oxPool balance should go down
    const oxPoolBalanceAfter = await i.oxPool.balanceOf(owner.address);
    expect(oxPoolBalanceAfter).to.equal(
      oxPoolBalanceBefore.sub(originalLpBalance)
    );
  });

  it("Unstake oxPool LP", async () => {
    // Save balances before
    const oxPoolBalanceBefore = await i.oxPool.balanceOf(owner.address);
    const lpBalanceBefore = await i.solidPool.balanceOf(owner.address);
    const stakedBalanceBefore = await i.oxPoolMultirewards.balanceOf(
      userProxyAddress
    );
    const gaugeBalanceBefore = await i.solidGauge.balanceOf(
      i.voterProxy.address
    );
    expect(stakedBalanceBefore).gt(0);

    // Unstake oxPool LP
    await i.userProxyInterface["unstakeOxLp(address,uint256)"](
      i.oxPool.address,
      stakedBalanceBefore
    );

    // LP balance should stay the same
    const lpBalanceAfter = await i.solidPool.balanceOf(owner.address);
    expect(lpBalanceAfter).to.equal(lpBalanceBefore);

    // Staked balance should go down
    const stakedBalanceAfter = await i.oxPoolMultirewards.balanceOf(
      userProxyAddress
    );
    expect(stakedBalanceAfter).to.equal(0);

    // Gauge balance should stay the same
    const gaugeBalanceAfter = await i.solidGauge.balanceOf(
      i.voterProxy.address
    );
    expect(gaugeBalanceAfter).to.equal(gaugeBalanceBefore);

    // oxPool balance should go up
    const oxPoolBalanceAfter = await i.oxPool.balanceOf(owner.address);
    expect(oxPoolBalanceAfter).to.equal(
      oxPoolBalanceBefore.add(stakedBalanceBefore)
    );
  });
});
