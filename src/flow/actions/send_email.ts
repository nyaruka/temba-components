import { html } from 'lit-html';
import { ActionConfig, COLORS, ValidationResult } from '../types';
import { Node, SendEmail } from '../../store/flow-definition';
import { renderStringList } from '../utils';
import { Icon } from '../../Icons';

export const send_email: ActionConfig = {
  name: 'Send Email',
  color: COLORS.send,
  render: (_node: Node, action: SendEmail) => {
    return html`<div>
      <div>${renderStringList(action.addresses, Icon.email)}</div>
      <div style="margin-top: 0.5em">
        <div
          style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;"
        >
          ${action.subject}
        </div>
      </div>
    </div>`;
  },

  // Form-level transformations
  toFormData: (action: SendEmail) => {
    return {
      uuid: action.uuid,
      addresses: action.addresses || [],
      subject: action.subject || '',
      body: action.body || ''
    };
  },

  fields: {
    addresses: {
      type: 'select',
      label: 'Recipients',
      options: [],
      multi: true,
      searchable: true,
      tags: true,
      placeholder: 'Search for contacts...'
    },
    subject: {
      type: 'text',
      label: 'Subject',
      required: true,
      placeholder: 'Enter email subject',
      maxLength: 255
    },
    body: {
      type: 'textarea',
      label: 'Body',
      required: true,
      evaluated: true,
      rows: 4
    }
  },
  validate: (action: SendEmail): ValidationResult => {
    const errors: { [key: string]: string } = {};

    if (!action.addresses || action.addresses.length === 0) {
      errors.addresses = 'At least one recipient email address is required';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  },
  fromFormData: (formData: any): SendEmail => {
    return {
      uuid: formData.uuid,
      type: 'send_email',
      addresses: Array.isArray(formData.addresses) ? formData.addresses : [],
      subject: formData.subject || '',
      body: formData.body || ''
    };
  }
};
