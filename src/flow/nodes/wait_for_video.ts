import { SPLIT_GROUPS, NodeConfig, FlowTypes } from '../types';

export const wait_for_video: NodeConfig = {
  type: 'wait_for_video',
  name: 'Wait for Video',
  group: SPLIT_GROUPS.wait,
  flowTypes: [FlowTypes.VOICE, FlowTypes.MESSAGE, FlowTypes.BACKGROUND]
};
