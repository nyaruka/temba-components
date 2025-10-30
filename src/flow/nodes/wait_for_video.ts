import { SPLIT_GROUPS, NodeConfig } from '../types';

export const wait_for_video: NodeConfig = {
  type: 'wait_for_video',
  name: 'Wait for Video',
  group: SPLIT_GROUPS.wait
};
