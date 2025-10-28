import { EDITOR_TYPES, FormData, NodeConfig } from '../types';
import { CallWebhook, Node } from '../../store/flow-definition';
import { generateUUID, createSuccessFailureRouter } from '../../utils';
import { html } from 'lit';

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

export const split_by_webhook: NodeConfig = {
  type: 'split_by_webhook',
  name: 'Call Webhook',
  editorType: EDITOR_TYPES.call,
  showAsAction: true,
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
      getGroupValueCount: (formData: FormData) => {
        return formData.headers?.length || 0;
      }
    },
    {
      type: 'group',
      label: 'Body',
      items: ['body'],
      collapsible: true,
      collapsed: true,
      helpText: 'Configure the request payload',
      getGroupValueCount: (formData: FormData) => {
        return !!(
          formData.body &&
          formData.body.trim() !== '' &&
          formData.body !== defaultPost
        );
      }
    }
  ],
  render: (node: Node) => {
    const callWebhookAction = node.actions?.find(
      (action) => action.type === 'call_webhook'
    ) as CallWebhook;
    return html`
      <div
        class="body"
        style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;"
      >
        ${callWebhookAction?.url || 'Configure webhook'}
      </div>
    `;
  },
  toFormData: (node: Node) => {
    // Extract data from the existing node structure
    const callWebhookAction = node.actions?.find(
      (action) => action.type === 'call_webhook'
    ) as any;

    return {
      uuid: node.uuid,
      method: callWebhookAction?.method || 'GET',
      url: callWebhookAction?.url || '',
      headers: callWebhookAction?.headers || [],
      body: callWebhookAction?.body || ''
    };
  },
  fromFormData: (formData: FormData, originalNode: Node): Node => {
    // Get method selection
    const methodSelection =
      Array.isArray(formData.method) && formData.method.length > 0
        ? formData.method[0]
        : { value: 'GET', name: 'GET' };

    // Find existing call_webhook action to preserve its UUID
    const existingCallWebhookAction = originalNode.actions?.find(
      (action) => action.type === 'call_webhook'
    );
    const callWebhookUuid = existingCallWebhookAction?.uuid || generateUUID();

    // Create call_webhook action
    const callWebhookAction: CallWebhook = {
      type: 'call_webhook',
      uuid: callWebhookUuid,
      method: methodSelection.value,
      url: formData.url || '',
      headers: formData.headers || [],
      body: formData.body || ''
    };

    // Create categories and exits for Success and Failure
    const existingCategories = originalNode.router?.categories || [];
    const existingExits = originalNode.exits || [];
    const existingCases = originalNode.router?.cases || [];

    const { router, exits } = createSuccessFailureRouter(
      '@webhook.status',
      {
        type: 'has_number_between',
        arguments: ['200', '299']
      },
      existingCategories,
      existingExits,
      existingCases
    );

    // Return the complete node
    return {
      uuid: originalNode.uuid,
      actions: [callWebhookAction],
      router: router,
      exits: exits
    };
  }
};
