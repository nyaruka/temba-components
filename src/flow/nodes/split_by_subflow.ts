import { enter_flow } from '../actions/enter_flow';
import { COLORS, NodeConfig } from '../types';

export const split_by_subflow: NodeConfig = {
  type: 'split_by_subflow',
  name: 'Split by Subflow',
  color: COLORS.execute,
  action: enter_flow
};
