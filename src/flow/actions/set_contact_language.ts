import { html } from 'lit-html';
import { ActionConfig, COLORS } from '../types';
import { Node, SetContactLanguage } from '../../store/flow-definition';
import { set_contact } from '../forms/set_contact';
import { ContactFormAdapter } from '../forms/set_contact_adapter';

export const set_contact_language: ActionConfig = {
  name: 'Update Contact',
  color: COLORS.update,
  render: (_node: Node, action: SetContactLanguage) => {
    return html`<div>Set contact language to <b>${action.language}</b></div>`;
  },

  // Use unified form configuration
  form: set_contact.form,
  layout: set_contact.layout,
  validate: set_contact.validate,
  sanitize: set_contact.sanitize,

  // Transform to/from unified form data
  toFormData: (action: SetContactLanguage) => {
    return ContactFormAdapter.actionToFormData(action);
  },
  fromFormData: (formData: any) => {
    return ContactFormAdapter.formDataToAction(formData) as SetContactLanguage;
  }
};
