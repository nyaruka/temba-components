import { html } from 'lit-html';
import { ActionConfig, COLORS } from '../types';
import { Node, StartSession } from '../../store/flow-definition';
import { renderNamedObjects } from '../utils';

export const start_session: ActionConfig = {
  name: 'Start Session',
  color: COLORS.execute,
  render: (_node: Node, action: StartSession) => {
    const hasGroups = action.groups && action.groups.length > 0;
    const hasContacts = action.contacts && action.contacts.length > 0;
    const hasRecipients = hasGroups || hasContacts;

    // Build the recipients display
    let recipientsDisplay = html``;
    if (action.create_contact) {
      recipientsDisplay = html`Create a new contact`;
    } else if ((action as any).contact_query) {
      recipientsDisplay = html`${(action as any).contact_query}`;
    } else if (hasRecipients) {
      const allRecipients = [
        ...(action.contacts || []),
        ...(action.groups || [])
      ];
      recipientsDisplay = html`${renderNamedObjects(
        allRecipients,
        hasGroups ? 'group' : 'contact'
      )}`;
    }

    return html`
      <div>
        <div
          style="padding: 3px 10px; background: #f5f5f5; font-size: 11px; border-radius: var(--curvature); margin-bottom: 10px;"
        >
          ${recipientsDisplay}
        </div>
        <div style="padding: 0px 10px;">
          ${renderNamedObjects([action.flow], 'flow')}
        </div>
      </div>
    `;
  }
};
