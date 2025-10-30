import { SPLIT_GROUPS, NodeConfig } from '../types';

export const wait_for_image: NodeConfig = {
  type: 'wait_for_image',
  name: 'Wait for Image',
  group: SPLIT_GROUPS.wait
};
