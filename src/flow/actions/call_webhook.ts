import { html } from 'lit-html';
import { ActionConfig, COLORS } from '../types';
import { Node, CallWebhook } from '../../store/flow-definition';

export const call_webhook: ActionConfig = {
  name: 'Call Webhook',
  color: COLORS.call,
  render: (_node: Node, action: CallWebhook) => {
    return html`<div
      style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;"
    >
      ${action.url}
    </div>`;
  },
  evaluated: ['url', 'headers', 'body'], // keep for backward compatibility
  form: {
    url: {
      type: 'text',
      label: 'URL',
      required: true,
      evaluated: true,
      placeholder: 'https://example.com/webhook'
    },
    method: {
      type: 'select',
      label: 'Method',
      required: true,
      options: ['GET', 'POST', 'PUT', 'DELETE']
    },
    headers: {
      type: 'key-value',
      label: 'Headers',
      sortable: true,
      keyPlaceholder: 'Header name',
      valuePlaceholder: 'Header value',
      minRows: 0
    },
    body: {
      type: 'textarea',
      label: 'Request Body',
      evaluated: true,
      placeholder: 'Request body content (JSON, XML, etc.)',
      rows: 4
    }
  },
  toFormData: (action: CallWebhook) => {
    return {
      uuid: action.uuid,
      url: action.url || '',
      method: [{ value: action.method, name: action.method }],
      headers: action.headers || [],
      body: action.body || ''
    };
  },
  fromFormData: (data: Record<string, any>) => {
    return {
      uuid: data.uuid,
      type: 'call_webhook',
      url: data.url,
      method: data.method[0].value,
      headers: data.headers || [],
      body: data.body || ''
    } as CallWebhook;
  }
};
