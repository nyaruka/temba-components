import { html } from 'lit-html';
import { ActionConfig, ACTION_GROUPS, FormData, FlowTypes } from '../types';
import { Node, SendBroadcast } from '../../store/flow-definition';
import { renderStringList } from '../utils';
import { Icon } from '../../Icons';

export const send_broadcast: ActionConfig = {
  name: 'Send Broadcast',
  group: ACTION_GROUPS.broadcast,
  flowTypes: [FlowTypes.VOICE, FlowTypes.MESSAGE, FlowTypes.BACKGROUND],
  render: (_node: Node, action: SendBroadcast) => {
    const recipients = [
      ...(action.contacts || []).map((c) => c.name),
      ...(action.groups || []).map((g) => g.name)
    ];

    return html`<div>
      <div>${renderStringList(recipients, Icon.contacts)}</div>
      <div style="margin-top: 0.5em">
        <div
          style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;"
        >
          ${action.text}
        </div>
      </div>
    </div>`;
  },

  form: {
    recipients: {
      type: 'select',
      label: 'Recipients',
      helpText: 'Select the contacts or groups to receive the broadcast',
      options: [],
      multi: true,
      searchable: true,
      endpoint: '/api/v2/contacts.json',
      valueKey: 'uuid',
      nameKey: 'name',
      placeholder: 'Search for contacts or groups...',
      required: true
    },
    text: {
      type: 'message-editor',
      label: 'Message',
      helpText:
        'Enter the message to send with optional attachments. You can use expressions like @contact.name',
      required: true,
      evaluated: true,
      placeholder: 'Type your message here...',
      maxAttachments: 10,
      accept: '',
      endpoint: '/api/v2/media.json',
      counter: 'temba-charcount',
      gsm: true,
      autogrow: true
    }
  },

  layout: ['recipients', 'text'],

  toFormData: (action: SendBroadcast) => {
    return {
      uuid: action.uuid,
      recipients: [...(action.contacts || []), ...(action.groups || [])],
      text: action.text || '',
      attachments: action.attachments || []
    };
  },

  fromFormData: (formData: FormData): SendBroadcast => {
    const recipients = formData.recipients || [];
    const contacts = recipients.filter((r: any) => !r.group);
    const groups = recipients.filter((r: any) => r.group);

    const result: SendBroadcast = {
      uuid: formData.uuid,
      type: 'send_broadcast',
      text: formData.text || '',
      contacts,
      groups,
      attachments: formData.attachments || []
    };

    // Remove empty attachments array to match original format
    if (result.attachments.length === 0) {
      delete result.attachments;
    }

    return result;
  },

  sanitize: (formData: FormData): void => {
    if (formData.text && typeof formData.text === 'string') {
      formData.text = formData.text.trim();
    }
  }
};
