import { html } from 'lit-html';
import { ActionConfig, ACTION_GROUPS } from '../types';
import { Node, SayMsg } from '../../store/flow-definition';

import { FlowTypes } from '../types';

export const say_msg: ActionConfig = {
  name: 'Say Message',
  group: ACTION_GROUPS.send,
  flowTypes: [FlowTypes.VOICE],
  render: (_node: Node, _action: SayMsg) => {
    // This will need to be implemented based on the actual render logic
    return html`<div>Say Message</div>`;
  }
};
