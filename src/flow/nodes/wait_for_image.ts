import { SPLIT_GROUPS, NodeConfig, FlowTypes } from '../types';

export const wait_for_image: NodeConfig = {
  type: 'wait_for_image',
  name: 'Wait for Image',
  group: SPLIT_GROUPS.wait,
  flowTypes: [FlowTypes.VOICE, FlowTypes.MESSAGE, FlowTypes.BACKGROUND]
};
