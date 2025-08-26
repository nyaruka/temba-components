import { html } from 'lit-html';
import { ActionConfig, COLORS } from '../types';
import { Node, SetContactField } from '../../store/flow-definition';

export const set_contact_field: ActionConfig = {
  name: 'Update Contact',
  color: COLORS.update,
  render: (_node: Node, action: SetContactField) => {
    return html`<div>
      Set <b>${action.field.name}</b> to <b>${action.value}</b>
    </div>`;
  }
};
