import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { UIConfig, COLORS, ValidationResult } from '../types';
import { Node, SendMsg } from '../../store/flow-definition';

const render = (node: Node, action: SendMsg) => {
  const text = action.text.replace(/\n/g, '<br>');
  return html`
    ${unsafeHTML(text)}
    ${action.quick_replies.length > 0
      ? html`<div class="quick-replies">
          ${action.quick_replies.map((reply) => {
            return html`<div class="quick-reply">${reply}</div>`;
          })}
        </div>`
      : null}
  `;
};

export const send_msg: UIConfig = {
  name: 'Send Message',
  color: COLORS.send,
  render,
  properties: {
    text: {
      label: 'Message Text',
      helpText:
        'Enter the message to send. You can use expressions like @contact.name',
      required: true,
      widget: {
        type: 'temba-completion',
        attributes: {
          textarea: true,
          expressions: 'session',
          minHeight: 75
        }
      }
    },
    quick_replies: {
      label: 'Quick Replies',
      helpText: 'Add quick reply options for this message',
      widget: {
        type: 'temba-select',
        attributes: {
          multi: true,
          tags: true,
          searchable: true,
          placeholder: 'Add quick replies...',
          expressions: 'session',
          nameKey: 'name',
          valueKey: 'value',
          maxItems: 10,
          maxItemsText: 'You can only add up to 10 quick replies'
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
    }
  },
  validate: (action: SendMsg): ValidationResult => {
    const errors: { [key: string]: string } = {};

    if (!action.text || action.text.trim() === '') {
      errors.text = 'Message text is required';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
};
