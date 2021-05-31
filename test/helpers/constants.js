const { BigNumber } = ethers;

const DEFAULT_ADMIN_ROLE_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';
const ONE_ETHER = BigNumber.from(10).pow(BigNumber.from(18));

const EPOCH_LENGTH = BigNumber.from(300);
const NUM_BLOCKS = 10;
const NUM_STATES = BigNumber.from(4);
const STATE_LENGTH = BigNumber.from(75);
const BLOCK_REWARD = BigNumber.from(40).mul(ONE_ETHER);
const GRACE_PERIOD = 8;

module.exports = {
  DEFAULT_ADMIN_ROLE_HASH,
  EPOCH_LENGTH,
  NUM_BLOCKS,
  NUM_STATES,
  ONE_ETHER,
  STATE_LENGTH,
  BLOCK_REWARD,
  GRACE_PERIOD,
};
