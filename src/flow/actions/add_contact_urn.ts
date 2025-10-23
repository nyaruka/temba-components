import { html } from 'lit-html';
import { ActionConfig, COLORS } from '../types';
import { Node, AddContactUrn } from '../../store/flow-definition';
import { SCHEMES } from '../utils';

export const add_contact_urn: ActionConfig = {
  name: 'Add URN',
  color: COLORS.update,
  render: (_node: Node, action: AddContactUrn) => {
    const schemeObj = SCHEMES.find((s) => s.scheme === action.scheme);
    const friendlyScheme = schemeObj?.name || action.scheme;
    return html`<div
      style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;"
    >
      Add ${friendlyScheme} <strong>${action.path}</strong>
    </div>`;
  }
};
