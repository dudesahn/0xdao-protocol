const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const {
  batchConnect,
  setBalance,
} = require("../../deployedLogger/addressGetter");
const deployAll = require("../../scripts/deployAll");
let i;
let userProxyInterface;
let userProxyAddress;
const ETHERS = ethers.BigNumber.from("1000000000000000000");
const UST = ethers.BigNumber.from("1000000");

// this test can't handle both testLagging and testBadToken at the same time.
// If testLagging = true, the other has to be false
const testLagging = true;
const testBadToken = false;
const testWhitelisting = true;
const beepAddress = "0xda00c4fec58dc0acce8fbdcd52428a7f66dcc433";

describe("Bribe claiming Solidly -> 0xDAO", function () {
  beforeEach(async function () {
    [owner, owner2, owner3] = await ethers.getSigners(3);
    owner = await ethers.getSigner(beepAddress);
  });

  it("Fetch interfaces", async () => {
    i = await deployAll(true);
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [beepAddress],
    });
    await hre.network.provider.request({
      method: "hardhat_setBalance",
      params: [beepAddress, "0x100000000000000000000"],
    });
    beep = await ethers.getSigner(beepAddress);
    await batchConnect(i, beep);
    owner = await ethers.getSigner(beepAddress);
    i.userProxy = await ethers.getContractAt(
      "UserProxyTemplate",
      await i.oxLens.userProxyByAccount(beepAddress)
    );
    i = await batchConnect(i, beep);
  });

  it("Check owner.address partner status", async () => {
    console.log(owner.address);
    console.log(await i.oxLens.isProxyPartner(owner.address));
    console.log(await i.userProxy.ownerAddress());
    isPartner = await i.oxLens.isProxyPartner(owner.address);
    if (isPartner) {
      await i.partnersRewardsPool
        .connect(Deployer)
        .setPartner(i.userProxy.address, false);
    }
  });

  it("Get some oxSOLID and stake it", async () => {
    amount = "1000000000000000000";
    await i.solid.approve(i.userProxyInterface.address, amount);
    await i.userProxyInterface["convertSolidToOxSolidAndStake(uint256)"](
      amount
    );
    expect(await i.oxSolid.balanceOf(i.oxSolidRewardsPool.address)).gt(0);
  });
  it("Get liquidity into LP pools", async () => {
    mintAmount = ethers.BigNumber.from("10000");
    //just minting straight into the pool, don't need to determine mins and stuff
    await setBalance(
      i.usdt.address,
      i.pool.address,
      mintAmount.mul(ETHERS),
      2,
      3
    );
    await setBalance(i.ust.address, i.pool.address, mintAmount.mul(UST), 2, 3);
    // await i.usdt.mint(i.pool.address, mintAmount.mul(ETHERS));
    // await i.ust.mint(i.pool.address, mintAmount.mul(UST));
    await i.pool.sync();
  });

  it("washtrade to generate fees", async () => {
    amount = ethers.BigNumber.from("10000000");
    amountUsdt = amount.mul(ETHERS);
    amountUst = amount.mul(UST);
    mintAmountUsdt = amountUsdt.mul(10);
    mintAmountUst = amountUst.mul(10);
    // await i.usdt.mint(owner.address, mintAmountUsdt);
    // await i.ust.mint(owner.address, mintAmountUst);
    await setBalance(i.usdt.address, owner.address, mintAmountUsdt, 2, 3);
    await setBalance(i.ust.address, owner.address, mintAmountUst, 2, 3);

    usdtBalance = await i.usdt.balanceOf(owner.address);
    ustBalance = await i.ust.balanceOf(owner.address);
    await i.usdt.approve(i.router.address, usdtBalance);
    await i.ust.approve(i.router.address, ustBalance);
    for (let j = 0; j < 10; j++) {
      // console.log("usdtBalance:", usdtBalance);
      // console.log("ustBalance:", ustBalance);
      route = { from: i.usdt.address, to: i.ust.address, stable: true };
      route2 = { from: i.ust.address, to: i.usdt.address, stable: true };
      // console.log(route);
      // console.log("pool.address:", i.pool.address);
      // console.log("router.address:", i.router.address);
      // console.log(
      //   "factory reporting pool @",
      //   await i.solidPoolsFactory.getPair(i.usdt.address, i.ust.address, true)
      // );
      // console.log(
      //   "router reporting pool @",
      //   await i.router.pairFor(i.usdt.address, i.ust.address, true)
      // );
      // console.log(i.pool.address);
      // expected_output_pair = await i.pool.getAmountOut(amount, i.usdt.address);
      // expected_output = await i.router.getAmountsOut(amount, [route]);

      // console.log(expected_output_pair);
      // console.log(expected_output);
      await i.router.swapExactTokensForTokens(
        amountUsdt,
        0,
        [route],
        owner.address,
        Date.now()
      );
      await i.router.swapExactTokensForTokens(
        amountUst,
        0,
        [route2],
        owner.address,
        Date.now()
      );
    }
    feeAddress = await i.pool.fees();
    feeAddressBalances = [
      await i.usdt.balanceOf(feeAddress),
      await i.ust.balanceOf(feeAddress),
    ];
    console.log("feeAddressBalances (usdt, ust):", feeAddressBalances);
  });
  it("Add non-whitelisted token to bribe", async () => {
    Token = await ethers.getContractFactory("Token");
    i.spooky = await Token.deploy("SPOOKY", "BOO", 18, owner.address);
    await i.spooky.deployed;
    i.spooky = await i.spooky.connect(beep);

    await i.spooky.mint(owner.address, ETHERS);
    await i.spooky.approve(i.bribe.address, ETHERS);
    await i.bribe.notifyRewardAmount(i.spooky.address, ETHERS);
  });
  if (testBadToken) {
    it("Add bad token to bribes that might break contracts", async () => {
      //deploy bad token that doesn't transfer the full amount to its destination
      //such as tax-on-transfer tokens
      BadToken = await ethers.ContractFactory;
      BadToken = await ethers.getContractFactory("BadToken");
      i.badToken = await BadToken.deploy();
      await i.badToken.deployed();
      console.log("badToken:", i.badToken.address);

      //mint and add bad token to bribes on solidly
      await i.badToken.mint(owner.address, ETHERS.mul(3));
      await i.badToken.transfer(owner2.address, ETHERS);
      await i.badToken.approve(i.bribe.address, ETHERS);

      //bad tokens shouldn't be able to be added to bribes by accident
      await expect(i.bribe.notifyRewardAmount(i.badToken.address, ETHERS)).to.be
        .reverted;

      //manually transfer more tokens into bribe before calling notifyRewardAmount as an attacker
      await i.badToken.transfer(i.bribe.address, ETHERS);
      await i.bribe.notifyRewardAmount(i.badToken.address, ETHERS);
      expect(await i.bribe.rewardRate(i.badToken.address)).gt(0);
    });
  }
  it("fetch fees as bribes into oxPool staking (best-case scenario)", async () => {
    // record baseline balances for comparison after claiming
    oxSolidRewardsPoolAddress = i.oxSolidRewardsPool.address;
    oxSolidStakingUsdtBefore = await i.usdt.balanceOf(
      oxSolidRewardsPoolAddress
    );
    oxSolidStakingUstBefore = await i.ust.balanceOf(oxSolidRewardsPoolAddress);

    // the two fee tokens should be whitelisted
    usdtWhitelisted = await i.tokensAllowlist.tokenIsAllowed(i.usdt.address);
    ustWhitelisted = await i.tokensAllowlist.tokenIsAllowed(i.ust.address);
    expect(usdtWhitelisted).eq(true);
    expect(ustWhitelisted).eq(true);

    // spooky shouldn't be on the whitelist yet
    spookyWhitelisted = await i.tokensAllowlist.tokenIsAllowed(
      i.spooky.address
    );
    expect(spookyWhitelisted).eq(false);

    // increase time to reduce left
    await network.provider.send("evm_increaseTime", [86400 * 8]);
    await network.provider.send("evm_mine");

    // get Solidly pool data
    solidPoolInfo = await i.oxPool["solidPoolInfo()"]();
    poolInfo = await i.solidlyLens.poolInfo(i.solidPool.address);
    console.log("usdt left", await i.bribe.left(i.usdt.address));
    console.log("ust left", await i.bribe.left(i.ust.address));

    //need to call this once first to get fees from the fee address into the bribe address, though once the system gets started, voterProxy.getFeeTokensFromBribe does this automatically
    await i.pool.transfer(i.gauge.address, 1);
    console.log("usdt claimable", await i.pool.claimable1(i.gauge.address));
    console.log("ust claimable", await i.pool.claimable0(i.gauge.address));

    await i.gauge.claimFees();

    //wait some time for bribe rewards to accrue for our voterProxy
    for (let j; j < 10; j++) {
      await network.provider.send("evm_increaseTime", [86400]);
      await network.provider.send("evm_mine");
    }
    oxSolidStakingUsdtAfter = 0;
    oxSolidStakingUstAfter = 0;
    while (
      oxSolidStakingUsdtAfter <= oxSolidStakingUsdtBefore ||
      oxSolidStakingUstAfter <= oxSolidStakingUstBefore
    ) {
      await i.voterProxy.batchCheckPointOrGetReward(
        i.bribe.address,
        i.usdt.address,
        300
      );
      await i.voterProxy.batchCheckPointOrGetReward(
        i.bribe.address,
        i.ust.address,
        300
      );
      //claim trading fees as bribes with our voterProxy
      tx = await i.voterProxy.getFeeTokensFromBribe(i.oxPool.address);
      receipt = await tx.wait();
      console.log(receipt.gasUsed);
      oxSolidStakingUsdtAfter = await i.usdt.balanceOf(
        oxSolidRewardsPoolAddress
      );
      oxSolidStakingUstAfter = await i.ust.balanceOf(oxSolidRewardsPoolAddress);
      await network.provider.send("evm_increaseTime", [86400]);
      await network.provider.send("evm_mine");
    }

    // oxSOLID staking pool UST and USDT balances should change since they are whitelisted in Solidly
    oxSolidStakingUsdtAfter = await i.usdt.balanceOf(oxSolidRewardsPoolAddress);
    oxSolidStakingUstAfter = await i.ust.balanceOf(oxSolidRewardsPoolAddress);
    expect(oxSolidStakingUsdtAfter).gt(oxSolidStakingUsdtBefore);
    expect(oxSolidStakingUstAfter).gt(oxSolidStakingUstBefore);

    // manually claim spooky as bribe
    await i.voterProxy.getRewardFromBribe(i.oxPool.address, [i.spooky.address]);

    // spooky should remain in rewardsDistributor because it wasn't whitelisted
    expect(await i.spooky.balanceOf(i.rewardsDistributor.address)).gt(0);

    // distribute non-whitelisted spooky in rewardsDistributor as by stander (owner3)
    // should revert since spooky isn't whitelisted
    await expect(
      i.rewardsDistributor.notifyStoredRewardAmount(i.spooky.address)
    ).to.be.reverted;

    // whitelist spooky as a bribe token
    await i.tokensAllowlist
      .connect(Deployer)
      .setTokenAllowed(i.spooky.address, true);

    // distribute stored spooky in rewardsDistributor as by stander (owner3)
    // anyone should be able to trigger distributing stored tokens if it's whitelisted
    await i.rewardsDistributor.notifyStoredRewardAmount(i.spooky.address);

    // spooky amount in oxSolidRewardsPoolAddress should increase
    oxSolidStakingSpookyAfter = await i.spooky.balanceOf(
      oxSolidRewardsPoolAddress
    );
    expect(oxSolidStakingSpookyAfter).gt(0);
  });
  if (testBadToken) {
    it("Check if auto claims claim bad tokens", async () => {
      await network.provider.send("evm_increaseTime", [86400 * 7]);
      await network.provider.send("evm_mine");

      // bad tokens shouldn't reach our multirewards without whitelisting
      await i.oxPool.notifyBribeTokens();
      badBalance = await i.badToken.balanceOf(i.oxPoolMultirewards.address);
      expect(badBalance).eq(0);

      // worst-case scenario, someone whitelists the bad tokens
      await i.tokensAllowlist.setTokenAllowed(i.badToken.address, true);
      await network.provider.send("evm_increaseTime", [86400 * 7]);
      await network.provider.send("evm_mine");

      //sync the bad token to oxPool list
      await i.tokensAllowlist.setBribeTokensNotifyPageSize(5);
      await i.oxPool["syncBribeTokens(uint256,uint256)"](0, 10);
      console.log(await i.oxPool.bribeTokensAddresses());

      //try getting the bad token into our oxSolid rewards
      //if tx reverts, it means we do have a potential problem if a tax-on-transfer token is whitelisted
      await expect(i.oxPool.notifyBribeTokens()).to.be.reverted;
    });
  }
  if (testLagging) {
    describe("Scenario where there's votes between bribe claiming", function () {
      let tokenId;
      let voteAmount = 20;

      it("create locks for a normal user", async function () {
        console.log(
          "owner has this much SOLID",
          await i.solid.balanceOf(owner.address)
        );
        amount = "1000000000000000000";
        await i.solid.approve(i.ve.address, amount);
        const lockDuration = 7 * 24 * 3600; // 1 week

        // Balance should be zero before and 1 after creating the lock
        nftsBefore = await i.ve.balanceOf(owner.address);
        await i.ve.create_lock(amount, lockDuration);
        tokenId = await i.ve.tokenOfOwnerByIndex(owner.address, nftsBefore);

        console.log("nftIndex:", tokenId);
        expect(await i.ve.ownerOf(tokenId)).to.equal(owner.address);
        expect(await i.ve.balanceOf(owner.address)).to.equal(nftsBefore.add(1));
      });
      it("washtrade to generate fees", async () => {
        amount = ethers.BigNumber.from("10000000");
        amountUsdt = amount.mul(ETHERS);
        amountUst = amount.mul(UST);
        mintAmountUsdt = amountUsdt.mul(10);
        mintAmountUst = amountUst.mul(10);
        // await i.usdt.mint(owner.address, mintAmountUsdt);
        // await i.ust.mint(owner.address, mintAmountUst);
        await setBalance(i.usdt.address, owner.address, mintAmountUsdt, 2, 3);
        await setBalance(i.ust.address, owner.address, mintAmountUst, 2, 3);

        usdtBalance = await i.usdt.balanceOf(owner.address);
        ustBalance = await i.ust.balanceOf(owner.address);
        await i.usdt.approve(i.router.address, usdtBalance);
        await i.ust.approve(i.router.address, ustBalance);
        for (let j = 0; j < 10; j++) {
          // console.log("usdtBalance:", usdtBalance);
          // console.log("ustBalance:", ustBalance);
          route = { from: i.usdt.address, to: i.ust.address, stable: true };
          route2 = { from: i.ust.address, to: i.usdt.address, stable: true };
          // console.log(route);
          // console.log("pool.address:", i.pool.address);
          // console.log("router.address:", i.router.address);
          // console.log(
          //   "factory reporting pool @",
          //   await i.solidPoolsFactory.getPair(i.usdt.address, i.ust.address, true)
          // );
          // console.log(
          //   "router reporting pool @",
          //   await i.router.pairFor(i.usdt.address, i.ust.address, true)
          // );
          // console.log(i.pool.address);
          // expected_output_pair = await i.pool.getAmountOut(amount, i.usdt.address);
          // expected_output = await i.router.getAmountsOut(amount, [route]);

          // console.log(expected_output_pair);
          // console.log(expected_output);
          await i.router.swapExactTokensForTokens(
            amountUsdt,
            0,
            [route],
            owner.address,
            Date.now()
          );
          await i.router.swapExactTokensForTokens(
            amountUst,
            0,
            [route2],
            owner.address,
            Date.now()
          );
        }
        feeAddress = await i.pool.fees();
        feeAddressBalances = [
          await i.usdt.balanceOf(feeAddress),
          await i.ust.balanceOf(feeAddress),
        ];
        console.log("feeAddressBalances (usdt, ust):", feeAddressBalances);
      });
      it("normal users vote a bunch of times", async () => {
        for (let j = 0; j < voteAmount; j++) {
          i.voter.vote(tokenId, [i.pool.address], [1]);
          await network.provider.send("evm_increaseTime", [1]);
          await network.provider.send("evm_mine");
          currentCheckpoint = await i.bribe.rewardPerTokenNumCheckpoints(
            i.ust.address
          );
          console.log("ust checkpoint:", currentCheckpoint);
        }
      });
      it("fetch fees as bribes into oxPool staking (after a bunch of votes)", async () => {
        // record baseline balances for comparison after claiming
        oxSolidRewardsPoolAddress = i.oxSolidRewardsPool.address;
        oxSolidStakingUsdtBefore = await i.usdt.balanceOf(
          oxSolidRewardsPoolAddress
        );
        oxSolidStakingUstBefore = await i.ust.balanceOf(
          oxSolidRewardsPoolAddress
        );
        // increase time to reduce left
        await network.provider.send("evm_increaseTime", [86400 * 8]);
        await network.provider.send("evm_mine");

        // get Solidly pool data
        solidPoolInfo = await i.oxPool["solidPoolInfo()"]();
        poolInfo = await i.solidlyLens.poolInfo(i.solidPool.address);
        console.log("usdt left", await i.bribe.left(i.usdt.address));
        console.log("ust left", await i.bribe.left(i.ust.address));

        //need to call this once first to get fees from the fee address into the bribe address, though once the system gets started, voterProxy.getFeeTokensFromBribe does this automatically
        await i.pool.transfer(i.gauge.address, 1);
        console.log("usdt claimable", await i.pool.claimable1(i.gauge.address));
        console.log("ust claimable", await i.pool.claimable0(i.gauge.address));

        // oxPoolAddress = i.oxPoolFactoryAddress.oxPoolBySolidPool(
        //   i.solidPool.address
        // );
        //await i.oxPool.setBribeAddresses([i.usdt.address]);
        solidPoolInfo = await i.oxPool["solidPoolInfo()"]();
        poolInfo = await i.solidlyLens.poolInfo(i.solidPool.address);
        // console.log("oxPool reporting bribes:", solidPoolInfo.bribeTokensAddresses);
        // console.log("solidPool reporting bribes:", poolInfo.bribeTokensAddresses);
        // await i.voterProxy.getFeeTokensFromBribe(i.oxPool.address);
        currentCheckpoint = await i.bribe.rewardPerTokenNumCheckpoints(
          i.ust.address
        );
        console.log("ust checkpoint:", currentCheckpoint);

        //wait some time for bribe rewards to accrue for our voterProxy
        await network.provider.send("evm_increaseTime", [86400]);
        await network.provider.send("evm_mine");

        //claim trading fees as bribes with our voterProxy

        let k = 0; //counter for amount of syncs that happened

        tx = await i.voterProxy.getFeeTokensFromBribe(i.oxPool.address);
        k += 5; //getFeeTokensFromBribe syncs in steps of 5
        receipt = await tx.wait();
        console.log("gasUsed:", receipt.gasUsed);
        await network.provider.send("evm_increaseTime", [86400]);
        await network.provider.send("evm_mine");

        //doing two times to show synced difference
        tx = await i.voterProxy.getFeeTokensFromBribe(i.oxPool.address);
        k += 5;
        receipt = await tx.wait();
        console.log("gasUsed:", receipt.gasUsed);
        await network.provider.send("evm_increaseTime", [86400]);
        await network.provider.send("evm_mine");

        //balances should be equal since no claim should happen when lag>5
        oxSolidStakingUsdtAfter = await i.usdt.balanceOf(
          oxSolidRewardsPoolAddress
        );
        oxSolidStakingUstAfter = await i.ust.balanceOf(
          oxSolidRewardsPoolAddress
        );
        expect(oxSolidStakingUsdtAfter).to.be.equal(oxSolidStakingUsdtBefore);
        expect(oxSolidStakingUstAfter).to.be.equal(oxSolidStakingUstBefore);

        //now we let it run a bunch of times to sync up the checkpoints
        for (k; k < voteAmount + 5; k += 5) {
          tx = await i.voterProxy.getFeeTokensFromBribe(i.oxPool.address);
          receipt = await tx.wait();
          console.log("gasUsed:", receipt.gasUsed);
          await network.provider.send("evm_increaseTime", [86400]);
          await network.provider.send("evm_mine");
        }

        oxSolidStakingUsdtAfter = await i.usdt.balanceOf(
          oxSolidRewardsPoolAddress
        );
        oxSolidStakingUstAfter = await i.ust.balanceOf(
          oxSolidRewardsPoolAddress
        );
        //balances should change since we should be synced by now and claimed
        expect(oxSolidStakingUsdtAfter).gt(oxSolidStakingUsdtBefore);
        expect(oxSolidStakingUstAfter).gt(oxSolidStakingUstBefore);
      });
    });
  }
});
