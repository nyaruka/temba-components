import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { ActionConfig, COLORS, ValidationResult } from '../types';
import { Node, SendMsg } from '../../store/flow-definition';
import { titleCase } from '../../utils';

export const send_msg: ActionConfig = {
  name: 'Send Message',
  color: COLORS.send,
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
      collapsed: (formData: any) => {
        // Collapse only if there are no quick replies
        return !formData.quick_replies || formData.quick_replies.length === 0;
      },
      getGroupValueCount: (formData: any) => {
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
      getGroupValueCount: (formData: any) => {
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
  fromFormData: (data: Record<string, any>) => {
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
  sanitize: (formData: any): void => {
    if (formData.text && typeof formData.text === 'string') {
      formData.text = formData.text.trim();
    }
  },
  validate: (action: SendMsg): ValidationResult => {
    const errors: { [key: string]: string } = {};

    if (!action.text || action.text.trim() === '') {
      errors.text = 'Message text is required';
    }

    const attachments = action.attachments || [];
    if (attachments.length > 10) {
      const staticAttachments = attachments.filter(
        (attachment) =>
          typeof attachment === 'string' &&
          attachment.substring(0, attachment.indexOf(':')).includes('/')
      );

      const runtimeAttachments = attachments.filter(
        (attachment) =>
          typeof attachment === 'string' &&
          !attachment.substring(0, attachment.indexOf(':')).includes('/')
      );

      if (runtimeAttachments.length > 0) {
        errors.runtime_attachments =
          'Each message can only have up to 10 attachments';
      }

      if (staticAttachments.length > 0) {
        const message = 'Each message can only have up to 10 total attachments';
        if (errors.text) {
          errors.text += ` ${message}`;
        } else {
          errors.text = message;
        }
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
};
