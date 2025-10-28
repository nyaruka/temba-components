import { html } from 'lit-html';
import { ActionConfig, EDITOR_TYPES } from '../types';
import { Node, RequestOptin } from '../../store/flow-definition';

export const request_optin: ActionConfig = {
  name: 'Request Opt-in',
  editorType: EDITOR_TYPES.send,
  render: (_node: Node, _action: RequestOptin) => {
    // This will need to be implemented based on the actual render logic
    return html`<div>Request Opt-in</div>`;
  }
};
