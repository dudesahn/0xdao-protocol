const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { batchConnect } = require("../../deployedLogger/addressGetter");
const deployAll = require("../../scripts/deployAll");
let i;
let poolA, poolB, poolC, poolD, poolE;
let vlOxdBalance, vlOxdBalanceHalf, vlOxdBalanceQuarter;
let snapshot;

describe("Voting Interactions", function () {
  beforeEach(async function () {
    [, owner2, owner3] = await ethers.getSigners(3);
  });

  it("Fetch interfaces", async () => {
    i = await deployAll(true);
    owner = beep;
    i = await batchConnect(i, beep);

    i.snapshot = i.votingSnapshot;

    let j = {};
    j.snapshot = i.snapshot;
    j = await batchConnect(j, Deployer);
    snapshot = j.snapshot;
    i.snapshot = j.snapshot;
  });

  it("Prepare for voting", async () => {
    // Fetch OXD balance
    const oxdBalance = await i.oxd.balanceOf(owner.address);

    // Transfer some OXD to owner 2
    await i.oxd.transfer(owner2.address, oxdBalance.div(2));

    // Update balances
    const oxdBalanceSplit = await i.oxd.balanceOf(owner.address);

    // Allow vlOxd to spend OXD
    await i.oxd.approve(i.vlOxd.address, oxdBalanceSplit);
    await i.oxd.connect(owner2).approve(i.vlOxd.address, oxdBalanceSplit);

    // Lock OXD for vlOXD
    await i.vlOxd.lock(owner.address, oxdBalanceSplit, 0);
    await i.vlOxd.connect(owner2).lock(owner2.address, oxdBalanceSplit, 0);
    vlOxdBalance = await i.vlOxd.lockedBalanceOf(owner.address);
    const vlOxdBalance2 = await i.vlOxd.lockedBalanceOf(owner2.address);
    expect(vlOxdBalance).gt(0);
    expect(vlOxdBalance2).gt(0);
    poolA = i.oxSolid.address;
    poolB = i.vlOxd.address;
    poolC = i.cvlOxd.address;
    poolD = i.oxd.address;
    poolE = i.userProxy.address;

    // Save snapshot
    snapshot = i.votingSnapshot;
  });

  it("Test user vote registration", async () => {
    // Vote for two pools from one account with half weight

    vlOxdBalanceHalf = vlOxdBalance.div(2);
    await snapshot["vote(address,int256)"](poolA, vlOxdBalanceHalf);
    await snapshot["vote(address,int256)"](poolB, vlOxdBalanceHalf);

    // Global vote lengths should update
    expect(await snapshot.votesLength()).to.equal(2);
    expect(await snapshot.uniqueVotesLength()).to.equal(1); // Vote weight is the same

    // Full vote weight should be used
    expect(await snapshot.voteWeightUsedByAccount(owner.address)).to.equal(
      vlOxdBalance
    );

    // User votes length should update
    expect(await snapshot.votesLengthByAccount(owner.address)).to.equal(2);

    // User account vote should update
    let vote = await snapshot.accountVoteByPool(owner.address, poolA);
    expect(vote.weight).to.equal(vlOxdBalanceHalf);
    expect(vote.poolAddress).to.equal(poolA);
    vote = await snapshot.accountVoteByPool(owner.address, poolB);
    expect(vote.weight).to.equal(vlOxdBalanceHalf);
    expect(vote.poolAddress).to.equal(poolB);

    // Account vote index should update
    vote = await snapshot.accountVoteByIndex(owner.address, 0);
    expect(vote.weight).to.equal(vlOxdBalanceHalf);
    expect(vote.poolAddress).to.equal(poolA);
    vote = await snapshot.accountVoteByIndex(owner.address, 1);
    expect(vote.weight).to.equal(vlOxdBalanceHalf);
    expect(vote.poolAddress).to.equal(poolB);

    // Account's vote index by pool should update
    let index = await snapshot.accountVoteIndexByPool(owner.address, poolA);
    expect(index).to.equal(0);
    index = await snapshot.accountVoteIndexByPool(owner.address, poolB);
    expect(index).to.equal(1);

    // Exceeding voting balance should fail
    await expect(snapshot["vote(address,int256)"](poolC, 100)).to.be.reverted;

    // Change pool vote
    vlOxdBalanceQuarter = vlOxdBalance.div(4);
    await snapshot["vote(address,int256)"](poolA, vlOxdBalanceQuarter);

    // Used weight should go down
    expect(await snapshot.voteWeightUsedByAccount(owner.address)).to.equal(
      vlOxdBalance.sub(vlOxdBalanceQuarter)
    );

    // Votes length should stay the same
    expect(await snapshot.votesLengthByAccount(owner.address)).to.equal(2);

    // Vote should change
    vote = await snapshot.accountVoteByPool(owner.address, poolA);
    expect(vote.weight).to.equal(vlOxdBalanceQuarter);
    expect(vote.poolAddress).to.equal(poolA);

    // Vote for another pool using a negative weight
    snapshot["vote(address,int256)"](poolC, vlOxdBalanceQuarter.mul(-1));

    // Vote weight for user should still be used, even though there are negative votes
    expect(await snapshot.voteWeightUsedByAccount(owner.address)).to.equal(
      vlOxdBalance
    );

    // Make sure we can find the negative vote
    vote = await snapshot.accountVoteByPool(owner.address, poolC);
    expect(vote.weight).to.equal(vlOxdBalanceQuarter.mul(-1));
    expect(vote.poolAddress).to.equal(poolC);

    // Votes length should go up
    expect(await snapshot.votesLengthByAccount(owner.address)).to.equal(3);

    // Votes by account length should go up
    let votesByAccount = await snapshot.votesByAccount(owner.address);
    expect(votesByAccount.length).to.equal(3);

    // votesByAccount should have valid data
    expect(votesByAccount[0].poolAddress).to.equal(poolA);
    expect(votesByAccount[1].poolAddress).to.equal(poolB);
    expect(votesByAccount[2].poolAddress).to.equal(poolC);
    expect(votesByAccount[0].weight).to.equal(vlOxdBalanceQuarter);
    expect(votesByAccount[1].weight).to.equal(vlOxdBalanceHalf);
    expect(votesByAccount[2].weight).to.equal(vlOxdBalanceQuarter.mul(-1));

    // Set vote weight to zero for a pool
    await snapshot["vote(address,int256)"](poolA, 0);

    // Votes by account length should go down
    votesByAccount = await snapshot.votesByAccount(owner.address);
    expect(votesByAccount.length).to.equal(2);

    // Votes length should go down
    expect(await snapshot.votesLengthByAccount(owner.address)).to.equal(2);

    // Vote should no longer be able to be found
    vote = await snapshot.accountVoteByPool(owner.address, poolA);
    expect(vote.weight).to.equal(0);
    expect(vote.poolAddress).to.equal(
      "0x0000000000000000000000000000000000000000"
    );

    // Vote weight should go down
    expect(await snapshot.voteWeightUsedByAccount(owner.address)).to.equal(
      vlOxdBalance.sub(vlOxdBalanceQuarter)
    );

    // The correct pool should be deleted (order is altered)
    expect(votesByAccount[0].poolAddress).to.equal(poolC);
    expect(votesByAccount[1].poolAddress).to.equal(poolB);
    expect(votesByAccount[0].weight).to.equal(vlOxdBalanceQuarter.mul(-1));
    expect(votesByAccount[1].weight).to.equal(vlOxdBalanceHalf);

    // Delete all votes
    await snapshot["resetVotes()"]();

    // Votes should be deleted in context of user
    votesByAccount = await snapshot.votesByAccount(owner.address);
    expect(votesByAccount.length).to.equal(0);

    // Votes should be deleted globally
    expect((await snapshot["votes()"]()).length).to.equal(0);
    expect((await snapshot["topVotes()"]()).length).to.equal(0);
  });

  it("Test multiple user voting", async () => {
    // Vote for pool A as user 1
    await snapshot["vote(address,int256)"](poolA, vlOxdBalanceQuarter);

    // Make sure pool A weight updates
    expect(await snapshot.weightByPoolSigned(poolA)).to.equal(
      vlOxdBalanceQuarter
    );
    expect(await snapshot.weightByPoolUnsigned(poolA)).to.equal(
      vlOxdBalanceQuarter
    );

    // Make sure votes length is correct
    expect(await snapshot.uniqueVotesLength()).to.equal(1);
    expect(await snapshot.votesLength()).to.equal(1);
    expect((await snapshot["votes()"]()).length).to.equal(1);

    // Vote for pool A as user 2
    await snapshot
      .connect(owner2)
      ["vote(address,int256)"](poolA, vlOxdBalanceQuarter);

    // Make sure pool A weight increases
    expect(await snapshot.weightByPoolSigned(poolA)).to.equal(vlOxdBalanceHalf);
    expect(await snapshot.weightByPoolUnsigned(poolA)).to.equal(
      vlOxdBalanceHalf
    );
    expect((await snapshot["votes()"]())[0].weight).to.equal(vlOxdBalanceHalf);

    // Delete user 1's votes
    await snapshot["resetVotes()"]();

    // Make sure pool A weight decreases
    expect(await snapshot.weightByPoolSigned(poolA)).to.equal(
      vlOxdBalanceQuarter
    );
    expect(await snapshot.weightByPoolUnsigned(poolA)).to.equal(
      vlOxdBalanceQuarter
    );

    // Make sure votes length stays the same
    expect(await snapshot.uniqueVotesLength()).to.equal(1);
    expect(await snapshot.votesLength()).to.equal(1);
    expect((await snapshot["votes()"]()).length).to.equal(1);

    // Vote for pool A with a negating vote (sets weight to zero)
    await snapshot["vote(address,int256)"](poolA, vlOxdBalanceQuarter.mul(-1));

    // Make sure votes length goes down
    expect(await snapshot.uniqueVotesLength()).to.equal(0);
    expect(await snapshot.votesLength()).to.equal(0);
    expect((await snapshot["votes()"]()).length).to.equal(0);

    // Delete user 2's votes
    await snapshot.connect(owner2)["resetVotes()"]();

    // Make sure votes length goes up
    expect(await snapshot.uniqueVotesLength()).to.equal(1);
    expect(await snapshot.votesLength()).to.equal(1);
    expect((await snapshot["votes()"]()).length).to.equal(1);

    // Make sure pool A weight is negative
    expect(await snapshot.weightByPoolSigned(poolA)).to.equal(
      vlOxdBalanceQuarter.mul(-1)
    );
    expect((await snapshot["votes()"]())[0].weight).to.equal(
      vlOxdBalanceQuarter.mul(-1)
    );
    expect(await snapshot.weightByPoolUnsigned(poolA)).to.equal(
      vlOxdBalanceQuarter
    );

    // Delete user 1's votes
    await snapshot["resetVotes()"]();

    // Make sure votes length is zero
    expect(await snapshot.uniqueVotesLength()).to.equal(0);
    expect(await snapshot.votesLength()).to.equal(0);
    expect((await snapshot["votes()"]()).length).to.equal(0);
  });

  it("Test pool vote sorting", async () => {
    // Vote
    await snapshot["vote(address,int256)"](poolA, -500);
    await snapshot["vote(address,int256)"](poolB, -600);
    await snapshot["vote(address,int256)"](poolC, 200);
    await snapshot["vote(address,int256)"](poolD, 700);
    await snapshot["vote(address,int256)"](poolE, -900);

    // Make sure order is correct
    votes = await snapshot["votes()"]();
    expect(votes[0].weight).to.equal(-900);
    expect(votes[1].weight).to.equal(700);
    expect(votes[2].weight).to.equal(-600);
    expect(votes[3].weight).to.equal(-500);
    expect(votes[4].weight).to.equal(200);
    expect(votes[0].poolAddress).to.equal(poolE);
    expect(votes[1].poolAddress).to.equal(poolD);
    expect(votes[2].poolAddress).to.equal(poolB);
    expect(votes[3].poolAddress).to.equal(poolA);
    expect(votes[4].poolAddress).to.equal(poolC);

    // Switch vote from positive to negative
    await snapshot["vote(address,int256)"](poolE, 900);
    votes = await snapshot["votes()"]();
    expect(votes[0].weight).to.equal(900);

    // Vote against a pool to lower its rank
    await snapshot.connect(owner2)["vote(address,int256)"](poolE, -800);
    votes = await snapshot["votes()"]();

    // Make sure all pools change order
    expect(votes[0].weight).to.equal(700);
    expect(votes[1].weight).to.equal(-600);
    expect(votes[2].weight).to.equal(-500);
    expect(votes[3].weight).to.equal(200);
    expect(votes[4].weight).to.equal(100);
    expect(votes[0].poolAddress).to.equal(poolD);
    expect(votes[1].poolAddress).to.equal(poolB);
    expect(votes[2].poolAddress).to.equal(poolA);
    expect(votes[3].poolAddress).to.equal(poolC);
    expect(votes[4].poolAddress).to.equal(poolE);

    // Find combined top votes weight summation
    expect(await snapshot.topVotesWeight()).to.equal(
      700 + 600 + 500 + 200 + 100
    );

    // Delete votes
    await snapshot["resetVotes()"]();
    await snapshot.connect(owner2)["resetVotes()"]();
  });

  it("Test voting", async () => {
    const vlBalanceDivided = vlOxdBalance.div(100);
    await snapshot["vote(address,int256)"](poolA, vlBalanceDivided.mul(30));
    await snapshot["vote(address,int256)"](poolB, vlBalanceDivided.mul(5));
    await snapshot["vote(address,int256)"](poolC, vlBalanceDivided.mul(10));
    await snapshot["vote(address,int256)"](poolD, vlBalanceDivided.mul(35));
    await snapshot["vote(address,int256)"](poolE, vlBalanceDivided.mul(20));
    
    snapshot = i.snapshot; //somehow it lost the Deployer signer along the way

    // Only care about the top 3 pools
    await snapshot.connect(Deployer).setMaxPoolsLength(3);

    // Find total vote weight (ve.balanceOfNFT(tokenID))
    const totalVoteWeight = await snapshot.totalVoteWeight();

    // Prepare vote
    const vote = await snapshot.prepareVote();
    expect(vote[0][0]).to.equal(poolD);
    expect(vote[0][1]).to.equal(poolA);
    expect(vote[0][2]).to.equal(poolE);

    // Calculate expected outcome
    const countedVotesTotal = 35 + 30 + 20;
    expect(vote[1][0]).to.equal(totalVoteWeight.mul(35).div(countedVotesTotal));
    expect(vote[1][1]).to.equal(totalVoteWeight.mul(30).div(countedVotesTotal));
    expect(vote[1][2]).to.equal(totalVoteWeight.mul(20).div(countedVotesTotal));

    // Make sure vote submission window view methods are working appropriately
    const nextEpoch = await snapshot.nextEpoch();
    const nextVoteSubmission = await snapshot.nextVoteSubmission();
    const window = await snapshot.window();
    expect(nextVoteSubmission).eq(nextEpoch.sub(window));

    // Advance time to just before window
    await network.provider.send("evm_setNextBlockTimestamp", [
      nextVoteSubmission.sub(1).toNumber(),
    ]);

    // Voting should revert
    await expect(snapshot.submitVote()).to.be.reverted;

    // Voting should succeed
    await snapshot.submitVote();

    // Voting again should succeed
    await snapshot.submitVote();

    // Increase time to just before next epoch
    await network.provider.send("evm_setNextBlockTimestamp", [
      nextEpoch.sub(1).toNumber(),
    ]);

    // Voting should succeed
    await snapshot.submitVote();

    // Progress timestamp by 1 second
    await network.provider.send("evm_increaseTime", [1]);

    // Now vote should fail
    await expect(snapshot.submitVote()).to.be.reverted;

    // Remove votes
    await snapshot["resetVotes()"]();
  });

  it("Test vote delegation", async () => {
    // Users can vote for themselves
    await snapshot["vote(address,address,int256)"](owner.address, poolA, 500);

    // Users cannot vote for other users unless they are delegates
    await expect(
      snapshot["vote(address,address,int256)"](owner2.address, poolA, 500)
    ).to.be.reverted;

    // Set delegate
    await snapshot.connect(owner2).setVoteDelegate(owner.address);
    expect(
      await snapshot.connect(owner2).voteDelegateByAccount(owner2.address)
    ).to.equal(owner.address);

    // Delegates can vote
    await snapshot["vote(address,address,int256)"](owner2.address, poolA, 500);

    // Clear delegate
    await snapshot.connect(owner2).clearVoteDelegate();

    // Non-delegates cannot vote
    await expect(
      snapshot["vote(address,address,int256)"](owner2.address, poolA, 500)
    ).to.be.reverted;
  });
});
