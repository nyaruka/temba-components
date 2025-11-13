import { html } from 'lit-html';
import { ActionConfig, ACTION_GROUPS, FormData } from '../types';
import { Node, SetContactName } from '../../store/flow-definition';

export const set_contact_name: ActionConfig = {
  name: 'Update Name',
  group: ACTION_GROUPS.contacts,
  render: (_node: Node, action: SetContactName) => {
    return html`<div>Set to <strong>${action.name}</strong></div>`;
  },
  form: {
    name: {
      type: 'text',
      label: 'Name',
      placeholder: 'Enter contact name...',
      required: true,
      evaluated: true,
      helpText:
        'The new name for the contact. You can use expressions like @contact.name'
    }
  },
  sanitize: (formData: FormData): void => {
    if (formData.name && typeof formData.name === 'string') {
      formData.name = formData.name.trim();
    }
  }
};
