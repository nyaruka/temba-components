import { html } from 'lit-html';
import { ActionConfig, ACTION_GROUPS, FormData } from '../types';
import { Node, SetContactStatus } from '../../store/flow-definition';
import { titleCase } from '../../utils';

export const set_contact_status: ActionConfig = {
  name: 'Update Status',
  group: ACTION_GROUPS.update,
  render: (_node: Node, action: SetContactStatus) => {
    return html`<div>Set to <strong>${titleCase(action.status)}</strong></div>`;
  },
  toFormData: (action: SetContactStatus) => {
    return {
      ...action,
      status: {
        name: titleCase(action.status || 'active'),
        value: action.status || 'active'
      }
    };
  },
  fromFormData: (formData: FormData): SetContactStatus => {
    return {
      status: formData.status[0].value,
      type: 'set_contact_status',
      uuid: formData.uuid
    };
  },
  form: {
    status: {
      type: 'select',
      label: 'Status',
      required: true,
      searchable: false,
      clearable: false,
      options: [
        { value: 'active', name: 'Active' },
        { value: 'archived', name: 'Archived' },
        { value: 'stopped', name: 'Stopped' },
        { value: 'blocked', name: 'Blocked' }
      ],
      helpText: 'Select the status to set for the contact'
    }
  }
};
