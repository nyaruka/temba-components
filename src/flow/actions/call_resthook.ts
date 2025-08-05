import { html } from 'lit-html';
import { ActionConfig, COLORS } from '../types';
import { Node, CallResthook } from '../../store/flow-definition';

export const call_resthook: ActionConfig = {
  name: 'Call Resthook',
  color: COLORS.call,
  render: (_node: Node, _action: CallResthook) => {
    // This will need to be implemented based on the actual render logic
    return html`<div>Call Resthook</div>`;
  }
};
