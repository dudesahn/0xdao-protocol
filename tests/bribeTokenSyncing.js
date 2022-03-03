const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { batchConnect } = require("../../deployedLogger/addressGetter");
const deployAll = require("../../scripts/deployAll");
let i;
let userProxyInterface;
let userProxyAddress;
let token0, token1, token2, token3, token4;
let amount;
let bribeTokensBefore;

describe("Bribe token syncing", function () {
  beforeEach(async function () {
    [owner, owner2, owner3] = await ethers.getSigners(3);
  });

  it("Fetch interfaces", async () => {
    i = await deployAll(true);
    i = await batchConnect(i, owner);
    i.tokensAllowlist = await new ethers.Contract(
      i.tokensAllowlist.address,
      i.tokensAllowlist.interface,
      Deployer
    );
  });

  it("Get fresh pool", async () => {
    await i.oxPoolFactory["syncPools(uint256)"](1);
    syncedPoolsLength = await i.oxPoolFactory.syncedPoolsLength();
    oxPoolAddress = await i.oxPoolFactory.oxPools(syncedPoolsLength - 1);
    i.oxPool = await ethers.getContractAt("OxPool", oxPoolAddress);
    solidPoolInfo = await i.oxPool.solidPoolInfo();
    i.bribe = await ethers.getContractAt("Bribe", solidPoolInfo.bribeAddress);

    bribeTokensBefore =
      await i.solidlyLens.bribeTokensAddressesByBribeAddress(i.bribe.address);
  });

  it("Set up tokens", async () => {
    // Set up tokens
    const Token = await ethers.getContractFactory("Token");
    token0 = await Token.deploy("Token0", "T0", 18, owner.address);
    token1 = await Token.deploy("Token1", "T1", 18, owner.address);
    token2 = await Token.deploy("Token2", "T2", 18, owner.address);
    token3 = await Token.deploy("Token3", "T3", 18, owner.address);
    token4 = await Token.deploy("Token4", "T4", 18, owner.address);
    await token0.deployed();
    await token1.deployed();
    await token2.deployed();
    await token3.deployed();
    await token4.deployed();
    amount = "1000000000000000000000";
    await token0.mint(owner.address, amount);
    await token1.mint(owner.address, amount);
    await token2.mint(owner.address, amount);
    await token3.mint(owner.address, amount);
    await token4.mint(owner.address, amount);
    await token0.approve(i.bribe.address, amount);
    await token1.approve(i.bribe.address, amount);
    await token2.approve(i.bribe.address, amount);
    await token3.approve(i.bribe.address, amount);
    await token4.approve(i.bribe.address, amount);
    console.log("token0:", token0.address);
    console.log("token1:", token1.address);
    console.log("token2:", token2.address);
    console.log("token3:", token3.address);
    console.log("token4:", token4.address);
  });

  it("Set up bribes", async () => {
    console.log(amount);

    await i.bribe.notifyRewardAmount(token0.address, amount);
    await i.bribe.notifyRewardAmount(token1.address, amount);
    await i.bribe.notifyRewardAmount(token2.address, amount);
    await i.bribe.notifyRewardAmount(token3.address, amount);
    await i.bribe.notifyRewardAmount(token4.address, amount);
  });

  it("Print bribes", async () => {
    const bribeTokens = await i.solidlyLens.bribeTokensAddressesByBribeAddress(
      i.bribe.address
    );
    expect(bribeTokens.length).gt(5); // There is one extra bribe from deployment script
    console.log(bribeTokens);
  });

  it("Sync bribes", async () => {
    // Length should be zero
    let bribeTokens = await i.oxPool.bribeTokensAddresses();
    expect(bribeTokens.length).to.equal(0);

    // Set page size
    await i.tokensAllowlist.setBribeTokensSyncPageSize(10);
    await i.tokensAllowlist.setBribeTokensNotifyPageSize(2);

    // Sync again
    await i.oxPool["syncBribeTokens()"]();

    // Length should be one
    bribeTokens = await i.oxPool.bribeTokensAddresses();
    expect(bribeTokens.length).to.equal(1);

    // Disable solidly allowlist
    await i.tokensAllowlist.setSolidlyAllowlistEnabled(false);

    // Sync again
    await i.oxPool["syncBribeTokens()"]();

    // Length should be zero
    bribeTokens = await i.oxPool.bribeTokensAddresses();
    expect(bribeTokens.length).to.equal(0);

    // Enable specific tokens
    await i.tokensAllowlist.setTokenAllowed(token0.address, true);
    await i.tokensAllowlist.setTokenAllowed(token1.address, true);

    // Sync specific tokens
    await i.oxPool.updateTokensAllowedStates([token0.address, token1.address]);

    // Length should be two
    bribeTokens = await i.oxPool.bribeTokensAddresses();
    expect(bribeTokens.length).to.equal(2);

    // Disable specific tokens
    await i.tokensAllowlist.setTokensAllowed(
      [
        token0.address,
        token1.address,
        token2.address,
        token3.address,
        token4.address,
      ],
      false
    );

    // Sync a specific number of bribe tokens
    await i.oxPool["syncBribeTokens(uint256,uint256)"](0, 100);

    // Length should be zero
    bribeTokens = await i.oxPool.bribeTokensAddresses();
    expect(bribeTokens.length).to.equal(0);

    // Enable many
    await i.tokensAllowlist.setTokensAllowed(
      [
        token0.address,
        token1.address,
        token2.address,
        token3.address,
        token4.address,
      ],
      true
    );

    // Sync some
    await i.oxPool["syncBribeTokens(uint256,uint256)"](1, 4);

    // Length should three
    bribeTokens = await i.oxPool.bribeTokensAddresses();
    expect(bribeTokens.length).to.equal(3);

    // Sync the rest
    await i.oxPool["syncBribeTokens(uint256,uint256)"](4, 100);

    // Length should be 5
    bribeTokens = await i.oxPool.bribeTokensAddresses();
    expect(bribeTokens.length).to.equal(5);

    // Disable all
    await i.tokensAllowlist.setTokensAllowed(
      [
        token0.address,
        token1.address,
        token2.address,
        token3.address,
        token4.address,
      ],
      false
    );
    await i.oxPool["syncBribeTokens()"]();

    // Length should be 0
    bribeTokens = await i.oxPool.bribeTokensAddresses();
    expect(bribeTokens.length).to.equal(0);

    // Enable three tokens
    await i.tokensAllowlist.setTokensAllowed(
      [token1.address, token2.address, token3.address],
      true
    );

    // Sync
    await i.oxPool.updateTokensAllowedStates([
      token1.address,
      token2.address,
      token3.address,
    ]);

    // Length should be 3
    bribeTokens = await i.oxPool.bribeTokensAddresses();
    expect(bribeTokens.length).to.equal(3);

    // Verify tokens
    bribeTokens = await i.oxPool.bribeTokensAddresses();
    expect(bribeTokens[0]).to.equal(token1.address);
    expect(bribeTokens[1]).to.equal(token2.address);
    expect(bribeTokens[2]).to.equal(token3.address);

    // Disable one
    await i.tokensAllowlist.setTokenAllowed(token2.address, false);

    // Sync
    await i.oxPool["syncBribeTokens()"]();

    // Verify tokens
    bribeTokens = await i.oxPool.bribeTokensAddresses();
    expect(bribeTokens.length).to.equal(2);
    expect(bribeTokens[0]).to.equal(token1.address);
    expect(bribeTokens[1]).to.equal(token3.address);

    // Remove first token
    await i.tokensAllowlist.setTokenAllowed(token1.address, false);

    // Sync
    await i.oxPool["syncBribeTokens()"]();

    // Verify tokens
    bribeTokens = await i.oxPool.bribeTokensAddresses();
    expect(bribeTokens.length).to.equal(1);
    expect(bribeTokens[0]).to.equal(token3.address);

    // Remove last token
    await i.tokensAllowlist.setTokenAllowed(token3.address, false);

    // Sync
    await i.oxPool["syncBribeTokens()"]();

    // Verify tokens
    bribeTokens = await i.oxPool.bribeTokensAddresses();
    expect(bribeTokens.length).to.equal(0);

    // Enable all
    await i.tokensAllowlist.setTokensAllowed(
      [
        token0.address,
        token1.address,
        token2.address,
        token3.address,
        token4.address,
      ],
      true
    );
    await i.oxPool["syncBribeTokens()"]();

    // Notify
    await i.oxPool.notifyBribeTokens();
    console.log();

    await i.oxPool.notifyBribeTokens();
    console.log();

    await i.oxPool.notifyBribeTokens();
    console.log();
  });
});
