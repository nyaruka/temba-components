import { SPLIT_GROUPS, NodeConfig } from '../types';

export const wait_for_audio: NodeConfig = {
  type: 'wait_for_audio',
  name: 'Wait for Audio',
  group: SPLIT_GROUPS.wait
};
