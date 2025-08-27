import { html } from 'lit-html';
import { ActionConfig, COLORS } from '../types';
import { Node, SetContactName } from '../../store/flow-definition';
import { set_contact } from '../forms/set_contact';
import { ContactFormAdapter } from '../forms/set_contact_adapter';

export const set_contact_name: ActionConfig = {
  name: 'Update Contact',
  color: COLORS.update,
  render: (_node: Node, action: SetContactName) => {
    return html`<div>Set contact name to <b>${action.name}</b></div>`;
  },

  // Use unified form configuration
  form: set_contact.form,
  layout: set_contact.layout,
  validate: set_contact.validate,
  sanitize: set_contact.sanitize,

  // Transform to/from unified form data
  toFormData: (action: SetContactName) => {
    return ContactFormAdapter.actionToFormData(action);
  },
  fromFormData: (formData: any) => {
    return ContactFormAdapter.formDataToAction(formData) as SetContactName;
  }
};
