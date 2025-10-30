import { ACTION_GROUPS, NodeConfig } from '../types';

export const split_by_airtime: NodeConfig = {
  type: 'split_by_airtime',
  name: 'Send Airtime',
  group: ACTION_GROUPS.services,
  showAsAction: true
};
