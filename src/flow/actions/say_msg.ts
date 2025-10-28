import { html } from 'lit-html';
import { ActionConfig, EDITOR_TYPES } from '../types';
import { Node, SayMsg } from '../../store/flow-definition';

export const say_msg: ActionConfig = {
  name: 'Say Message',
  editorType: EDITOR_TYPES.send,
  render: (_node: Node, _action: SayMsg) => {
    // This will need to be implemented based on the actual render logic
    return html`<div>Say Message</div>`;
  }
};
