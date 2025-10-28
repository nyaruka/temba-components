import { html } from 'lit-html';
import {
  ActionConfig,
  EDITOR_TYPES,
  FormData,
  ValidationResult
} from '../types';
import { Node, SendEmail } from '../../store/flow-definition';
import { renderStringList } from '../utils';
import { Icon } from '../../Icons';

export const send_email: ActionConfig = {
  name: 'Send Email',
  editorType: EDITOR_TYPES.send,
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
  form: {
    addresses: {
      type: 'select',
      label: 'Recipients',
      multi: true,
      searchable: true,
      placeholder: 'Search for contacts...',
      emails: true
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
      required: true,
      evaluated: true,
      minHeight: 175
    }
  },
  fromFormData: (formData: FormData): SendEmail => {
    return {
      uuid: formData.uuid,
      type: 'send_email',
      addresses: formData.addresses.map(
        (addr: { name: string; value: string }) => addr.value
      ),
      subject: formData.subject,
      body: formData.body
    };
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
  }
};
