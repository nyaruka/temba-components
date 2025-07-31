import { html } from 'lit-html';
import { UIConfig, COLORS } from '../types';
import { Node, CallResthook } from '../../store/flow-definition';

const render = (_node: Node, _action: CallResthook) => {
  // This will need to be implemented based on the actual render logic
  return html`<div>Call Resthook</div>`;
};

export const call_resthook: UIConfig = {
  name: 'Call Resthook',
  color: COLORS.call,
  render
};
