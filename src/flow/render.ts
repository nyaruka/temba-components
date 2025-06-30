import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';

import {
  AddToGroup,
  CallWebhook,
  Node,
  NamedObject,
  SendMsg,
  SetContactName,
  SetRunResult
} from 'store/flow-definition';

const renderNamedObjects = (assets: NamedObject[], icon?: string) => {
  return assets.map((asset) => {
    return html`<div style="display:flex;items-align:center">
      ${icon
        ? html`<temba-icon
            name=${icon}
            style="margin-right:0.5em"
          ></temba-icon>`
        : null}
      <div>${asset.name}</div>
    </div>`;
  });
};

export const renderSendMsg = (node: Node, action: SendMsg) => {
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

export const renderSetContactName = (node: Node, action: SetContactName) => {
  return html`<div>Set contact name to <b>${action.name}</b></div>`;
};

export const renderSetRunResult = (node: Node, action: SetRunResult) => {
  return html`<div>Save ${action.value} as <b>${action.name}</b></div>`;
};

export const renderCallWebhook = (node: Node, action: CallWebhook) => {
  return html`<div style="word-break: break-all">${action.url}</div>`;
};

export const renderAddToGroups = (node: Node, action: AddToGroup) => {
  return html`<div>${renderNamedObjects(action.groups, 'group')}</div>`;
};
