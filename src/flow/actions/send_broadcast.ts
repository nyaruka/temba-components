import { html } from 'lit-html';
import { ActionConfig, ACTION_GROUPS, FormData, FlowTypes } from '../types';
import { Node, SendBroadcast } from '../../store/flow-definition';
import {
  renderStringList,
  renderClamped,
  renderHighlightedText
} from '../utils';
import { Icon } from '../../Icons';

export const send_broadcast: ActionConfig = {
  name: 'Send Broadcast',
  group: ACTION_GROUPS.broadcast,
  flowTypes: [FlowTypes.VOICE, FlowTypes.MESSAGE, FlowTypes.BACKGROUND],
  render: (_node: Node, action: SendBroadcast) => {
    const contacts = (action.contacts || []).map((c) => c.name);
    const groups = (action.groups || []).map((g) => g.name);

    return html`<div>
      <div>
        ${renderStringList(groups, Icon.group)}
        ${renderStringList(contacts, Icon.contacts)}
      </div>
      <div style="margin-top: 0.5em">
        ${renderClamped(renderHighlightedText(action.text, true), action.text)}
      </div>
    </div>`;
  },

  form: {
    recipients: {
      type: 'select',
      label: 'Recipients',
      helpText: 'Select the contacts or groups to receive the broadcast',
      multi: true,
      searchable: true,
      endpoint: '/contact/omnibox/?types=gc',
      queryParam: 'search',
      valueKey: 'id',
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
      recipients: [
        ...(action.contacts || []).map((c) => ({
          id: c.uuid,
          name: c.name,
          type: 'contact'
        })),
        ...(action.groups || []).map((g) => ({
          id: g.uuid,
          name: g.name,
          type: 'group'
        }))
      ],
      text: action.text || '',
      attachments: action.attachments || []
    };
  },

  fromFormData: (formData: FormData): SendBroadcast => {
    const recipients = formData.recipients || [];
    const contacts = recipients
      .filter((r: any) => r.type !== 'group')
      .map((c: any) => ({ uuid: c.id, name: c.name }));
    const groups = recipients
      .filter((r: any) => r.type === 'group')
      .map((g: any) => ({ uuid: g.id, name: g.name }));

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
