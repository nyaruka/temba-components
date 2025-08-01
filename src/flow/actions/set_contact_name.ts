import { html } from 'lit-html';
import { ActionConfig, COLORS } from '../types';
import { Node, SetContactName } from '../../store/flow-definition';

export const set_contact_name: ActionConfig = {
  name: 'Update Contact',
  color: COLORS.update,
  render: (_node: Node, action: SetContactName) => {
    return html`<div>Set contact name to <b>${action.name}</b></div>`;
  }
};
