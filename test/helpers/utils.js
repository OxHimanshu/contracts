const { BigNumber } = ethers;
const {
  ONE_ETHER, EPOCH_LENGTH, NUM_STATES, MATURITIES,
} = require('./constants');

const toBigNumber = (value) => BigNumber.from(value);
const tokenAmount = (value) => toBigNumber(value).mul(ONE_ETHER);

const calculateDisputesData = async (assetId, voteManager, stakeManager, assetManager, epoch) => {
  // See issue https://github.com/ethers-io/ethers.js/issues/407#issuecomment-458360013
  // We should rethink about overloading functions.
  const totalInfluenceRevealed = await voteManager['getTotalInfluenceRevealed(uint32)'](epoch);

  let median = toBigNumber('0');

  const sortedStakers = [];
  const votes = [];
  let accProd = toBigNumber(0);
  // let accWeight;
  let infl;
  let vote;
  const collectionIndex = await assetManager.getCollectionIndex(assetId);
  for (let i = 1; i <= (await stakeManager.numStakers()); i++) {
    vote = await voteManager.getVote(i);

    if (vote[0] === epoch) {
      sortedStakers.push(i);
      votes.push(vote[1][collectionIndex - 1]);

      infl = await voteManager.getInfluenceSnapshot(epoch, i);
      // accWeight += infl;
      accProd = accProd.add(toBigNumber(vote[1][collectionIndex - 1]).mul(infl));
    }
  }

  median = accProd.div(totalInfluenceRevealed);

  return {
    median, totalInfluenceRevealed, accProd, sortedStakers,
  };
};

const prng = async (max, prngHashes) => {
  const sum = toBigNumber(prngHashes);
  max = toBigNumber(max);
  return (sum.mod(max));
};

// pseudo random hash generator based on block hashes.
const prngHash = async (seed, salt) => {
  const sum = await web3.utils.soliditySha3(seed, salt);
  return (sum);
};

const maturity = async (age) => {
  const index = age / 10000;
  return MATURITIES[index];
};

const isElectedProposer = async (iteration, biggestInfluence, influence, stakerId, numStakers, randaoHash) => {
  // add +1 since prng returns 0 to max-1 and staker start from 1
  const salt1 = await web3.utils.soliditySha3(iteration);
  const seed1 = await prngHash(randaoHash, salt1);
  const rand1 = await prng(numStakers, seed1);
  if (!(toBigNumber(rand1).add(1).eq(stakerId))) return false;

  const salt2 = await web3.utils.soliditySha3(stakerId, iteration);
  const seed2 = await prngHash(randaoHash, salt2);
  const rand2 = await prng(toBigNumber(2).pow(toBigNumber(32)), toBigNumber(seed2));
  if ((rand2.mul(biggestInfluence)).lt(influence.mul(toBigNumber(2).pow(32)))) return true;

  return false;
};

const getEpoch = async () => {
  const blockNumber = toBigNumber(await web3.eth.getBlockNumber());
  return blockNumber.div(EPOCH_LENGTH).toNumber();
};

const getVote = async (medians) => {
  const rand = Math.floor(Math.random() * 3);
  const fact = (rand === 2) ? -1 : rand;
  const votes = [];
  for (let i = 0; i < medians.length; i++) votes.push((medians[i] + fact));
  return votes;
};

const getBiggestInfluenceAndId = async (stakeManager, voteManager) => {
  const numStakers = await stakeManager.numStakers();
  let biggestInfluence = toBigNumber('0');
  let biggestInfluencerId = toBigNumber('0');
  const epoch = getEpoch();
  for (let i = 1; i <= numStakers; i++) {
    const influence = await voteManager.getInfluenceSnapshot(epoch, i);
    if (influence.gt(biggestInfluence)) {
      biggestInfluence = influence;
      biggestInfluencerId = i;
    }
  }
  return { biggestInfluence, biggestInfluencerId };
};

const getIteration = async (voteManager, stakeManager, staker, biggestInfluence) => {
  const numStakers = await stakeManager.getNumStakers();
  const stakerId = staker.id;
  const epoch = getEpoch();
  const influence = await voteManager.getInfluenceSnapshot(epoch, stakerId);
  const randaoHash = await voteManager.getRandaoHash();
  if (Number(influence) === 0) return 0; // following loop goes in infinite loop if this condn not added
  // influence 0 represents that given staker has not voted in that epoch
  // so anyway in propose its going to revert
  for (let i = 0; i < 10000000000; i++) {
    const isElected = await isElectedProposer(i, biggestInfluence, influence, stakerId, numStakers, randaoHash);
    if (isElected) return (i);
  }
  return 0;
};

const getFalseIteration = async (voteManager, stakeManager, staker) => {
  const numStakers = await stakeManager.getNumStakers();
  const stakerId = staker.id;
  const epoch = getEpoch();
  const influence = await voteManager.getInfluenceSnapshot(epoch, stakerId);
  const { biggestInfluence } = await getBiggestInfluenceAndId(stakeManager, voteManager);
  const randaoHash = await voteManager.getRandaoHash();
  for (let i = 0; i < 10000000000; i++) {
    const isElected = await isElectedProposer(i, biggestInfluence, influence, stakerId, numStakers, randaoHash);
    if (!isElected) return i;
  }
  return 0;
};

const getState = async () => {
  const blockNumber = toBigNumber(await web3.eth.getBlockNumber());
  const state = blockNumber.div(EPOCH_LENGTH.div(NUM_STATES));
  return state.mod(NUM_STATES).toNumber();
};

module.exports = {
  calculateDisputesData,
  isElectedProposer,
  // getBiggestStakeAndId,
  getBiggestInfluenceAndId,
  getEpoch,
  getVote,
  getIteration,
  getFalseIteration,
  getState,
  prng,
  prngHash,
  toBigNumber,
  tokenAmount,
  maturity,
};
