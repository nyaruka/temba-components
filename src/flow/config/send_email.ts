import { html } from 'lit-html';
import { UIConfig, COLORS } from '../types';
import { Node, SendEmail } from '../../store/flow-definition';
import { renderStringList } from '../utils';
import { Icon } from '../../Icons';

export const send_email: UIConfig = {
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
      addresses: (action.addresses || []).map((text) => ({
        name: text,
        value: text
      })),
      subject: action.subject || '',
      body: action.body || ''
    };
  },

  fromFormData: (formData: any): SendEmail => {
    return {
      ...formData,
      type: 'send_email',
      uuid: formData.uuid || 'new-uuid',
      addresses: Array.isArray(formData.addresses)
        ? formData.addresses.map((item: any) => item.value || item.name || item)
        : [],
      subject: formData.subject || '',
      body: formData.body || ''
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
  }
};
