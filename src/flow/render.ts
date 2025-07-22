import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';

import {
  AddContactUrn,
  AddInputLabels,
  AddToGroup,
  CallClassifier,
  CallLLM,
  CallResthook,
  CallWebhook,
  EnterFlow,
  Node,
  NamedObject,
  OpenTicket,
  PlayAudio,
  RemoveFromGroup,
  RequestOptin,
  SayMsg,
  SendBroadcast,
  SendEmail,
  SendMsg,
  SetContactField,
  SetContactLanguage,
  SetContactName,
  SetContactStatus,
  SetRunResult,
  StartSession,
  TransferAirtime
} from '../store/flow-definition';

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

export const renderRemoveFromGroups = (node: Node, action: RemoveFromGroup) => {
  return html`<div>${renderNamedObjects(action.groups, 'group')}</div>`;
};

export const renderSetContactField = (node: Node, action: SetContactField) => {
  return html`<div>
    Set <b>${action.field.name}</b> to <b>${action.value}</b>
  </div>`;
};

export const renderSetContactLanguage = (
  node: Node,
  action: SetContactLanguage
) => {
  return html`<div>Set contact language to <b>${action.language}</b></div>`;
};

export const renderSetContactStatus = (
  node: Node,
  action: SetContactStatus
) => {
  return html`<div>Set contact status to <b>${action.status}</b></div>`;
};

export const renderAddContactUrn = (node: Node, action: AddContactUrn) => {
  return html`<div>Add <b>${action.scheme}</b> URN <b>${action.path}</b></div>`;
};

export const renderSendEmail = (node: Node, action: SendEmail) => {
  const addressList = action.addresses.join(', ');
  return html`<div>
    <div>Send email to <b>${addressList}</b></div>
    <div style="margin-top: 0.5em">
      <div><b>Subject:</b> ${action.subject}</div>
      <div style="margin-top: 0.25em; word-wrap: break-word">
        ${action.body}
      </div>
    </div>
  </div>`;
};

export const renderSendBroadcast = (node: Node, action: SendBroadcast) => {
  const hasGroups = action.groups && action.groups.length > 0;
  const hasContacts = action.contacts && action.contacts.length > 0;

  return html`<div>
    <div style="word-wrap: break-word; margin-bottom: 0.5em">
      ${action.text}
    </div>
    ${hasGroups
      ? html`<div style="margin-bottom: 0.25em">
          <div style="font-weight: bold; margin-bottom: 0.25em">Groups:</div>
          ${renderNamedObjects(action.groups, 'group')}
        </div>`
      : null}
    ${hasContacts
      ? html`<div>
          <div style="font-weight: bold; margin-bottom: 0.25em">Contacts:</div>
          ${renderNamedObjects(action.contacts, 'contact')}
        </div>`
      : null}
  </div>`;
};

export const renderEnterFlow = (node: Node, action: EnterFlow) => {
  return html`<div>Enter flow <b>${action.flow.name}</b></div>`;
};

export const renderStartSession = (node: Node, action: StartSession) => {
  const hasGroups = action.groups && action.groups.length > 0;
  const hasContacts = action.contacts && action.contacts.length > 0;

  return html`<div>
    <div>Start <b>${action.flow.name}</b> for:</div>
    ${hasGroups
      ? html`<div style="margin-top: 0.5em">
          <div style="font-weight: bold; margin-bottom: 0.25em">Groups:</div>
          ${renderNamedObjects(action.groups, 'group')}
        </div>`
      : null}
    ${hasContacts
      ? html`<div style="margin-top: 0.5em">
          <div style="font-weight: bold; margin-bottom: 0.25em">Contacts:</div>
          ${renderNamedObjects(action.contacts, 'contact')}
        </div>`
      : null}
  </div>`;
};

export const renderTransferAirtime = (node: Node, action: TransferAirtime) => {
  const amounts = action.amounts.join(', ');
  return html`<div>
    Transfer airtime amounts: <b>${amounts}</b>
    <div>Save result as <b>${action.result_name}</b></div>
  </div>`;
};

export const renderCallClassifier = (node: Node, action: CallClassifier) => {
  return html`<div>
    <div>Call classifier <b>${action.classifier.name}</b></div>
    <div style="margin-top: 0.25em; word-wrap: break-word">
      Input: <b>${action.input}</b>
    </div>
    <div style="margin-top: 0.25em">
      Save result as <b>${action.result_name}</b>
    </div>
  </div>`;
};

export const renderCallResthook = (node: Node, action: CallResthook) => {
  return html`<div>
    <div>Call resthook <b>${action.resthook}</b></div>
    <div style="margin-top: 0.25em">
      Save result as <b>${action.result_name}</b>
    </div>
  </div>`;
};

export const renderCallLLM = (node: Node, action: CallLLM) => {
  return html`<div>
    <div>Call AI <b>${action.llm.name}</b></div>
    <div style="margin-top: 0.25em; word-wrap: break-word">
      Prompt: <b>${action.prompt}</b>
    </div>
    <div style="margin-top: 0.25em">
      Save result as <b>${action.result_name}</b>
    </div>
  </div>`;
};

export const renderOpenTicket = (node: Node, action: OpenTicket) => {
  return html`<div>
    <div><b>Subject:</b> ${action.subject}</div>
    <div style="margin-top: 0.25em; word-wrap: break-word">${action.body}</div>
    ${action.assignee
      ? html`<div style="margin-top: 0.25em">
          <temba-icon name="user" style="margin-right: 0.25em"></temba-icon>
          Assign to <b>${action.assignee.name}</b>
        </div>`
      : null}
    ${action.topic
      ? html`<div style="margin-top: 0.25em">
          <temba-icon name="topic" style="margin-right: 0.25em"></temba-icon>
          Topic: <b>${action.topic.name}</b>
        </div>`
      : null}
  </div>`;
};

export const renderRequestOptin = (node: Node, action: RequestOptin) => {
  return html`<div>Request opt-in for <b>${action.optin.name}</b></div>`;
};

export const renderAddInputLabels = (node: Node, action: AddInputLabels) => {
  return html`<div>
    <div style="margin-bottom: 0.25em">Add labels to input:</div>
    ${renderNamedObjects(action.labels, 'label')}
  </div>`;
};

export const renderSayMsg = (node: Node, action: SayMsg) => {
  return html`<div>
    <div style="word-wrap: break-word">${action.text}</div>
    ${action.audio_url
      ? html`<div style="margin-top: 0.5em">
          <temba-icon name="audio" style="margin-right: 0.25em"></temba-icon>
          <span style="word-break: break-all">${action.audio_url}</span>
        </div>`
      : null}
  </div>`;
};

export const renderPlayAudio = (node: Node, action: PlayAudio) => {
  return html`<div>
    <temba-icon name="audio" style="margin-right: 0.25em"></temba-icon>
    <span style="word-break: break-all">${action.audio_url}</span>
  </div>`;
};
