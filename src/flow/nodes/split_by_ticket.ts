import { open_ticket } from '../actions/open_ticket';
import { NodeConfig } from '../types';

export const split_by_ticket: NodeConfig = {
  type: 'split_by_ticket',
  action: open_ticket,
  router: {
    type: 'switch',
    defaultCategory: 'Failure',
    operand: '@locals._new_ticket',
    rules: [
      {
        type: 'has_text',
        arguments: [],
        categoryName: 'Success'
      }
    ]
  }
};