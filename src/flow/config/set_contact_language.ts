import { html } from 'lit-html';
import { UIConfig, COLORS } from '../types';
import { Node, SetContactLanguage } from '../../store/flow-definition';

const render = (node: Node, action: SetContactLanguage) => {
  return html`<div>Set contact language to <b>${action.language}</b></div>`;
};

export const set_contact_language: UIConfig = {
  name: 'Update Contact Language',
  color: COLORS.update,
  render
};
