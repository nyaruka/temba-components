import { SPLIT_GROUPS, NodeConfig, FlowTypes } from '../types';

export const wait_for_location: NodeConfig = {
  type: 'wait_for_location',
  name: 'Wait for Location',
  group: SPLIT_GROUPS.wait,
  flowTypes: [FlowTypes.VOICE, FlowTypes.MESSAGE, FlowTypes.BACKGROUND]
};
