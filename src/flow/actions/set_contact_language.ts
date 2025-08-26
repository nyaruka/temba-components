import { html } from 'lit-html';
import { ActionConfig, COLORS } from '../types';
import { Node, SetContactLanguage } from '../../store/flow-definition';

export const set_contact_language: ActionConfig = {
  name: 'Update Contact',
  color: COLORS.update,
  render: (_node: Node, action: SetContactLanguage) => {
    return html`<div>Set contact language to <b>${action.language}</b></div>`;
  }
};
