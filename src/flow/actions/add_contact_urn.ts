import { html } from 'lit-html';
import { ActionConfig, COLORS, FormData, ValidationResult } from '../types';
import { Node, AddContactUrn } from '../../store/flow-definition';
import { SCHEMES } from '../utils';

export const add_contact_urn: ActionConfig = {
  name: 'Add URN',
  color: COLORS.update,
  render: (_node: Node, action: AddContactUrn) => {
    const schemeObj = SCHEMES.find((s) => s.scheme === action.scheme);
    const friendlyScheme = schemeObj?.path || action.scheme;
    return html`<div
      style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;"
    >
      Add ${friendlyScheme} <strong>${action.path}</strong>
    </div>`;
  },

  toFormData: (action: AddContactUrn) => {
    const schemeObj = SCHEMES.find((s) => s.scheme === action.scheme);
    return {
      uuid: action.uuid,
      scheme: schemeObj
        ? [{ name: schemeObj.path, value: action.scheme }]
        : [{ name: action.scheme, value: action.scheme }],
      path: action.path || ''
    };
  },

  fromFormData: (formData: FormData): AddContactUrn => {
    // Extract scheme value from select format
    const schemeValue =
      Array.isArray(formData.scheme) && formData.scheme.length > 0
        ? formData.scheme[0].value
        : 'tel';

    return {
      uuid: formData.uuid,
      type: 'add_contact_urn',
      scheme: schemeValue,
      path: formData.path || ''
    };
  },

  form: {
    scheme: {
      type: 'select',
      label: 'URN Type',
      helpText: 'Select the type of URN to add to the contact',
      required: true,
      searchable: false,
      multi: false,
      options: SCHEMES.map((scheme) => ({
        name: scheme.path,
        value: scheme.scheme
      }))
    },
    path: {
      type: 'text',
      label: 'URN Value',
      helpText: 'Enter the URN value (e.g., phone number, Facebook ID, etc.)',
      required: true,
      placeholder: 'Enter the URN value...',
      evaluated: true
    }
  },

  validate: (formData: FormData): ValidationResult => {
    const errors: { [key: string]: string } = {};

    if (!formData.scheme || formData.scheme.length === 0) {
      errors.scheme = 'URN type is required';
    }

    if (!formData.path || formData.path.trim() === '') {
      errors.path = 'URN value is required';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
};
