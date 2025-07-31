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
  SetContactChannel,
  SetContactField,
  SetContactLanguage,
  SetContactName,
  SetContactStatus,
  SetRunResult,
  StartSession,
  TransferAirtime,
  WaitForAudio,
  WaitForDigits,
  WaitForImage,
  WaitForLocation,
  WaitForMenu,
  WaitForResponse,
  WaitForVideo
} from '../store/flow-definition';
import { Icon } from '../Icons';

// URN scheme mapping for user-friendly display
const urnSchemeMap: Record<string, string> = {
  tel: 'Phone Number',
  email: 'Email',
  twitter: 'Twitter',
  facebook: 'Facebook',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  viber: 'Viber',
  line: 'Line',
  discord: 'Discord',
  slack: 'Slack',
  external: 'External ID'
};

const renderLineItem = (name: string, icon?: string) => {
  return html`<div style="display:flex;items-align:center">
    ${icon
      ? html`<temba-icon name=${icon} style="margin-right:0.5em"></temba-icon>`
      : null}
    <div
      style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;"
    >
      ${name}
    </div>
  </div>`;
};

const renderNamedObjects = (assets: NamedObject[], icon?: string) => {
  const items = [];
  const maxDisplay = 3;

  // Show up to 3 items, or all 4 if exactly 4 items
  const displayCount =
    assets.length === 4 ? 4 : Math.min(maxDisplay, assets.length);

  for (let i = 0; i < displayCount; i++) {
    const asset = assets[i];
    items.push(renderLineItem(asset.name, icon));
  }

  // Add "+X more" if there are more than 3 items (and not exactly 4)
  if (assets.length > maxDisplay && assets.length !== 4) {
    const remainingCount = assets.length - maxDisplay;
    items.push(html`<div style="display:flex;items-align:center; color: #666;">
      ${icon
        ? html`<div style="margin-right:0.5em; width: 1em;"></div>` // spacing placeholder
        : null}
      <div>+${remainingCount} more</div>
    </div>`);
  }

  return items;
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
  return html`<div
    style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;"
  >
    ${action.url}
  </div>`;
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

export const renderSetContactChannel = (
  node: Node,
  action: SetContactChannel
) => {
  return html`<div>Set contact channel to <b>${action.channel.name}</b></div>`;
};

export const renderAddContactUrn = (node: Node, action: AddContactUrn) => {
  const friendlyScheme = urnSchemeMap[action.scheme] || action.scheme;
  return html`<div
    style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;"
  >
    Add ${friendlyScheme} <b>${action.path}</b>
  </div>`;
};

export const renderSendEmail = (node: Node, action: SendEmail) => {
  const addressList = action.addresses.join(', ');
  return html`<div>
    <div
      style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;"
    >
      <b>${addressList}</b>
    </div>
    <div style="margin-top: 0.5em">
      <div
        style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;"
      >
        ${action.subject}
      </div>
      <div
        style="margin-top: 0.25em; word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;"
      >
        ${action.body}
      </div>
    </div>
  </div>`;
};

export const renderSendBroadcast = (node: Node, action: SendBroadcast) => {
  const hasGroups = action.groups && action.groups.length > 0;
  const hasContacts = action.contacts && action.contacts.length > 0;

  return html`<div>
    <div
      style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto; margin-bottom: 0.5em"
    >
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
    ${action.create_contact
      ? renderLineItem('Create contact', Icon.contact)
      : null}
    ${renderLineItem(action.flow.name, Icon.flow)}
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
    <div style="margin-top: 0.25em; display: flex; align-items: center;">
      <temba-icon name="ai" style="margin-right: 0.5em"></temba-icon>
      <span
        style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto; flex: 1;"
      >
        ${action.llm.name}
      </span>
    </div>
    <div
      style="margin-top: 0.25em; word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;"
    >
      ${action.instructions}
    </div>
  </div>`;
};

export const renderOpenTicket = (node: Node, action: OpenTicket) => {
  return html`<div>
    <div
      style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;"
    >
      ${action.body}
    </div>
    ${action.assignee
      ? html`<div
          style="margin-top: 0.25em; display: flex; align-items: center;"
        >
          <temba-icon name="user" style="margin-right: 0.5em"></temba-icon>
          <span
            style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto; flex: 1;"
          >
            ${action.assignee.name}
          </span>
        </div>`
      : null}
    ${action.topic
      ? html`<div
          style="margin-top: 0.25em; display: flex; align-items: center;"
        >
          <temba-icon name="topic" style="margin-right: 0.5em"></temba-icon>
          <span
            style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto; flex: 1;"
          >
            ${action.topic.name}
          </span>
        </div>`
      : null}
  </div>`;
};

export const renderRequestOptin = (node: Node, action: RequestOptin) => {
  return html`<div>Request opt-in for <b>${action.optin.name}</b></div>`;
};

export const renderAddInputLabels = (node: Node, action: AddInputLabels) => {
  return html`<div>${renderNamedObjects(action.labels, 'label')}</div>`;
};

export const renderSayMsg = (node: Node, action: SayMsg) => {
  return html`<div>
    <div
      style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;"
    >
      ${action.text}
    </div>
    ${action.audio_url
      ? html`<div
          style="margin-top: 0.5em; display: flex; align-items: center;"
        >
          <temba-icon name="audio" style="margin-right: 0.25em"></temba-icon>
          <span
            style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto; flex: 1;"
            >${action.audio_url}</span
          >
        </div>`
      : null}
  </div>`;
};

export const renderPlayAudio = (node: Node, action: PlayAudio) => {
  return html`<div style="display: flex; align-items: center;">
    <temba-icon name="audio" style="margin-right: 0.25em"></temba-icon>
    <span
      style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto; flex: 1;"
      >${action.audio_url}</span
    >
  </div>`;
};

export const renderWaitForResponse = (node: Node, action: WaitForResponse) => {
  return html`<div>
    Wait for message response
    ${action.timeout
      ? html`<div style="margin-top: 0.25em">
          Timeout after <b>${action.timeout}</b> seconds
        </div>`
      : null}
  </div>`;
};

export const renderWaitForMenu = (node: Node, action: WaitForMenu) => {
  return html`<div>
    Wait for menu selection: <b>${action.menu.name}</b>
    ${action.timeout
      ? html`<div style="margin-top: 0.25em">
          Timeout after <b>${action.timeout}</b> seconds
        </div>`
      : null}
  </div>`;
};

export const renderWaitForDigits = (node: Node, action: WaitForDigits) => {
  return html`<div>
    Wait for <b>${action.count}</b> digit${action.count !== 1 ? 's' : ''}
    ${action.timeout
      ? html`<div style="margin-top: 0.25em">
          Timeout after <b>${action.timeout}</b> seconds
        </div>`
      : null}
  </div>`;
};

export const renderWaitForAudio = (node: Node, action: WaitForAudio) => {
  return html`<div>
    <temba-icon name="audio" style="margin-right: 0.25em"></temba-icon>
    Wait for audio recording
    ${action.timeout
      ? html`<div style="margin-top: 0.25em">
          Timeout after <b>${action.timeout}</b> seconds
        </div>`
      : null}
  </div>`;
};

export const renderWaitForVideo = (node: Node, action: WaitForVideo) => {
  return html`<div>
    <temba-icon name="video" style="margin-right: 0.25em"></temba-icon>
    Wait for video recording
    ${action.timeout
      ? html`<div style="margin-top: 0.25em">
          Timeout after <b>${action.timeout}</b> seconds
        </div>`
      : null}
  </div>`;
};

export const renderWaitForImage = (node: Node, action: WaitForImage) => {
  return html`<div>
    <temba-icon name="image" style="margin-right: 0.25em"></temba-icon>
    Wait for image
    ${action.timeout
      ? html`<div style="margin-top: 0.25em">
          Timeout after <b>${action.timeout}</b> seconds
        </div>`
      : null}
  </div>`;
};

export const renderWaitForLocation = (node: Node, action: WaitForLocation) => {
  return html`<div>
    <temba-icon name="location" style="margin-right: 0.25em"></temba-icon>
    Wait for location
    ${action.timeout
      ? html`<div style="margin-top: 0.25em">
          Timeout after <b>${action.timeout}</b> seconds
        </div>`
      : null}
  </div>`;
};
