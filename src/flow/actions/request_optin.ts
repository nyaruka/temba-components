import { html } from 'lit-html';
import { ActionConfig, COLORS } from '../types';
import { Node, RequestOptin } from '../../store/flow-definition';

export const request_optin: ActionConfig = {
  name: 'Request Opt-in',
  color: COLORS.send,
  render: (_node: Node, _action: RequestOptin) => {
    // This will need to be implemented based on the actual render logic
    return html`<div>Request Opt-in</div>`;
  }
};
