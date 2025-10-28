import { transfer_airtime } from '../actions/transfer_airtime';
import { EDITOR_TYPES, NodeConfig } from '../types';

export const split_by_airtime: NodeConfig = {
  type: 'split_by_airtime',
  name: 'Send Airtime',
  editorType: EDITOR_TYPES.send,
  showAsAction: true,
  action: transfer_airtime
};
