import { html } from 'lit-html';
import { UIConfig, COLORS } from '../types';
import { Node, WaitForResponse } from '../../store/flow-definition';

const render = (_node: Node, _action: WaitForResponse) => {
  // This will need to be implemented based on the actual render logic
  return html`<div>Wait for Response</div>`;
};

export const wait_for_response: UIConfig = {
  name: 'Wait for Response',
  color: COLORS.wait,
  render
};
