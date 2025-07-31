import { html } from 'lit-html';
import { UIConfig, COLORS } from '../types';
import { Node, RequestOptin } from '../../store/flow-definition';

const render = (_node: Node, _action: RequestOptin) => {
  // This will need to be implemented based on the actual render logic
  return html`<div>Request Opt-in</div>`;
};

export const request_optin: UIConfig = {
  name: 'Request Opt-in',
  color: COLORS.send,
  render
};
