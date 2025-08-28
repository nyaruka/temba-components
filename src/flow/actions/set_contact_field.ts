import { html } from 'lit-html';
import { ActionConfig, COLORS, ValidationResult } from '../types';
import { Node, SetContactField } from '../../store/flow-definition';

// Get contact fields from workspace configuration
const getContactFields = (): Array<{ value: string; label: string }> => {
  // TODO: This should dynamically load from workspace configuration
  // For now, return a basic set for testing
  return [
    { value: 'age', label: 'Age' },
    { value: 'gender', label: 'Gender' },
    { value: 'occupation', label: 'Occupation' },
    { value: 'location', label: 'Location' }
  ];
};

export const set_contact_field: ActionConfig = {
  name: 'Update Field',
  color: COLORS.update,
  render: (_node: Node, action: SetContactField) => {
    return html`<div>
      Set <b>${action.field.name}</b> to <b>${action.value}</b>
    </div>`;
  },
  form: {
    field: {
      type: 'select',
      label: 'Field',
      required: true,
      searchable: true,
      clearable: false,
      options: getContactFields(),
      helpText: 'Select the contact field to update'
    },
    value: {
      type: 'text',
      label: 'Value',
      placeholder: 'Enter field value...',
      required: true,
      evaluated: true,
      helpText:
        'The new value for the contact field. You can use expressions like @contact.name'
    }
  },
  validate: (formData: SetContactField): ValidationResult => {
    const errors: { [key: string]: string } = {};

    if (!formData.field) {
      errors.field = 'Field is required';
    }

    if (!formData.value || formData.value.trim() === '') {
      errors.value = 'Field value is required';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  },
  sanitize: (formData: SetContactField): void => {
    if (formData.value && typeof formData.value === 'string') {
      formData.value = formData.value.trim();
    }
  }
};
