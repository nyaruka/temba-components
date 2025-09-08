import { html } from 'lit-html';
import { ActionConfig, COLORS, ValidationResult } from '../types';
import { Node, SetContactName } from '../../store/flow-definition';

export const set_contact_name: ActionConfig = {
  name: 'Update Name',
  color: COLORS.update,
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
  validate: (formData: SetContactName): ValidationResult => {
    const errors: { [key: string]: string } = {};

    if (!formData.name || formData.name.trim() === '') {
      errors.name = 'Name is required';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  },
  sanitize: (formData: SetContactName): void => {
    if (formData.name && typeof formData.name === 'string') {
      formData.name = formData.name.trim();
    }
  }
};
