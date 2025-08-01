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
      addresses: (action.addresses || []).map((text) => ({
        name: text,
        value: text
      })),
      subject: action.subject || '',
      body: action.body || ''
    };
  },

  form: {
    addresses: {
      label: 'Recipients',
      widget: {
        type: 'temba-select',
        attributes: {
          emails: true,
          searchable: true,
          placeholder: 'Search for contacts...'
        }
      }
    },
    subject: {
      label: 'Subject',
      required: true,
      widget: {
        type: 'temba-textinput',
        attributes: {
          placeholder: 'Enter email subject',
          maxlength: 255
        }
      }
    },
    body: {
      label: 'Body',
      required: true,
      widget: {
        type: 'temba-completion',
        attributes: {
          textarea: true,
          minHeight: 75,
          expressions: 'session'
        }
      }
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
      addresses: Array.isArray(formData.addresses)
        ? formData.addresses.map((item: any) => item.value || item.name || item)
        : [],
      subject: formData.subject || '',
      body: formData.body || ''
    };
  }
};
