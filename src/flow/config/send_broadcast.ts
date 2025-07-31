import { html } from 'lit-html';
import { UIConfig, COLORS } from '../types';
import { Node, SendBroadcast } from '../../store/flow-definition';
import { renderNamedObjects } from '../utils';

export const send_broadcast: UIConfig = {
  name: 'Send Broadcast',
  color: COLORS.broadcast,
  render: (_node: Node, action: SendBroadcast) => {
    const hasGroups = action.groups && action.groups.length > 0;
    const hasContacts = action.contacts && action.contacts.length > 0;

    return html`<div>
      <div
        style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto; margin-bottom: 0.5em"
      >
        ${action.text}
      </div>
      ${hasGroups
        ? html`<div style="margin-bottom: 0.25em">
            <div style="font-weight: bold; margin-bottom: 0.25em">Groups:</div>
            ${renderNamedObjects(action.groups, 'group')}
          </div>`
        : null}
      ${hasContacts
        ? html`<div>
            <div style="font-weight: bold; margin-bottom: 0.25em">
              Contacts:
            </div>
            ${renderNamedObjects(action.contacts, 'contact')}
          </div>`
        : null}
    </div>`;
  }
};
