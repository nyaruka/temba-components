import { html } from 'lit-html';
import { UIConfig, COLORS } from '../types';
import { Node, SayMsg } from '../../store/flow-definition';

const render = (_node: Node, _action: SayMsg) => {
  // This will need to be implemented based on the actual render logic
  return html`<div>Say Message</div>`;
};

export const say_msg: UIConfig = {
  name: 'Say Message',
  color: COLORS.send,
  render
};
