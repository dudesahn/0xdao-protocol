const { expect } = require("chai");
const { ethers, batchConnect } = require("hardhat");
// const { batchConnect } = require("../../deployedLogger/addressGetter");
const deployAll = require("../../scripts/deployAll");

let i;
let nonpartnerAmount = "4000000000000000000";
let partnerAmount = "6000000000000000000";
let partnersReceiveCvlOXD;
let treasuryAddress;
describe("OXD Minting interactions (oxSOLID < 5%)", function () {
  beforeEach(async function () {
    [, owner2, owner3] = await ethers.getSigners(3);
  });

  it("Fetch interfaces", async () => {
    i = await deployAll(true);
    treasuryAddress = await i.oxLens.treasuryAddress();
    owner = beep;
    i = await batchConnect(i, beep);
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

  it("Partner oxSOLID -> stake", async () => {
    //get some oxSOLID for testing purposes
    amount = "6000000000000000000";
    await i.solid.approve(i.voterProxy.address, partnerAmount);
    oxSolidBefore = await i.oxSolid.balanceOf(owner.address);
    await i.voterProxy.lockSolid(partnerAmount);
    oxSolidAfter = await i.oxSolid.balanceOf(owner.address);
    expect(oxSolidAfter).to.be.above(oxSolidBefore);
    console.log("owner has this much oxSOLID: ", oxSolidAfter);
    expect(oxSolidAfter).to.be.above(oxSolidBefore);
    oxSolidBefore = oxSolidAfter;

    //stake into partnerRewardsPool
    oxSolidStakedBefore = await i.partnersRewardsPool.balanceOf(owner.address);
    await i.oxSolid.approve(i.userProxyInterface.address, partnerAmount);

    await i.userProxyInterface["stakeOxSolid(uint256)"](partnerAmount);

    userProxyAddress = await i.userProxyFactory.userProxyByAccount(
      owner.address
    );

    oxSolidStakedAfter = await i.partnersRewardsPool.balanceOf(
      i.userProxy.address
    );
    oxSolidAfter = await i.oxSolid.balanceOf(owner.address);

    console.log(
      "owner has this much oxSOLID after staking as partner: ",
      oxSolidAfter
    );
    console.log(
      "owner has this much oxSOLID staked as partner: ",
      oxSolidStakedAfter
    );

    expect(oxSolidStakedAfter).to.be.above(oxSolidStakedBefore);
  });

  it("emitting rewards from rewardsDistributor (oxSOLID < 5%)", async () => {
    amount = await i.solid.balanceOf(owner.address);
    console.log("Solid Balance:", amount);
    amount = "1000000000000000000";
    await i.solid.transfer(i.rewardsDistributor.address, amount);

    partnersRewardBalance = await i.oxd.balanceOf(
      i.partnersRewardsPool.address
    );
    console.log("partnersRewardBalance", BigInt(partnersRewardBalance));
    expect(partnersRewardBalance).to.eq(0);

    treasuryRewardBalanceBefore = await i.solid.balanceOf(treasuryAddress);
    treasuryOxdBalanceBefore = await i.oxd.balanceOf(treasuryAddress);

    await i.rewardsDistributor
      .connect(Deployer)
      .notifyRewardAmount(
        i.oxPoolMultirewards.address,
        i.solid.address,
        amount
      );

    //SOLID and oxSOLID rewards
    partnersRewardBalance = await i.solid.balanceOf(
      i.partnersRewardsPool.address
    );
    partnersOxSolidTotalStaked = await i.partnersRewardsPool.totalSupply();
    console.log("partnersOxSolidTotalStaked:", partnersOxSolidTotalStaked);
    console.log("partnersPoolOxSolidBalance:", partnersRewardBalance);
    oxSolidStakerRewardBalance = await i.solid.balanceOf(
      i.oxSolidRewardsPool.address
    );
    oxSolidTotalStaked = await i.oxSolidRewardsPool.totalSupply();
    console.log("oxSolidTotalStaked:", oxSolidTotalStaked);
    oxdStakerRewardBalance = await i.oxSolid.balanceOf(i.vlOxd.address);
    lpRewardBalance = await i.solid.balanceOf(i.oxPoolMultirewards.address);
    treasuryRewardBalance = (await i.solid.balanceOf(treasuryAddress)).sub(
      treasuryRewardBalanceBefore
    );
    ecosystemRewardBalance = await i.oxSolid.balanceOf(
      oxPoolMultirewards.address
    );
    console.log("SOLID and oxSOLID Rewards:");
    console.log("partnersRewardBalance", BigInt(partnersRewardBalance));
    console.log(
      "oxSolidStakerRewardBalance",
      BigInt(oxSolidStakerRewardBalance)
    );
    console.log("oxdStakerRewardBalance", BigInt(oxdStakerRewardBalance));
    console.log("lpRewardBalance", BigInt(lpRewardBalance));
    console.log("treasuryRewardBalance", BigInt(treasuryRewardBalance));
    console.log("ecosystemRewardBalance", BigInt(ecosystemRewardBalance));

    totalRewardDistributed = partnersRewardBalance
      .add(oxSolidStakerRewardBalance)
      .add(oxdStakerRewardBalance)
      .add(lpRewardBalance)
      .add(treasuryRewardBalance)
      .add(ecosystemRewardBalance);
    expect(totalRewardDistributed).to.eq(amount);

    //OXD and vlOXD rewards
    partnersRewardOxdBalance = await i.oxd.balanceOf(
      i.partnersRewardsPool.address
    );
    partnersReceiveCvlOXD = await i.rewardsDistributor.partnersReceiveCvlOXD();
    if (partnersReceiveCvlOXD) {
      expect(partnersRewardOxdBalance).to.eq(0); //partners shouldn't get OXD, should get cvlOXD
      partnersRewardBalance = await i.cvlOxd.balanceOf(
        i.partnersRewardsPool.address
      );
    } else {
      partnersRewardBalance = await i.oxd.balanceOf(
        i.partnersRewardsPool.address
      );
    }
    oxSolidStakerRewardBalance = await i.oxd.balanceOf(
      i.oxSolidRewardsPool.address
    );
    oxdStakerRewardBalance = await i.oxd.balanceOf(i.vlOxd.address);
    oxdTotalStaked = await i.vlOxd.totalSupply();
    oxdStakerRewardBalance =
      BigInt(oxdStakerRewardBalance) - BigInt(oxdTotalStaked);
    lpRewardBalance = await i.oxd.balanceOf(i.oxPoolMultirewards.address);
    treasuryRewardBalance = (await i.oxd.balanceOf(treasuryAddress)).sub(
      treasuryOxdBalanceBefore
    );

    console.log("OXD and vlOXD Rewards:");
    console.log("partnersRewardBalance", BigInt(partnersRewardBalance));
    console.log(
      "oxSolidStakerRewardBalance",
      BigInt(oxSolidStakerRewardBalance)
    );
    console.log("oxdStakerRewardBalance", BigInt(oxdStakerRewardBalance));
    console.log("lpRewardBalance", BigInt(lpRewardBalance));
    console.log("treasuryRewardBalance", BigInt(treasuryRewardBalance));

    totalRewardDistributed = ethers.BigNumber.from(
      BigInt(partnersRewardBalance) +
        BigInt(oxSolidStakerRewardBalance) +
        BigInt(oxdStakerRewardBalance) +
        BigInt(lpRewardBalance) +
        BigInt(treasuryRewardBalance)
    );
    expect(totalRewardDistributed).to.eq(amount);

    await network.provider.send("evm_increaseTime", [86400 * 1]);
    await network.provider.send("evm_mine");
  });

  it("claim OXD and SOLID emission for staking oxSOLID", async () => {
    oxSolidBalanceBefore = await i.oxSolid.balanceOf(owner.address);
    await i.userProxy["claimStakingRewards(address)"](
      i.oxSolidRewardsPool.address
    );
    oxSolidBalanceAfter = await i.solid.balanceOf(owner.address);

    console.log(
      "claimed oxSOLID rewards: ",
      oxSolidBalanceAfter - oxSolidBalanceBefore
    );
    expect(oxSolidBalanceAfter).to.be.above(oxSolidBalanceBefore);
  });
  if (partnersReceiveCvlOXD) {
    it("claim cvlOXD emission as a partner staking oxSOLID", async () => {
      solidBalanceBefore = await i.solid.balanceOf(owner.address);
      vlOxdBalanceBefore = await i.vlOxd.lockedBalanceOf(i.userProxy.address);
      oxdInLockerBefore = await i.oxd.balanceOf(i.vlOxd.address);
      await i.userProxy["claimStakingRewards(address)"](
        i.partnersRewardsPool.address
      );
      solidBalanceAfter = await i.solid.balanceOf(owner.address);
      vlOxdBalanceAfter = await i.vlOxd.lockedBalanceOf(i.userProxy.address);
      cvlOxdBalanceAfter = await i.cvlOxd.balanceOf(i.userProxy.address);
      oxdInLockerAfter = await i.oxd.balanceOf(i.vlOxd.address);

      console.log(cvlOxdBalanceAfter);
      console.log(
        "claimed SOLID rewards: ",
        solidBalanceAfter - solidBalanceBefore
      );
      console.log(
        "claimed vlOXD rewards: ",
        vlOxdBalanceAfter - vlOxdBalanceBefore
      );

      console.log(
        "OXD Locker balance increased by: ",
        oxdInLockerAfter - oxdInLockerBefore
      );

      expect(oxSolidBalanceAfter).to.be.above(oxSolidBalanceBefore);
      expect(oxdInLockerAfter).to.be.above(oxdInLockerBefore);

      expect(vlOxdBalanceAfter).to.be.above(vlOxdBalanceBefore);
    });
  } else {
    it("claim OXD and SOLID emission as a partner staking oxSOLID", async () => {
      solidBalanceBefore = await i.solid.balanceOf(owner.address);
      await i.userProxy["claimStakingRewards(address)"](
        i.partnersRewardsPool.address
      );
      solidBalanceAfter = await i.solid.balanceOf(owner.address);

      console.log(
        "claimed SOLID rewards: ",
        solidBalanceAfter - solidBalanceBefore
      );
      expect(oxSolidBalanceAfter).to.be.above(oxSolidBalanceBefore);
    });
  }

  it("Unstake oxSOLID -> oxSOLID as non-partner for owner3", async () => {
    oxSolidBefore = await i.oxSolid.balanceOf(owner3.address);
    await i.userProxyInterface.connect(owner3)["unstakeOxSolid()"]();
    oxSolidAfter = await i.oxSolid.balanceOf(owner3.address);

    console.log(
      "Unstaked oxSOLID + reward oxSOLID:",
      oxSolidAfter - oxSolidBefore
    );
    expect(oxSolidAfter).to.be.above(oxSolidBefore);
  });

  it("Unstake oxSOLID -> oxSOLID as a partner", async () => {
    oxSolidBefore = await i.oxSolid.balanceOf(owner.address);
    await i.userProxyInterface["unstakeOxSolid()"]();
    oxSolidAfter = await i.oxSolid.balanceOf(owner.address);

    console.log(
      "Unstaked oxSOLID + reward oxSOLID:",
      oxSolidAfter - oxSolidBefore
    );
    expect(oxSolidAfter).to.be.above(oxSolidBefore);
  });
});
describe("OXD Minting interactions (test 25% partner 2x cap)", function () {
  beforeEach(async function () {
    [, owner2, owner3] = await ethers.getSigners(3);
  });

  it("Fetch interfaces", async () => {
    i = await deployAll(true);
    treasuryAddress = await i.oxLens.treasuryAddress();
    owner = beep;
    i = await batchConnect(i, beep);
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

  it("Partner oxSOLID -> stake", async () => {
    //get some oxSOLID for testing purposes
    totalSolid = await i.solid.totalSupply();
    partnersOxSolid = await i.partnersRewardsPool.totalSupply();
    console.log("partnersOxSolid before mint", partnerAmount);

    partnerAmount = totalSolid.mul(1250).div(10000).sub(partnersOxSolid);
    await i.solid.approve(i.voterProxy.address, partnerAmount);
    console.log("totalSolid", totalSolid);
    console.log("partnerAmount to mint to reach 30%", partnerAmount);
    oxSolidBefore = await i.oxSolid.balanceOf(owner.address);
    await i.voterProxy.lockSolid(partnerAmount);
    oxSolidAfter = await i.oxSolid.balanceOf(owner.address);
    expect(oxSolidAfter).to.be.above(oxSolidBefore);
    console.log("owner has this much oxSOLID: ", oxSolidAfter);
    expect(oxSolidAfter).to.be.above(oxSolidBefore);
    oxSolidBefore = oxSolidAfter;

    //stake into partnerRewardsPool
    oxSolidStakedBefore = await i.partnersRewardsPool.balanceOf(owner.address);
    await i.oxSolid.approve(i.userProxyInterface.address, partnerAmount);

    await i.userProxyInterface["stakeOxSolid(uint256)"](partnerAmount);

    userProxyAddress = await i.userProxyFactory.userProxyByAccount(
      owner.address
    );

    oxSolidStakedAfter = await i.partnersRewardsPool.balanceOf(
      i.userProxy.address
    );
    oxSolidAfter = await i.oxSolid.balanceOf(owner.address);

    console.log(
      "owner has this much oxSOLID after staking as partner: ",
      oxSolidAfter
    );
    console.log(
      "owner has this much oxSOLID staked as partner: ",
      oxSolidStakedAfter
    );

    expect(oxSolidStakedAfter).to.be.above(oxSolidStakedBefore);
  });

  it("emitting rewards from rewardsDistributor (test 25% partner 2x cap)", async () => {
    amount = await i.solid.balanceOf(owner.address);
    console.log("Solid Balance:", amount);
    amount = "1000000000000000000";
    await i.solid.transfer(i.rewardsDistributor.address, amount);

    partnersRewardBalance = await i.oxd.balanceOf(
      i.partnersRewardsPool.address
    );
    console.log("partnersRewardBalance", BigInt(partnersRewardBalance));
    expect(partnersRewardBalance).to.eq(0);

    treasuryRewardBalanceBefore = await i.solid.balanceOf(treasuryAddress);
    treasuryOxdBalanceBefore = await i.oxd.balanceOf(treasuryAddress);

    await i.rewardsDistributor.notifyRewardAmount(
      i.oxPoolMultirewards.address,
      i.solid.address,
      amount
    );

    partnersRewardBalance = await i.solid.balanceOf(
      i.partnersRewardsPool.address
    );
    partnersOxSolidTotalStaked = await i.partnersRewardsPool.totalSupply();
    console.log("partnersOxSolidTotalStaked:", partnersOxSolidTotalStaked);
    console.log("partnersPoolOxSolidBalance:", partnersRewardBalance);
    oxSolidStakerRewardBalance = await i.solid.balanceOf(
      i.oxSolidRewardsPool.address
    );
    oxSolidTotalStaked = await i.oxSolidRewardsPool.totalSupply();
    console.log("oxSolidTotalStaked:", oxSolidTotalStaked);
    oxdStakerRewardBalance = await i.oxSolid.balanceOf(i.vlOxd.address);
    lpRewardBalance = await i.solid.balanceOf(i.oxPoolMultirewards.address);
    treasuryRewardBalance = (await i.solid.balanceOf(treasuryAddress)).sub(
      treasuryRewardBalanceBefore
    );
    ecosystemRewardBalance = await i.oxSolid.balanceOf(
      oxPoolMultirewards.address
    );
    console.log("SOLID and oxSOLID Rewards:");
    console.log("partnersRewardBalance", BigInt(partnersRewardBalance));
    console.log(
      "oxSolidStakerRewardBalance",
      BigInt(oxSolidStakerRewardBalance)
    );
    console.log("oxdStakerRewardBalance", BigInt(oxdStakerRewardBalance));
    console.log("lpRewardBalance", BigInt(lpRewardBalance));
    console.log("treasuryRewardBalance", BigInt(treasuryRewardBalance));
    console.log("ecosystemRewardBalance", BigInt(ecosystemRewardBalance));

    totalRewardDistributed = partnersRewardBalance
      .add(oxSolidStakerRewardBalance)
      .add(oxdStakerRewardBalance)
      .add(lpRewardBalance)
      .add(treasuryRewardBalance)
      .add(ecosystemRewardBalance);
    expect(totalRewardDistributed).to.eq(amount);

    //OXD and vlOXD rewards
    partnersRewardOxdBalance = await i.oxd.balanceOf(
      i.partnersRewardsPool.address
    );
    partnersReceiveCvlOXD = await i.rewardsDistributor.partnersReceiveCvlOXD();
    if (partnersReceiveCvlOXD) {
      expect(partnersRewardOxdBalance).to.eq(0); //partners shouldn't get OXD, should get cvlOXD
      partnersRewardBalance = await i.cvlOxd.balanceOf(
        i.partnersRewardsPool.address
      );
    } else {
      partnersRewardBalance = await i.oxd.balanceOf(
        i.partnersRewardsPool.address
      );
    }
    oxSolidStakerRewardBalance = await i.oxd.balanceOf(
      i.oxSolidRewardsPool.address
    );
    oxdStakerRewardBalance = await i.oxd.balanceOf(i.vlOxd.address);
    oxdTotalStaked = await i.vlOxd.totalSupply();
    oxdStakerRewardBalance =
      BigInt(oxdStakerRewardBalance) - BigInt(oxdTotalStaked);
    lpRewardBalance = await i.oxd.balanceOf(i.oxPoolMultirewards.address);
    treasuryRewardBalance = (await i.oxd.balanceOf(treasuryAddress)).sub(
      treasuryOxdBalanceBefore
    );

    console.log("OXD and vlOXD Rewards:");
    console.log("partnersRewardBalance", BigInt(partnersRewardBalance));
    console.log(
      "oxSolidStakerRewardBalance",
      BigInt(oxSolidStakerRewardBalance)
    );
    console.log("oxdStakerRewardBalance", BigInt(oxdStakerRewardBalance));
    console.log("lpRewardBalance", BigInt(lpRewardBalance));
    console.log("treasuryRewardBalance", BigInt(treasuryRewardBalance));

    totalRewardDistributed = ethers.BigNumber.from(
      BigInt(partnersRewardBalance) +
        BigInt(oxSolidStakerRewardBalance) +
        BigInt(oxdStakerRewardBalance) +
        BigInt(lpRewardBalance) +
        BigInt(treasuryRewardBalance)
    );

    expect(partnersRewardBalance.mul(10000).div(amount)).to.eq(2500);
    expect(totalRewardDistributed).to.eq(amount);

    await network.provider.send("evm_increaseTime", [86400 * 1]);
    await network.provider.send("evm_mine");
  });

  it("claim OXD and SOLID emission for staking oxSOLID", async () => {
    oxSolidBalanceBefore = await i.oxSolid.balanceOf(owner.address);
    await i.userProxy["claimStakingRewards(address)"](
      i.oxSolidRewardsPool.address
    );
    oxSolidBalanceAfter = await i.solid.balanceOf(owner.address);

    console.log(
      "claimed oxSOLID rewards: ",
      oxSolidBalanceAfter - oxSolidBalanceBefore
    );
    expect(oxSolidBalanceAfter).to.be.above(oxSolidBalanceBefore);
  });

  if (partnersReceiveCvlOXD) {
    it("claim cvlOXD emission as a partner staking oxSOLID", async () => {
      solidBalanceBefore = await i.solid.balanceOf(owner.address);
      vlOxdBalanceBefore = await i.vlOxd.lockedBalanceOf(i.userProxy.address);
      oxdInLockerBefore = await i.oxd.balanceOf(i.vlOxd.address);
      await i.userProxy["claimStakingRewards(address)"](
        i.partnersRewardsPool.address
      );
      solidBalanceAfter = await i.solid.balanceOf(owner.address);
      vlOxdBalanceAfter = await i.vlOxd.lockedBalanceOf(i.userProxy.address);
      cvlOxdBalanceAfter = await i.cvlOxd.balanceOf(i.userProxy.address);
      oxdInLockerAfter = await i.oxd.balanceOf(i.vlOxd.address);

      console.log(cvlOxdBalanceAfter);
      console.log(
        "claimed SOLID rewards: ",
        solidBalanceAfter - solidBalanceBefore
      );
      console.log(
        "claimed vlOXD rewards: ",
        vlOxdBalanceAfter - vlOxdBalanceBefore
      );

      console.log(
        "OXD Locker balance increased by: ",
        oxdInLockerAfter - oxdInLockerBefore
      );

      expect(oxSolidBalanceAfter).to.be.above(oxSolidBalanceBefore);
      expect(oxdInLockerAfter).to.be.above(oxdInLockerBefore);

      expect(vlOxdBalanceAfter).to.be.above(vlOxdBalanceBefore);
    });
  } else {
    it("claim OXD and SOLID emission as a partner staking oxSOLID", async () => {
      solidBalanceBefore = await i.solid.balanceOf(owner.address);
      await i.userProxy["claimStakingRewards(address)"](
        i.partnersRewardsPool.address
      );
      solidBalanceAfter = await i.solid.balanceOf(owner.address);

      console.log(
        "claimed SOLID rewards: ",
        solidBalanceAfter - solidBalanceBefore
      );
      expect(oxSolidBalanceAfter).to.be.above(oxSolidBalanceBefore);
    });
  }

  it("Unstake oxSOLID -> oxSOLID as non-partner for owner3", async () => {
    oxSolidBefore = await i.oxSolid.balanceOf(owner3.address);
    await i.userProxyInterface.connect(owner3)["unstakeOxSolid()"]();
    oxSolidAfter = await i.oxSolid.balanceOf(owner3.address);

    console.log(
      "Unstaked oxSOLID + reward oxSOLID:",
      oxSolidAfter - oxSolidBefore
    );
    expect(oxSolidAfter).to.be.above(oxSolidBefore);
  });

  it("Unstake oxSOLID -> oxSOLID as a partner", async () => {
    oxSolidBefore = await i.oxSolid.balanceOf(owner.address);
    await i.userProxyInterface["unstakeOxSolid()"]();
    oxSolidAfter = await i.oxSolid.balanceOf(owner.address);

    console.log(
      "Unstaked oxSOLID + reward oxSOLID:",
      oxSolidAfter - oxSolidBefore
    );
    expect(oxSolidAfter).to.be.above(oxSolidBefore);
  });
});
describe("OXD Minting interactions (test partner after 25% )", function () {
  beforeEach(async function () {
    [, owner2, owner3] = await ethers.getSigners(3);
  });

  it("Fetch interfaces", async () => {
    i = await deployAll(true);
    treasuryAddress = await i.oxLens.treasuryAddress();
    owner = beep;
    i = await batchConnect(i, beep);
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

  it("Partner oxSOLID -> stake", async () => {
    //get some oxSOLID for testing purposes
    totalSolid = await i.solid.totalSupply();
    partnersOxSolid = await i.partnersRewardsPool.totalSupply();
    console.log("partnersOxSolid before mint", partnerAmount);

    partnerAmount = totalSolid.mul(3000).div(10000).sub(partnersOxSolid);
    await i.solid.approve(i.voterProxy.address, partnerAmount);
    console.log("totalSolid", totalSolid);
    console.log("partnerAmount to mint to reach 12.5%", partnerAmount);
    oxSolidBefore = await i.oxSolid.balanceOf(owner.address);
    await i.voterProxy.lockSolid(partnerAmount);
    oxSolidAfter = await i.oxSolid.balanceOf(owner.address);
    expect(oxSolidAfter).to.be.above(oxSolidBefore);
    console.log("owner has this much oxSOLID: ", oxSolidAfter);
    expect(oxSolidAfter).to.be.above(oxSolidBefore);
    oxSolidBefore = oxSolidAfter;

    //stake into partnerRewardsPool
    oxSolidStakedBefore = await i.partnersRewardsPool.balanceOf(owner.address);
    await i.oxSolid.approve(i.userProxyInterface.address, partnerAmount);

    await i.userProxyInterface["stakeOxSolid(uint256)"](partnerAmount);

    userProxyAddress = await i.userProxyFactory.userProxyByAccount(
      owner.address
    );

    oxSolidStakedAfter = await i.partnersRewardsPool.balanceOf(
      i.userProxy.address
    );
    oxSolidAfter = await i.oxSolid.balanceOf(owner.address);

    console.log(
      "owner has this much oxSOLID after staking as partner: ",
      oxSolidAfter
    );
    console.log(
      "owner has this much oxSOLID staked as partner: ",
      oxSolidStakedAfter
    );

    expect(oxSolidStakedAfter).to.be.above(oxSolidStakedBefore);
  });

  it("emitting rewards from rewardsDistributor (test 25% partner 2x cap)", async () => {
    amount = await i.solid.balanceOf(owner.address);
    console.log("Solid Balance:", amount);
    amount = "1000000000000000000";
    await i.solid.transfer(i.rewardsDistributor.address, amount);

    partnersRewardBalance = await i.oxd.balanceOf(
      i.partnersRewardsPool.address
    );
    console.log("partnersRewardBalance", BigInt(partnersRewardBalance));
    expect(partnersRewardBalance).to.eq(0);

    treasuryRewardBalanceBefore = await i.solid.balanceOf(treasuryAddress);
    treasuryOxdBalanceBefore = await i.oxd.balanceOf(treasuryAddress);

    await i.rewardsDistributor.notifyRewardAmount(
      i.oxPoolMultirewards.address,
      i.solid.address,
      amount
    );

    partnersRewardBalance = await i.solid.balanceOf(
      i.partnersRewardsPool.address
    );
    partnersOxSolidTotalStaked = await i.partnersRewardsPool.totalSupply();
    console.log("partnersOxSolidTotalStaked:", partnersOxSolidTotalStaked);
    console.log("partnersPoolOxSolidBalance:", partnersRewardBalance);
    oxSolidStakerRewardBalance = await i.solid.balanceOf(
      i.oxSolidRewardsPool.address
    );
    oxSolidTotalStaked = await i.oxSolidRewardsPool.totalSupply();
    console.log("oxSolidTotalStaked:", oxSolidTotalStaked);
    oxdStakerRewardBalance = await i.oxSolid.balanceOf(i.vlOxd.address);
    lpRewardBalance = await i.solid.balanceOf(i.oxPoolMultirewards.address);
    treasuryRewardBalance = (await i.solid.balanceOf(treasuryAddress)).sub(
      treasuryRewardBalanceBefore
    );
    ecosystemRewardBalance = await i.oxSolid.balanceOf(
      oxPoolMultirewards.address
    );
    console.log("SOLID and oxSOLID Rewards:");
    console.log("partnersRewardBalance", BigInt(partnersRewardBalance));
    console.log(
      "oxSolidStakerRewardBalance",
      BigInt(oxSolidStakerRewardBalance)
    );
    console.log("oxdStakerRewardBalance", BigInt(oxdStakerRewardBalance));
    console.log("lpRewardBalance", BigInt(lpRewardBalance));
    console.log("treasuryRewardBalance", BigInt(treasuryRewardBalance));
    console.log("ecosystemRewardBalance", BigInt(ecosystemRewardBalance));

    totalRewardDistributed = partnersRewardBalance
      .add(oxSolidStakerRewardBalance)
      .add(oxdStakerRewardBalance)
      .add(lpRewardBalance)
      .add(treasuryRewardBalance)
      .add(ecosystemRewardBalance);
    expect(totalRewardDistributed).to.eq(amount);

    //OXD and vlOXD rewards
    partnersRewardOxdBalance = await i.oxd.balanceOf(
      i.partnersRewardsPool.address
    );
    partnersReceiveCvlOXD = await i.rewardsDistributor.partnersReceiveCvlOXD();
    if (partnersReceiveCvlOXD) {
      expect(partnersRewardOxdBalance).to.eq(0); //partners shouldn't get OXD, should get cvlOXD
      partnersRewardBalance = await i.cvlOxd.balanceOf(
        i.partnersRewardsPool.address
      );
    } else {
      partnersRewardBalance = await i.oxd.balanceOf(
        i.partnersRewardsPool.address
      );
    }
    oxSolidStakerRewardBalance = await i.oxd.balanceOf(
      i.oxSolidRewardsPool.address
    );
    oxdStakerRewardBalance = await i.oxd.balanceOf(i.vlOxd.address);
    oxdTotalStaked = await i.vlOxd.totalSupply();
    oxdStakerRewardBalance =
      BigInt(oxdStakerRewardBalance) - BigInt(oxdTotalStaked);
    lpRewardBalance = await i.oxd.balanceOf(i.oxPoolMultirewards.address);
    treasuryRewardBalance = (await i.oxd.balanceOf(treasuryAddress)).sub(
      treasuryOxdBalanceBefore
    );

    console.log("OXD and vlOXD Rewards:");
    console.log("partnersRewardBalance", BigInt(partnersRewardBalance));
    console.log(
      "oxSolidStakerRewardBalance",
      BigInt(oxSolidStakerRewardBalance)
    );
    console.log("oxdStakerRewardBalance", BigInt(oxdStakerRewardBalance));
    console.log("lpRewardBalance", BigInt(lpRewardBalance));
    console.log("treasuryRewardBalance", BigInt(treasuryRewardBalance));

    totalRewardDistributed = ethers.BigNumber.from(
      BigInt(partnersRewardBalance) +
        BigInt(oxSolidStakerRewardBalance) +
        BigInt(oxdStakerRewardBalance) +
        BigInt(lpRewardBalance) +
        BigInt(treasuryRewardBalance)
    );

    //
    expect(partnersRewardBalance.mul(10000).div(amount)).to.eq(
      ((3000 - 1250) * 7500) / 8750 + 2500
    ); //-1 for rounding down
    expect(totalRewardDistributed).to.eq(amount);

    await network.provider.send("evm_increaseTime", [86400 * 1]);
    await network.provider.send("evm_mine");
  });

  it("claim OXD and SOLID emission for staking oxSOLID", async () => {
    oxSolidBalanceBefore = await i.oxSolid.balanceOf(owner.address);
    await i.userProxy["claimStakingRewards(address)"](
      i.oxSolidRewardsPool.address
    );
    oxSolidBalanceAfter = await i.solid.balanceOf(owner.address);

    console.log(
      "claimed oxSOLID rewards: ",
      oxSolidBalanceAfter - oxSolidBalanceBefore
    );
    expect(oxSolidBalanceAfter).to.be.above(oxSolidBalanceBefore);
  });

  if (partnersReceiveCvlOXD) {
    it("claim cvlOXD emission as a partner staking oxSOLID", async () => {
      solidBalanceBefore = await i.solid.balanceOf(owner.address);
      vlOxdBalanceBefore = await i.vlOxd.lockedBalanceOf(i.userProxy.address);
      oxdInLockerBefore = await i.oxd.balanceOf(i.vlOxd.address);
      await i.userProxy["claimStakingRewards(address)"](
        i.partnersRewardsPool.address
      );
      solidBalanceAfter = await i.solid.balanceOf(owner.address);
      vlOxdBalanceAfter = await i.vlOxd.lockedBalanceOf(i.userProxy.address);
      cvlOxdBalanceAfter = await i.cvlOxd.balanceOf(i.userProxy.address);
      oxdInLockerAfter = await i.oxd.balanceOf(i.vlOxd.address);

      console.log(cvlOxdBalanceAfter);
      console.log(
        "claimed SOLID rewards: ",
        solidBalanceAfter - solidBalanceBefore
      );
      console.log(
        "claimed vlOXD rewards: ",
        vlOxdBalanceAfter - vlOxdBalanceBefore
      );

      console.log(
        "OXD Locker balance increased by: ",
        oxdInLockerAfter - oxdInLockerBefore
      );

      expect(oxSolidBalanceAfter).to.be.above(oxSolidBalanceBefore);
      expect(oxdInLockerAfter).to.be.above(oxdInLockerBefore);

      expect(vlOxdBalanceAfter).to.be.above(vlOxdBalanceBefore);
    });
  } else {
    it("claim OXD and SOLID emission as a partner staking oxSOLID", async () => {
      solidBalanceBefore = await i.solid.balanceOf(owner.address);
      await i.userProxy["claimStakingRewards(address)"](
        i.partnersRewardsPool.address
      );
      solidBalanceAfter = await i.solid.balanceOf(owner.address);

      console.log(
        "claimed SOLID rewards: ",
        solidBalanceAfter - solidBalanceBefore
      );
      expect(oxSolidBalanceAfter).to.be.above(oxSolidBalanceBefore);
    });
  }

  it("Unstake oxSOLID -> oxSOLID as non-partner for owner3", async () => {
    oxSolidBefore = await i.oxSolid.balanceOf(owner3.address);
    await i.userProxyInterface.connect(owner3)["unstakeOxSolid()"]();
    oxSolidAfter = await i.oxSolid.balanceOf(owner3.address);

    console.log(
      "Unstaked oxSOLID + reward oxSOLID:",
      oxSolidAfter - oxSolidBefore
    );
    expect(oxSolidAfter).to.be.above(oxSolidBefore);
  });

  it("Unstake oxSOLID -> oxSOLID as a partner", async () => {
    oxSolidBefore = await i.oxSolid.balanceOf(owner.address);
    await i.userProxyInterface["unstakeOxSolid()"]();
    oxSolidAfter = await i.oxSolid.balanceOf(owner.address);

    console.log(
      "Unstaked oxSOLID + reward oxSOLID:",
      oxSolidAfter - oxSolidBefore
    );
    expect(oxSolidAfter).to.be.above(oxSolidBefore);
  });
});
