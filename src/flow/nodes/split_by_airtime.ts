import { transfer_airtime } from '../actions/transfer_airtime';
import { COLORS, NodeConfig } from '../types';

export const split_by_airtime: NodeConfig = {
  type: 'split_by_airtime',
  name: 'Split by Airtime Transfer',
  color: COLORS.send,
  action: transfer_airtime
};
