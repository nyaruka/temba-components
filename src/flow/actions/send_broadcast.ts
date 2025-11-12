import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import {
  ActionConfig,
  ACTION_GROUPS,
  FormData,
  ValidationResult
} from '../types';
import { Node, SendBroadcast } from '../../store/flow-definition';
import { renderNamedObjects } from '../utils';

export const send_broadcast: ActionConfig = {
  name: 'Send Broadcast',
  group: ACTION_GROUPS.broadcast,
  render: (_node: Node, action: SendBroadcast) => {
    const hasGroups = action.groups && action.groups.length > 0;
    const hasContacts = action.contacts && action.contacts.length > 0;
    const text = action.text.replace(/\n/g, '<br>');

    return html`<div>
      <div
        style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto; margin-bottom: 0.5em"
      >
        ${unsafeHTML(text)}
      </div>
      ${hasGroups
        ? html`<div style="margin-bottom: 0.25em">
            <div style="font-weight: bold; margin-bottom: 0.25em">Groups:</div>
            ${renderNamedObjects(action.groups, 'group')}
          </div>`
        : null}
      ${hasContacts
        ? html`<div>
            <div style="font-weight: bold; margin-bottom: 0.25em">
              Contacts:
            </div>
            ${renderNamedObjects(action.contacts, 'contact')}
          </div>`
        : null}
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
  },

  validate: (action: SendBroadcast): ValidationResult => {
    const errors: { [key: string]: string } = {};

    // Validate recipients
    const hasGroups = action.groups && action.groups.length > 0;
    const hasContacts = action.contacts && action.contacts.length > 0;
    if (!hasGroups && !hasContacts) {
      errors.recipients = 'At least one contact or group must be selected';
    }

    // Validate message text
    if (!action.text || action.text.trim() === '') {
      errors.text = 'Message text is required';
    }

    // Validate attachment count
    const attachments = action.attachments || [];
    if (attachments.length > 10) {
      errors.text = 'Each broadcast can only have up to 10 attachments';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
};
