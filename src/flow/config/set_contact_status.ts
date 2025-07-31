import { html } from 'lit-html';
import { UIConfig, COLORS } from '../types';
import { Node, SetContactStatus } from '../../store/flow-definition';

const render = (node: Node, action: SetContactStatus) => {
  return html`<div>Set contact status to <b>${action.status}</b></div>`;
};

export const set_contact_status: UIConfig = {
  name: 'Update Contact Status',
  color: COLORS.update,
  render
};
