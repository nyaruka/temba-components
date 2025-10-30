import { SPLIT_GROUPS, NodeConfig } from '../types';

export const wait_for_location: NodeConfig = {
  type: 'wait_for_location',
  name: 'Wait for Location',
  group: SPLIT_GROUPS.wait
};
