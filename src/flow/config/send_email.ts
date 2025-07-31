import { html } from 'lit-html';
import { UIConfig, COLORS } from '../types';
import { Node, SendEmail } from '../../store/flow-definition';
import { renderStringList } from '../utils';
import { Icon } from '../../Icons';

const render = (node: Node, action: SendEmail) => {
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
};

export const send_email: UIConfig = {
  name: 'Send Email',
  color: COLORS.broadcast,
  render,
  properties: {
    addresses: {
      label: 'Recipients',
      widget: {
        type: 'temba-select',
        attributes: {
          emails: true,
          searchable: true,
          placeholder: 'Search for contacts...'
        }
      },
      toFormValue: (actionValue: string[]) => {
        if (!Array.isArray(actionValue)) return [];
        return actionValue.map((text) => ({ name: text, value: text }));
      },
      fromFormValue: (formValue: Array<{ name: string; value: string }>) => {
        if (!Array.isArray(formValue)) return [];
        return formValue.map((item) => item.value || item.name || item);
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
