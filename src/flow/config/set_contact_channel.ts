import { html } from 'lit-html';
import { UIConfig, COLORS } from '../types';
import { Node, SetContactChannel } from '../../store/flow-definition';

const render = (node: Node, action: SetContactChannel) => {
  return html`<div>Set contact channel to <b>${action.channel.name}</b></div>`;
};

export const set_contact_channel: UIConfig = {
  name: 'Update Contact Channel',
  color: COLORS.update,
  render
};
