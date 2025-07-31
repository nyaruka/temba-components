import { html } from 'lit-html';
import { UIConfig, COLORS } from '../types';
import { Node, SetContactField } from '../../store/flow-definition';

const render = (node: Node, action: SetContactField) => {
  return html`<div>
    Set <b>${action.field.name}</b> to <b>${action.value}</b>
  </div>`;
};

export const set_contact_field: UIConfig = {
  name: 'Update Contact Field',
  color: COLORS.update,
  render
};
