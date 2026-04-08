import { html } from 'lit-html';
import {
  ActionConfig,
  ACTION_GROUPS,
  FormData,
  ValidationResult,
  FlowTypes
} from '../types';
import { Node, SendEmail } from '../../store/flow-definition';
import {
  renderStringList,
  renderClamped,
  renderHighlightedText
} from '../utils';
import { Icon } from '../../Icons';

export const send_email: ActionConfig = {
  name: 'Send Email',
  group: ACTION_GROUPS.broadcast,
  flowTypes: [FlowTypes.VOICE, FlowTypes.MESSAGE, FlowTypes.BACKGROUND],
  render: (_node: Node, action: SendEmail) => {
    return html`<div>
      <div>${renderStringList(action.addresses, Icon.email, true)}</div>
      <div style="margin-top: 0.5em">
        ${renderClamped(
          renderHighlightedText(action.subject, true),
          action.subject
        )}
      </div>
    </div>`;
  },
  form: {
    addresses: {
      type: 'select',
      label: 'Recipients',
      multi: true,
      searchable: true,
      placeholder: 'Enter email addresses...',
      emails: true,
      expressions: 'session'
    },
    subject: {
      type: 'text',
      label: 'Subject',
      required: true,
      evaluated: true,
      placeholder: 'Enter email subject',
      maxLength: 1000
    },
    body: {
      type: 'textarea',
      required: true,
      evaluated: true,
      maxLength: 10000,
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
  localizable: ['subject', 'body'],
  toLocalizationFormData: (
    action: SendEmail,
    localization: Record<string, any>
  ) => {
    const formData: FormData = {
      uuid: action.uuid
    };

    if (localization.subject && Array.isArray(localization.subject)) {
      formData.subject = localization.subject[0] || '';
    } else {
      formData.subject = '';
    }

    if (localization.body && Array.isArray(localization.body)) {
      formData.body = localization.body[0] || '';
    } else {
      formData.body = '';
    }

    return formData;
  },
  fromLocalizationFormData: (formData: FormData, action: SendEmail) => {
    const localization: Record<string, any> = {};

    if (formData.subject && formData.subject.trim() !== '') {
      if (formData.subject !== action.subject) {
        localization.subject = [formData.subject];
      }
    }

    if (formData.body && formData.body.trim() !== '') {
      if (formData.body !== action.body) {
        localization.body = [formData.body];
      }
    }

    return localization;
  },
  validate: (formData: FormData): ValidationResult => {
    const errors: { [key: string]: string } = {};

    if (!formData.addresses || formData.addresses.length === 0) {
      errors.addresses = 'At least one recipient email address is required';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
};
