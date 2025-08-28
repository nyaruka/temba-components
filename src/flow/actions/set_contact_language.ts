import { html } from 'lit-html';
import { ActionConfig, COLORS, ValidationResult } from '../types';
import { Node, SetContactLanguage } from '../../store/flow-definition';
import { getStore } from '../../store/Store';

export const set_contact_language: ActionConfig = {
  name: 'Update Language',
  color: COLORS.update,
  render: (_node: Node, action: SetContactLanguage) => {
    const languageNames = new Intl.DisplayNames(['en'], {
      type: 'language'
    });
    return html`<div>Set to <b>${languageNames.of(action.language)}</b></div>`;
  },
  form: {
    language: {
      type: 'select',
      label: 'Language',
      required: true,
      searchable: true,
      clearable: false,
      valueKey: 'value',
      nameKey: 'name',
      helpText: 'Select the language to set for the contact',
      getDynamicOptions: () => {
        const store = getStore();
        const workspace = store?.getState().workspace;
        if (workspace?.languages && Array.isArray(workspace.languages)) {
          const languageNames = new Intl.DisplayNames(['en'], {
            type: 'language'
          });
          return workspace.languages.map((languageCode: string) => ({
            value: languageCode,
            name: languageNames.of(languageCode) || languageCode
          }));
        }
        return [];
      }
    }
  },
  toFormData: (action: SetContactLanguage) => {
    // Convert the language code back to the option object format expected by the form
    if (action.language) {
      const languageNames = new Intl.DisplayNames(['en'], {
        type: 'language'
      });
      return {
        language: {
          value: action.language,
          name: languageNames.of(action.language) || action.language
        },
        uuid: action.uuid
      };
    }
    return {
      language: null,
      uuid: action.uuid
    };
  },
  fromFormData: (formData: any): SetContactLanguage => {
    return {
      uuid: formData.uuid,
      type: 'set_contact_language',
      language: formData.language[0].value
    };
  },

  validate: (formData: any): ValidationResult => {
    const errors: { [key: string]: string } = {};

    if (!formData.language) {
      errors.language = 'Language is required';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
};
