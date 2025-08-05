import { html } from 'lit-html';
import { ActionConfig, COLORS } from '../types';
import { Node, SetContactStatus } from '../../store/flow-definition';

export const set_contact_status: ActionConfig = {
  name: 'Update Contact Status',
  color: COLORS.update,
  render: (_node: Node, action: SetContactStatus) => {
    return html`<div>Set contact status to <b>${action.status}</b></div>`;
  }
};
