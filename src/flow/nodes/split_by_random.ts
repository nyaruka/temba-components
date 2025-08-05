import { COLORS, NodeConfig } from '../types';

export const split_by_random: NodeConfig = {
  type: 'split_by_random',
  name: 'Split by Random',
  color: COLORS.split,
  router: {
    type: 'random'
  }
};
