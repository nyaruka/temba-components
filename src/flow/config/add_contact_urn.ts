import { html } from 'lit-html';
import { UIConfig, COLORS } from '../types';
import { Node, AddContactUrn } from '../../store/flow-definition';
import { urnSchemeMap } from '../utils';

export const add_contact_urn: UIConfig = {
  name: 'Add Contact URN',
  color: COLORS.update,
  render: (node: Node, action: AddContactUrn) => {
    const friendlyScheme = urnSchemeMap[action.scheme] || action.scheme;
    return html`<div
      style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;"
    >
      Add ${friendlyScheme} <b>${action.path}</b>
    </div>`;
  }
};
