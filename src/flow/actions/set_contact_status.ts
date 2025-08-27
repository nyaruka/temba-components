import { html } from 'lit-html';
import { ActionConfig, COLORS } from '../types';
import { Node, SetContactStatus } from '../../store/flow-definition';
import { set_contact } from '../forms/set_contact';
import { ContactFormAdapter } from '../forms/set_contact_adapter';

export const set_contact_status: ActionConfig = {
  name: 'Update Contact',
  color: COLORS.update,
  render: (_node: Node, action: SetContactStatus) => {
    return html`<div>Set contact status to <b>${action.status}</b></div>`;
  },
  
  // Use unified form configuration
  form: set_contact.form,
  layout: set_contact.layout,
  validate: set_contact.validate,
  sanitize: set_contact.sanitize,
  
  // Transform to/from unified form data
  toFormData: (action: SetContactStatus) => {
    return ContactFormAdapter.actionToFormData(action);
  },
  fromFormData: (formData: any) => {
    return ContactFormAdapter.formDataToAction(formData) as SetContactStatus;
  }
};
