import { html } from 'lit-html';
import { ActionConfig, COLORS, ValidationResult } from '../types';
import { Node, SetContactField } from '../../store/flow-definition';

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
      nameKey: 'name',
      valueKey: 'key',
      endpoint: '/api/v2/fields.json',
      helpText: 'Select the contact field to update',
      allowCreate: true,
      createArbitraryOption: (input: string) => ({ key: input, name: input })
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
  fromFormData: (formData: SetContactField): SetContactField => {
    const field = formData.field[0];
    return {
      uuid: formData.uuid,
      type: 'set_contact_field',
      field: { name: field.name, key: field.key },
      value: formData.value
    };
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
