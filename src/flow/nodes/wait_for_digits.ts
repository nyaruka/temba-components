import { SPLIT_GROUPS, NodeConfig, FlowTypes } from '../types';

export const wait_for_digits: NodeConfig = {
  type: 'wait_for_digits',
  name: 'Wait for Digits',
  group: SPLIT_GROUPS.wait,
  flowTypes: [FlowTypes.VOICE]
};
