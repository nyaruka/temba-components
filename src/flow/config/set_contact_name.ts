import { html } from 'lit-html';
import { UIConfig, COLORS } from '../types';
import { Node, SetContactName } from '../../store/flow-definition';

export const set_contact_name: UIConfig = {
  name: 'Update Contact',
  color: COLORS.update,
  render: (node: Node, action: SetContactName) => {
    return html`<div>Set contact name to <b>${action.name}</b></div>`;
  }
};
