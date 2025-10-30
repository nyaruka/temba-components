import { EDITOR_TYPES, NodeConfig } from '../types';

export const split_by_airtime: NodeConfig = {
  type: 'split_by_airtime',
  name: 'Send Airtime',
  editorType: EDITOR_TYPES.services,
  showAsAction: true
};
