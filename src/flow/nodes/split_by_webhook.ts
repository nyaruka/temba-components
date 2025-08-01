import { call_webhook } from '../actions/call_webhook';
import { NodeConfig } from '../types';

export const split_by_webhook: NodeConfig = {
  type: 'split_by_webhook',
  action: call_webhook,
  router: {
    type: 'switch',
    defaultCategory: 'Failure',
    operand: '@webhook.status',
    rules: [
      {
        type: 'has_number_between',
        arguments: ['200', '299'],
        categoryName: 'Success'
      }
    ]
  }
};
