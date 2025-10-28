import { transfer_airtime } from '../actions/transfer_airtime';
import { EDITOR_TYPES, NodeConfig } from '../types';

export const split_by_airtime: NodeConfig = {
  type: 'split_by_airtime',
  name: 'Split by Airtime Transfer',
  editorType: EDITOR_TYPES.send,
  action: transfer_airtime
};
