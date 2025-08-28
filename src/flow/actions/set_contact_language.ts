import { html } from 'lit-html';
import { ActionConfig, COLORS, ValidationResult } from '../types';
import { Node, SetContactLanguage } from '../../store/flow-definition';

export const set_contact_language: ActionConfig = {
  name: 'Update Contact',
  color: COLORS.update,
  render: (_node: Node, action: SetContactLanguage) => {
    return html`<div>Set contact language to <b>${action.language}</b></div>`;
  },
  form: {
    language: {
      type: 'select',
      label: 'Language',
      required: true,
      searchable: true,
      clearable: false,
      endpoint: '/api/v2/languages.json',
      valueKey: 'iso',
      nameKey: 'name',
      helpText: 'Select the language to set for the contact'
    }
  },
  validate: (formData: SetContactLanguage): ValidationResult => {
    const errors: { [key: string]: string } = {};

    if (!formData.language || formData.language.trim() === '') {
      errors.language = 'Language is required';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  },
  sanitize: (formData: SetContactLanguage): void => {
    if (formData.language && typeof formData.language === 'string') {
      formData.language = formData.language.trim();
    }
  }
};
