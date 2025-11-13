import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import {
  ActionConfig,
  ACTION_GROUPS,
  FormData,
  ValidationResult
} from '../types';
import { Node, SendMsg } from '../../store/flow-definition';
import { titleCase } from '../../utils';

export const send_msg: ActionConfig = {
  name: 'Send Message',
  group: ACTION_GROUPS.send,
  render: (_node: Node, action: SendMsg) => {
    const text = action.text.replace(/\n/g, '<br>');
    return html`
      ${unsafeHTML(text)}
      ${action.quick_replies?.length > 0
        ? html`<div class="quick-replies">
            ${action.quick_replies.map((reply) => {
              return html`<div class="quick-reply">${reply}</div>`;
            })}
            ${action.template
              ? html`<div
                  style="border: 1px solid var(--color-widget-border);padding: 0.5em;margin-top: 1em;border-radius: var(--curvature); display:flex;background: rgba(0,0,0,.03);"
                >
                  <temba-icon name="channel_wac"></temba-icon>
                  <div style="margin-left:0.5em">${action.template.name}</div>
                </div>`
              : null}
          </div>`
        : null}
    `;
  },
  form: {
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
    },
    quick_replies: {
      type: 'select',
      options: [],
      multi: true,
      tags: true,
      searchable: true,
      placeholder: 'Add quick replies...',
      maxItems: 10,
      evaluated: true
    },
    runtime_attachments: {
      type: 'array',
      helpText: 'Add dynamic attachments using expressions',
      itemLabel: 'Attachment',
      sortable: true,
      maxItems: 10,
      isEmptyItem: (item: any) => {
        return !item.expression || item.expression.trim() === '';
      },
      itemConfig: {
        type: {
          type: 'select',
          options: [
            { value: 'image', name: 'Image' },
            { value: 'audio', name: 'Audio' },
            { value: 'video', name: 'Video' },
            { value: 'document', name: 'Document' }
          ],
          required: true,
          searchable: false
        },
        expression: {
          type: 'text',
          placeholder: 'Expression (e.g. @contact.photo)',
          required: true,
          evaluated: true
        }
      }
    }
  },
  layout: [
    'text',
    {
      type: 'group',
      label: 'Quick Replies',
      items: ['quick_replies'],
      collapsible: true,
      collapsed: (formData: FormData) => {
        // Collapse only if there are no quick replies
        return !formData.quick_replies || formData.quick_replies.length === 0;
      },
      getGroupValueCount: (formData: FormData) => {
        return formData.quick_replies?.length || 0;
      }
    },
    {
      type: 'group',
      label: 'Runtime Attachments',
      items: ['runtime_attachments'],
      collapsible: true,
      collapsed: true,
      helpText: 'Add dynamic attachments that are evaluated at runtime',
      getGroupValueCount: (formData: FormData) => {
        return (
          formData.runtime_attachments?.filter(
            (item: any) =>
              item && item.expression && item.expression.trim() !== ''
          ).length || 0
        );
      }
    }
  ],
  toFormData: (action: SendMsg) => {
    // Extract runtime attachments from the text field attachments
    const runtimeAttachments: {
      type: { name: string; value: string };
      expression: string;
    }[] = [];
    const staticAttachments: string[] = [];

    if (action.attachments && Array.isArray(action.attachments)) {
      action.attachments.forEach((attachment) => {
        if (typeof attachment === 'string' && attachment.includes(':')) {
          const colonIndex = attachment.indexOf(':');
          const contentType = attachment.substring(0, colonIndex);
          const value = attachment.substring(colonIndex + 1);

          if (!contentType.includes('/')) {
            runtimeAttachments.push({
              type: { name: titleCase(contentType), value: contentType },
              expression: value
            });
          } else {
            staticAttachments.push(attachment);
          }
        }
      });
    }

    return {
      uuid: action.uuid,
      text: action.text || '',
      attachments: staticAttachments,
      runtime_attachments: runtimeAttachments,
      quick_replies: (action.quick_replies || []).map((reply) => ({
        name: reply,
        value: reply
      }))
    };
  },
  fromFormData: (data: FormData) => {
    const result = {
      uuid: data.uuid,
      type: 'send_msg',
      text: data.text || '',
      attachments: [],
      quick_replies: (data.quick_replies || []).map((reply: any) =>
        typeof reply === 'string' ? reply : reply.value || reply.name || reply
      )
    };

    // Combine static attachments from text field with runtime attachments
    const staticAttachments = data.attachments || [];
    const runtimeAttachments = (data.runtime_attachments || [])
      .filter(
        (item: {
          type: [{ name: string; value: string }];
          expression: string;
        }) => item && item.type && item.expression
      ) // Filter out invalid items
      .map(
        (item: {
          type: [{ name: string; value: string }];
          expression: string;
        }) => `${item.type[0].value}:${item.expression}`
      );

    result.attachments = [...staticAttachments, ...runtimeAttachments];

    // Remove quick_replies if empty to match original format
    if (result.quick_replies.length === 0) {
      delete (result as any).quick_replies;
    }

    return result as SendMsg;
  },
  sanitize: (formData: FormData): void => {
    if (formData.text && typeof formData.text === 'string') {
      formData.text = formData.text.trim();
    }
  },
  validate: (formData: FormData): ValidationResult => {
    const errors: { [key: string]: string } = {};

    // Check total attachment count (static + runtime should not exceed 10)
    const staticAttachments = formData.attachments || [];
    const runtimeAttachments = (formData.runtime_attachments || []).filter(
      (item: any) => item && item.expression && item.expression.trim() !== ''
    );

    const totalAttachments =
      staticAttachments.length + runtimeAttachments.length;
    if (totalAttachments > 10) {
      if (runtimeAttachments.length > 0) {
        errors.runtime_attachments =
          'Each message can only have up to 10 attachments';
      }
      if (staticAttachments.length > 0) {
        errors.text = 'Each message can only have up to 10 total attachments';
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  },
  localizable: ['text', 'quick_replies', 'attachments'],
  toLocalizationFormData: (
    action: SendMsg,
    localization: Record<string, any>
  ) => {
    // Convert localized values to form data format
    // Localized values are stored as arrays even for single values
    const formData: FormData = {
      uuid: action.uuid
    };

    // Handle text (single value, but stored as array in localization)
    if (localization.text && Array.isArray(localization.text)) {
      formData.text = localization.text[0] || '';
    } else {
      // Fall back to empty string if no localization
      formData.text = '';
    }

    // Handle attachments (already an array)
    if (localization.attachments && Array.isArray(localization.attachments)) {
      formData.attachments = localization.attachments;
    }

    // Handle quick_replies (already an array)
    if (
      localization.quick_replies &&
      Array.isArray(localization.quick_replies)
    ) {
      formData.quick_replies = localization.quick_replies.map((reply) => ({
        name: reply,
        value: reply
      }));
    }

    // Extract runtime attachments from localized attachments
    const runtimeAttachments: {
      type: { name: string; value: string };
      expression: string;
    }[] = [];
    const staticAttachments: string[] = [];

    if (formData.attachments && Array.isArray(formData.attachments)) {
      formData.attachments.forEach((attachment) => {
        if (typeof attachment === 'string' && attachment.includes(':')) {
          const colonIndex = attachment.indexOf(':');
          const contentType = attachment.substring(0, colonIndex);
          const value = attachment.substring(colonIndex + 1);

          if (!contentType.includes('/')) {
            runtimeAttachments.push({
              type: { name: titleCase(contentType), value: contentType },
              expression: value
            });
          } else {
            staticAttachments.push(attachment);
          }
        }
      });
    }

    formData.attachments = staticAttachments;
    formData.runtime_attachments = runtimeAttachments;

    return formData;
  },
  fromLocalizationFormData: (formData: FormData, action: SendMsg) => {
    // Convert form data to localization format
    // All values must be stored as arrays
    const localization: Record<string, any> = {};

    // Handle text (store as single-element array)
    if (formData.text !== undefined && formData.text !== action.text) {
      localization.text = [formData.text];
    }

    // Handle quick_replies (store as array)
    const quickReplies = (formData.quick_replies || []).map((reply: any) =>
      typeof reply === 'string' ? reply : reply.value || reply.name || reply
    );

    // Only save if different from base action or if there are quick replies
    if (
      quickReplies.length > 0 &&
      JSON.stringify(quickReplies) !==
        JSON.stringify(action.quick_replies || [])
    ) {
      localization.quick_replies = quickReplies;
    }

    // Handle attachments (combine static and runtime attachments)
    const staticAttachments = formData.attachments || [];
    const runtimeAttachments = (formData.runtime_attachments || [])
      .filter(
        (item: {
          type: [{ name: string; value: string }];
          expression: string;
        }) => item && item.type && item.expression
      )
      .map(
        (item: {
          type: [{ name: string; value: string }];
          expression: string;
        }) => `${item.type[0].value}:${item.expression}`
      );

    const allAttachments = [...staticAttachments, ...runtimeAttachments];

    // Only save if different from base action or if there are attachments
    if (
      allAttachments.length > 0 &&
      JSON.stringify(allAttachments) !==
        JSON.stringify(action.attachments || [])
    ) {
      localization.attachments = allAttachments;
    }

    return localization;
  }
};
