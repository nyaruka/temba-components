import { html } from 'lit-html';
import { ActionConfig, COLORS } from '../types';
import { Node, CallWebhook } from '../../store/flow-definition';

const defaultPost = `@(json(object(
  "contact", object(
    "uuid", contact.uuid, 
    "name", contact.name, 
    "urn", contact.urn
  ),
  "flow", object(
    "uuid", run.flow.uuid, 
    "name", run.flow.name
  ),
  "results", foreach_value(results, extract_object, "value", "category")
)))`;

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
    method: {
      type: 'select',
      required: true,
      options: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'PATCH'],
      maxWidth: '120px',
      searchable: false
    },
    url: {
      type: 'text',
      required: true,
      evaluated: true,
      placeholder: 'https://example.com/webhook'
    },
    headers: {
      type: 'key-value',
      sortable: true,
      keyPlaceholder: 'Header name',
      valuePlaceholder: 'Header value',
      minRows: 0
    },
    body: {
      type: 'textarea',
      evaluated: true,
      placeholder: 'Request body content (JSON, XML, etc.)',
      minHeight: 200,
      dependsOn: ['method'],
      computeValue: (
        values: Record<string, any>,
        currentValue: any,
        originalValues?: Record<string, any>
      ) => {
        // Check if method is POST (handle both string and select object formats)
        const method =
          Array.isArray(values.method) && values.method.length > 0
            ? values.method[0].value || values.method[0].name
            : values.method;

        if (method === 'POST') {
          // For POST, provide the template if body is empty or was never set by user
          if (!currentValue || currentValue.trim() === '') {
            return defaultPost;
          }
        } else {
          // For non-POST methods, clear the body if it was auto-generated or empty
          // Check if the original body was empty (user never specified a body)
          const originalBody = originalValues?.body || '';
          const isOriginallyEmpty = !originalBody || originalBody.trim() === '';

          // Clear if: originally empty, contains default template, or is currently empty
          if (
            isOriginallyEmpty ||
            !currentValue ||
            currentValue.trim() === '' ||
            currentValue.trim() === defaultPost.trim()
          ) {
            return '';
          }
        }

        return currentValue; // Keep existing value if user has customized it
      }
    }
  },
  layout: [
    // Row with method and URL side by side
    { type: 'row', items: ['method', 'url'] },
    // Advanced group with nested layouts
    {
      type: 'group',
      label: 'Headers',
      items: ['headers'],
      collapsible: true,
      collapsed: true,
      helpText: 'Configure authentication or custom headers',
      getGroupValueCount: (formData: any) => {
        return formData.headers?.length + 10 || 0;
      }
    },
    {
      type: 'group',
      label: 'Body',
      items: ['body'],
      collapsible: true,
      collapsed: true,
      helpText: 'Configure the request payload',
      getGroupValueCount: (formData: any) => {
        return !!(
          formData.body &&
          formData.body.trim() !== '' &&
          formData.body !== defaultPost
        );
      }
    }
  ],
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
