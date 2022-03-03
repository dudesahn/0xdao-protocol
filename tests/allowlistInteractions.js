const { expect } = require("chai");
const { ethers } = require("hardhat");
const deployAll = require("../../scripts/deployAll");
let i;

describe("Token allowlist", function () {
  beforeEach(async function () {
    [owner, owner2, owner3] = await ethers.getSigners(3);
  });

  it("Fetch interfaces", async () => {
    i = await deployAll(true);
  });

  it("Tests token allowlist", async () => {
    const ustAddress = i.ust.address;
    const usdtAddress = i.usdt.address;
    const yfiAddress = "0x29b0Da86e484E1C0029B56e817912d778aC0EC69";
    const randomAddress = "0xDA002DF66B625C730e5FEDE90D2F231f2aC935ff";

    // Test Solidly allowlist
    expect(await i.tokensAllowlist.tokenIsAllowed(ustAddress)).to.equal(true);
    expect(await i.tokensAllowlist.tokenIsAllowed(usdtAddress)).to.equal(true);
    expect(await i.tokensAllowlist.tokenIsAllowed(yfiAddress)).to.equal(true);
    expect(await i.tokensAllowlist.tokenIsAllowed(randomAddress)).to.equal(
      false
    );

    // Set token allowed
    await i.tokensAllowlist.setTokenAllowed(randomAddress, true);
    expect(await i.tokensAllowlist.tokenIsAllowed(randomAddress)).eq(true);
    await i.tokensAllowlist.setTokenAllowed(randomAddress, false);
    expect(await i.tokensAllowlist.tokenIsAllowed(randomAddress)).eq(false);

    // Test Solidly token override
    await i.tokensAllowlist.setSolidlyTokenCheckDisabled(ustAddress, true);
    expect(await i.tokensAllowlist.tokenIsAllowed(ustAddress)).to.equal(false);
    expect(await i.tokensAllowlist.tokenIsAllowed(usdtAddress)).to.equal(true);

    // Disable Solidly token checking completely
    await i.tokensAllowlist.setSolidlyAllowlistEnabled(false);
    expect(await i.tokensAllowlist.tokenIsAllowed(usdtAddress)).to.equal(false);

    // Batch set token allowed states
    await i.tokensAllowlist.setTokensAllowed([usdtAddress, ustAddress], true);

    // Make sure batch set worked
    expect(await i.tokensAllowlist.tokenIsAllowed(ustAddress)).to.equal(true);
    expect(await i.tokensAllowlist.tokenIsAllowed(usdtAddress)).to.equal(true);
  });
});
