import { html } from 'lit-html';
import { ActionConfig, COLORS, ValidationResult } from '../types';
import { Node, SetContactStatus } from '../../store/flow-definition';
import { titleCase } from '../../utils';

export const set_contact_status: ActionConfig = {
  name: 'Update Status',
  color: COLORS.update,
  render: (_node: Node, action: SetContactStatus) => {
    return html`<div>Set to <strong>${titleCase(action.status)}</strong></div>`;
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
  },
  validate: (formData: SetContactStatus): ValidationResult => {
    const errors: { [key: string]: string } = {};

    if (!formData.status) {
      errors.status = 'Status is required';
    } else if (
      !['active', 'archived', 'stopped', 'blocked'].includes(formData.status)
    ) {
      errors.status = 'Invalid status selected';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
};
