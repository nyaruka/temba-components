import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import {
  AddToGroupSpec,
  CallWebhookSpec,
  NamedObjectSpec,
  NodeSpec,
  SendMsgSpec,
  SetContactNameSpec,
  SetRunResultSpec
} from './interfaces';

const renderNamedObjects = (assets: NamedObjectSpec[], icon?: string) => {
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

export const renderSendMsg = (node: NodeSpec, action: SendMsgSpec) => {
  action.text = action.text.replace(/\n/g, '<br>');
  return html`
    ${unsafeHTML(action.text)}
    ${action.quick_replies.length > 0
      ? html`<div class="quick-replies">
          ${action.quick_replies.map((reply) => {
            return html`<div class="quick-reply">${reply}</div>`;
          })}
        </div>`
      : null}
  `;
};

export const renderSetContactName = (
  node: NodeSpec,
  action: SetContactNameSpec
) => {
  if (action.type === 'set_contact_name') {
    return html`<div>Set contact name to <b>${action.name}</b></div>`;
  }
  return html`<div>${JSON.stringify(action, null, 2)}</div>`;
};

export const renderSetRunResult = (
  node: NodeSpec,
  action: SetRunResultSpec
) => {
  return html`<div>Save ${action.value} as <b>${action.name}</b></div>`;
};

export const renderCallWebhook = (node: NodeSpec, action: CallWebhookSpec) => {
  return html`<div style="word-break: break-all">${action.url}</div>`;
};

export const renderAddToGroups = (node: NodeSpec, action: AddToGroupSpec) => {
  return html` <div>${renderNamedObjects(action.groups, 'group')}</div>`;
};
