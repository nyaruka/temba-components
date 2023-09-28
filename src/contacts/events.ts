import { css, html, TemplateResult } from 'lit';
import { Msg, ObjectReference, User } from '../interfaces';
import {
  getClasses,
  NamedObject,
  oxford,
  oxfordFn,
  oxfordNamed,
  renderAvatar,
} from '../utils';
import { Icon } from '../vectoricon';
import { getDisplayName } from './helpers';

export const getEventStyles = () => {
  return css`
    .grouping {
      margin-top: 1em;
    }

    .grouping.verbose {
      background: #f9f9f9;
      color: var(--color-dark);
      --color-link-primary: rgba(38, 166, 230, 1);
      pointer-events: none;
      background: #fefefe;
      box-shadow: -8px 0px 8px 1px rgba(0, 0, 0, 0.05) inset;
      margin-right: -16px;
      padding-right: 16px;
      margin-bottom: 1.3em;
      max-width: 100%;
    }

    .grouping .items {
      display: block;
    }

    .grouping.verbose .items {
      opacity: 0;
      max-height: 0;
      display: flex;
      flex-direction: column;
      user-select: none;
    }

    .grouping.flows .items {
      padding: 0;
    }

    .grouping.messages .items {
      display: flex;
      flex-direction: column;
      margin: 0em 0.75em;
    }

    .grouping.verbose.expanded .items {
      transition: max-height var(--transition-speed) ease-in-out,
        opacity var(--transition-speed) ease-in-out;
      opacity: 1;
      max-height: 1000px;
      padding: 1em 1em;
    }

    .grouping.verbose.expanded {
      border-top: 1px solid #f3f3f3;
      border-bottom: 1px solid #f3f3f3;
    }

    .grouping.verbose.expanded,
    .grouping.verbose .event-count {
      pointer-events: auto;
    }

    .grouping.verbose temba-icon {
    }

    .grouping.verbose > .event,
    .grouping.verbose > pre {
      max-height: 0px;
      padding-top: 0;
      padding-bottom: 0;
      margin-top: 0;
      margin-bottom: 0;
      opacity: 0;
    }

    .grouping.verbose .attn {
      color: #666;
    }

    .event-count {
      position: relative;
      font-size: 0.8em;
      text-align: center;
      margin: 0 auto;
      display: table;
      padding: 3px 10px;
      font-weight: 400;
      color: #999;
      cursor: pointer;
      width: 100%;
      opacity: 1;
      z-index: 1;
    }

    .event-count temba-icon {
      display: inline-block;
      position: absolute;
      right: 5px;
      top: 5px;
    }

    .event-count:hover {
      color: var(--color-link-primary-hover);
    }

    .expanded .event-count {
      padding: 0;
      pointer-events: none;
    }

    .grouping.flows {
      margin-left: 1em;
      margin-right: 1em;
      margin-bottom: 1.5em;

      border: 1px solid #f2f2f2;
      border-radius: var(--curvature);
      padding: 0.5em 1em;
    }

    .grouping.flows .event {
      margin: 0;
      padding: 0;
    }

    .grouping.tickets {
      margin-bottom: 2em;
    }

    pre {
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .grouping.verbose.expanded .event,
    .grouping.verbose.expanded pre {
      max-height: 500px;
      opacity: 1;
    }

    .grouping-close-button {
      position: relative;
      display: inline-block;
      opacity: 0;
      float: right;
      --icon-color: #666;
    }

    .grouping.verbose.expanded:hover .grouping-close-button {
      opacity: 1;
    }

    .grouping.messages,
    .grouping.tickets {
      display: flex;
      flex-direction: column;
    }

    .event {
      margin: 0.25em 0.5em;
      border-radius: var(--curvature);
      flex-grow: 1;
    }

    .msg {
      border-radius: calc(var(--curvature) * 2.5);
      border: 2px solid rgba(100, 100, 100, 0.1);
      max-width: 300px;
      word-break: break-word;
      overflow: hidden;
    }

    .msg.attachments-1.no-message {
      border: 2px solid transparent;
      background-color: transparent !important;
    }

    .msg .text {
      padding: var(--event-padding);
    }

    .event.msg_received .msg {
      background: rgba(200, 200, 200, 0.1);
    }

    .event.msg_created,
    .event.broadcast_created,
    .event.ivr_created,
    .event.ticket_note_added {
      align-self: flex-end;
    }

    .event.msg_created .msg,
    .event.broadcast_created .msg,
    .event.ivr_created .msg {
      background: var(--color-primary-dark);
      color: white;
      font-weight: 400;
    }

    .msg.automated {
      background: var(--color-automated) !important;
    }

    .optin_requested {
      --icon-color: var(--color-primary-dark);
    }

    .webhook_called {
      --icon-color: #e68628;
      word-break: break-all;
    }

    .webhook_called .failed {
      --icon-color: var(--color-error);
      color: var(--color-error);
    }

    .input_labels_added,
    .contact_name_changed,
    .contact_field_changed,
    .contact_urns_changed,
    .contact_language_changed,
    .run_result_changed {
      --icon-color: rgba(1, 193, 175, 1);
    }

    .email_sent {
      --icon-color: #8e5ea7;
    }

    .contact_groups_changed .added {
      --icon-color: #309c42;
    }
    .contact_groups_changed .removed {
      --icon-color: var(--color-error);
    }

    .event.error .description,
    .event.failure .description {
      color: var(--color-error);
    }

    .description.error {
      color: var(--color-error);
    }

    .info {
      border: 1px solid rgba(100, 100, 100, 0.2);
      background: rgba(10, 10, 10, 0.02);
    }

    .ticket_note_added {
      max-width: 300px;
    }

    .note-summary {
      display: flex;
      flex-direction: row;
      font-size: 85%;
      margin-top: -0.5em;
      color: rgba(0, 0, 0, 0.6);
      padding: 8px 3px;
    }

    .ticket_note_added .description {
      border: 2px solid rgba(100, 100, 100, 0.1);
      background: rgb(255, 249, 194);
      padding: var(--event-padding);
      font-weight: 400;
      color: rgba(0, 0, 0, 0.6);
      border-radius: calc(var(--curvature) * 2.5);
    }

    .channel_event {
      --icon-color: rgb(200, 200, 200);
    }

    .airtime_transferred,
    .flow_exited,
    .flow_entered,
    .ticket_opened,
    .ticket_reopened,
    .ticket_closed,
    .call_started,
    .campaign_fired {
      --icon-color: rgba(223, 65, 159, 1);
    }

    .active-ticket.ticket_opened {
      padding: 0em 1em;
    }

    .ticket_closed .inactive .subtext {
      display: none;
    }

    .attn {
      color: var(--color-text);
    }

    .flow_exited,
    .flow_entered {
      align-self: center;
      max-width: 80%;
      display: flex;
      flex-direction: row;
    }

    .flow_exited temba-icon,
    .flow_entered temba-icon {
    }

    .event {
      display: flex;
      align-items: center;
    }

    .event .description {
      flex-grow: 1;
    }

    .msg-summary {
      display: flex;
      font-size: 85%;
      color: rgba(0, 0, 0, 0.6);
      padding: 6px 3px;
      margin-bottom: 0.5em;
      margin-top: -0.5em;
    }

    .msg-summary temba-icon.log {
      --icon-color: rgba(0, 0, 0, 0.2);
    }

    .msg-summary temba-icon.log:hover {
      --icon-color: var(--color-link-primary-hover);
      cursor: pointer;
    }

    .msg-summary temba-icon.error {
      --icon-color: rgba(var(--error-rgb), 0.75);
    }

    .msg-summary temba-icon.error:hover {
      --icon-color: var(--color-error);
      cursor: pointer;
    }

    .msg-summary temba-icon.broadcast {
      --icon-color: rgba(90, 90, 90, 0.5);
    }

    .msg-summary * {
      display: flex;
      margin-right: 1px;
      margin-left: 1px;
    }

    .unsupported {
      border: 1px solid #f2f2f2;
      color: #999;
      padding: 0.5em 1em;
      border-radius: var(--curvature);
    }

    .optin {
      align-items: center;
      padding: 0 0.2em;
    }

    .time {
      padding: 0.3em 1px;
    }

    .subtext .time {
      padding: 0em;
    }

    .status {
      padding: 0.3em 3px;
    }

    .separator {
      padding: 0.3em 0px;
    }

    .recipients {
      padding: 0.3em 3px;
    }

    .verbose temba-icon,
    .flows temba-icon,
    .tickets temba-icon {
      margin-right: 0.75em;
    }

    .attn {
      display: inline-block;
      font-weight: 500;
      margin: 0px 2px;
      word-break: break-all;
      white-space: break-spaces;
    }

    .subtext {
      font-size: 80%;
    }

    .body-pre {
      white-space: pre-wrap;
      word-wrap: break-word;
      font-size: 90%;
    }

    a,
    .linked {
      color: var(--color-link-primary);
      cursor: pointer;
    }

    a:hover,
    .linked:hover {
      text-decoration: underline;
      color: var(--color-link-primary-hover);
    }

    temba-icon.error {
      --icon-color: var(--color-error);
    }

    .delivery-error {
      --icon-color: var(--color-error);
      margin-right: 0.25em;
    }

    .flow {
      --icon-color: #ddd;
      background: #fff;
      width: 18px;
      height: 18px;
      padding-top: 4px;
      padding-left: 9px;
      border: 0px solid #f3f3f3;
    }

    .assigned {
      color: #777;
      max-width: 300px;
      margin-left: auto;
      margin-right: auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 10px;
    }

    .assigned .attn {
      color: #777;
    }

    .attachments {
      display: flex;
      flex-wrap: wrap;
      margin: -0.2em;
    }

    .attachment {
      flex: 1 0 45%;
      border-top: 0.05em solid transparent;
      border-left: 0.05em solid transparent;
      margin-top: 0.05em;
      margin-left: 0.05em;
    }
  `;
};

export interface EventGroup {
  type: string;
  events: ContactEvent[];
  open: boolean;
}

export enum Events {
  MESSAGE_CREATED = 'msg_created',
  MESSAGE_RECEIVED = 'msg_received',
  BROADCAST_CREATED = 'broadcast_created',
  IVR_CREATED = 'ivr_created',
  FLOW_ENTERED = 'flow_entered',
  FLOW_EXITED = 'flow_exited',
  RUN_RESULT_CHANGED = 'run_result_changed',
  CONTACT_FIELD_CHANGED = 'contact_field_changed',
  CONTACT_GROUPS_CHANGED = 'contact_groups_changed',
  CONTACT_NAME_CHANGED = 'contact_name_changed',
  CONTACT_URNS_CHANGED = 'contact_urns_changed',
  CAMPAIGN_FIRED = 'campaign_fired',
  CHANNEL_EVENT = 'channel_event',
  CONTACT_LANGUAGE_CHANGED = 'contact_language_changed',
  WEBHOOK_CALLED = 'webhook_called',
  AIRTIME_TRANSFERRED = 'airtime_transferred',
  CALL_STARTED = 'call_started',
  EMAIL_SENT = 'email_sent',
  INPUT_LABELS_ADDED = 'input_labels_added',
  NOTE_CREATED = 'note_created',
  TICKET_ASSIGNED = 'ticket_assigned',
  TICKET_NOTE_ADDED = 'ticket_note_added',
  TICKET_CLOSED = 'ticket_closed',
  TICKET_OPENED = 'ticket_opened',
  TICKET_REOPENED = 'ticket_reopened',
  OPTIN_REQUESTED = 'optin_requested',
  ERROR = 'error',
  FAILURE = 'failure',
}

export interface ContactEvent {
  type: string;
  created_on: string;
}

export interface ChannelEvent extends ContactEvent {
  channel_event_type: string;
  duration: number;

  event: {
    type: string;
    channel: { uuid: string; name: string };
    duration?: number;
    optin?: {
      uuid: string;
      name: string;
    };
  };
}

export interface ContactLanguageChangedEvent extends ContactEvent {
  language: string;
  step_uuid: string;
  session_uuid: string;
}

export interface OptinRequestedEvent extends ContactEvent {
  optin: {
    uuid: string;
    name: string;
  };
}

export interface MsgEvent extends ContactEvent {
  msg: Msg;
  status: string;
  failed_reason?: string;
  failed_reason_display?: string;
  logs_url: string;
  msg_type: string;
  recipient_count?: number;
  created_by?: User;
  optin?: ObjectReference;
}

export interface FlowEvent extends ContactEvent {
  flow: ObjectReference;
  status: string;
}

export interface EmailSentEvent extends ContactEvent {
  to: string[];
  subject: string;
  body: string;
}

export interface URNsChangedEvent extends ContactEvent {
  urns: string[];
}

export interface TicketEvent extends ContactEvent {
  note?: string;
  assignee?: User;
  ticket: {
    uuid: string;
    ticketer: ObjectReference;
    body: string;
    topic?: ObjectReference;
    external_id?: string;
    closed_on?: string;
    opened_on?: string;
  };
  created_by?: User;
}

export interface LabelsAddedEvent extends ContactEvent {
  labels: ObjectReference[];
}

export interface NameChangedEvent extends ContactEvent {
  name: string;
}

export interface UpdateFieldEvent extends ContactEvent {
  field: { key: string; name: string };
  value: { text: string };
}

export interface ErrorMessageEvent extends ContactEvent {
  text: string;
}

export interface UpdateResultEvent extends ContactEvent {
  name: string;
  value: string;
  category: string;
  input: string;
}

export interface ContactGroupsEvent extends ContactEvent {
  groups_added: ObjectReference[];
  groups_removed: ObjectReference[];
}

export interface WebhookEvent extends ContactEvent {
  status: string;
  status_code: number;
  elapsed_ms: number;
  logs_url: string;
  url: string;
}

export interface AirtimeTransferredEvent extends ContactEvent {
  sender: string;
  recipient: string;
  currency: string;
  desired_amount: string;
  actual_amount: string;
  logs_url: string;
}

export type CallStartedEvent = ContactEvent;
export interface CampaignFiredEvent extends ContactEvent {
  campaign: { uuid: string; id: number; name: string };
  campaign_event: {
    id: number;
    offset_display: string;
    relative_to: { key: string; name: string };
  };
  fired_result: string;
}

export interface ContactHistoryPage {
  has_older: boolean;
  recent_only: boolean;
  next_before: number;
  next_after: number;
  start_date: Date;
  events: ContactEvent[];
}

export const getEventGroupType = (event: ContactEvent, ticket: string) => {
  if (!event) {
    return 'messages';
  }

  switch (event.type) {
    case Events.TICKET_ASSIGNED:
    case Events.TICKET_OPENED:
    case Events.TICKET_CLOSED:
    case Events.TICKET_REOPENED:
      if (!ticket) {
        return 'verbose';
      }

      if ((event as TicketEvent).ticket.uuid === ticket) {
        return 'tickets';
      }

      break;
    case Events.FLOW_ENTERED:
    case Events.FLOW_EXITED:
      return 'flows';
    case Events.BROADCAST_CREATED:
    case Events.MESSAGE_CREATED:
    case Events.MESSAGE_RECEIVED:
    case Events.IVR_CREATED:
    case Events.TICKET_NOTE_ADDED:
    case Events.NOTE_CREATED:
      return 'messages';
  }
  return 'verbose';
};

export const renderUserAvatar = (user: User) => {
  return html`<div style="width:3.5em;font-size:0.8em">
    ${renderAvatar({ user, position: 'left' })}
  </div>`;
};

export const renderAttachment = (attachment: string): TemplateResult => {
  const idx = attachment.indexOf(':');
  const attType = attachment.substr(0, idx);
  const url = attachment.substr(idx + 1);
  const [mediaType, ext] = attType.split('/', 2);

  let inner = null;
  if (mediaType === 'image') {
    inner = html`
      <img src="${url}" style="height:auto;width:100%;display:block;" />
    `;
  } else if (ext === 'pdf') {
    return html`<div
      style="width:100%;height:300px;border-radius:calc(var(--curvature) * 2.5);box-shadow:0px 0px 12px 0px rgba(0,0,0,.1), 0px 0px 2px 0px rgba(0,0,0,.15);overflow:hidden"
    ><embed src="${url}#view=Fit" type="application/pdf" frameBorder="0" scrolling="auto" height="100%" width="100%"></embed></div>`;
  } else if (mediaType === 'video') {
    return html`<video
      style="border-radius:var(--curvature);box-shadow:0px 0px 12px 0px rgba(0,0,0,.1), 0px 0px 2px 0px rgba(0,0,0,.15);max-width:400px"
      height="auto"
      controls
    >
      <source src="${url}" type="video/mp4" />
    </video> `;
  } else if (mediaType === 'audio') {
    return html`<audio
      style="border-radius: 99px; box-shadow:0px 0px 12px 0px rgba(0,0,0,.1), 0px 0px 2px 0px rgba(0,0,0,.15);"
      src="${url}"
      type="${attType}"
      controls
    >
      <a target="_" href="${url}">${url}</a>
    </audio>`;
  } else if (attType === 'geo') {
    const [lat, long] = url.split(',');
    const latFloat = parseFloat(lat);
    const longFloat = parseFloat(long);
    const geo = `${lat}000000%2C${long}000000`;

    return html` <iframe
      style="border-radius: var(--curvature);box-shadow:0px 0px 12px 0px rgba(0,0,0,.1), 0px 0px 2px 0px rgba(0,0,0,.15);"
      width="300"
      height="300"
      frameborder="0"
      scrolling="no"
      marginheight="0"
      marginwidth="0"
      src="https://www.openstreetmap.org/export/embed.html?bbox=${longFloat -
      0.005}000000%2C${latFloat - 0.005}%2C${longFloat +
      0.005}000000%2C${latFloat +
      0.005}000000&amp;layer=mapnik&amp;marker=${geo}"
    ></iframe>`;
  } else {
    return html`<div style="display:flex">
      <temba-icon name="${Icon.download}"></temba-icon>
      <div>Attachment ${ext}</div>
    </div>`;
  }

  return html`<div style="">${inner}</div>`;
};

export const renderMsgEvent = (
  event: MsgEvent,
  agent: string
): TemplateResult => {
  const isInbound = event.type === Events.MESSAGE_RECEIVED;
  const isError = event.status === 'E';
  const isFailure = event.status === 'F';

  // summary items which appear under the message bubble
  const summary: TemplateResult[] = [];

  if (event.logs_url) {
    summary.push(html` <div class="icon-link">
      <temba-icon
        onclick="goto(event)"
        href="${event.logs_url}"
        name="${Icon.log}"
        class="log ${isError || isFailure ? 'error' : ''}"
      ></temba-icon>
    </div>`);
  } else if (isError) {
    summary.push(
      html`<temba-icon
        title="Message delivery error"
        name="${Icon.error}"
        class="delivery-error"
      ></temba-icon>`
    );
  } else if (isFailure) {
    summary.push(
      html`<temba-icon
        title="Message delivery failure: ${event.failed_reason_display}"
        name="${Icon.error}"
        class="delivery-error"
      ></temba-icon>`
    );
  }

  if (event.type == 'broadcast_created') {
    summary.push(html`<temba-icon
      size="1"
      class="broadcast"
      name="${Icon.broadcast}"
    ></temba-icon>`);

    if (event.recipient_count > 1) {
      summary.push(
        html`<div class="recipients">${event.recipient_count} contacts</div>`
      );
    }
    summary.push(html`<div class="separator">•</div>`);
  }

  if (event.optin) {
    summary.push(
      html`<div class="optin">${event.optin.name}</div>
        <div class="separator">•</div>`
    );
  }

  summary.push(
    html`<temba-date
      class="time"
      value="${event.created_on}"
      display="duration"
    ></temba-date>`
  );

  return html`<div style="display:flex;align-items:flex-start">
    <div style="display:flex;flex-direction:column">
      <div
        class="${event.msg.text ? '' : 'no-message'} attachments-${(
          event.msg.attachments || []
        ).length} ${getClasses({
          msg: true,
          automated: !isInbound && !event.created_by,
        })}"
      >
        ${event.msg.text
          ? html` <div class="text">${event.msg.text}</div> `
          : null}
        ${event.msg.attachments
          ? html`<div class="attachments">
              ${event.msg.attachments.map(
                attachment =>
                  html` <div class="attachment">
                    ${renderAttachment(attachment)}
                  </div>`
              )}
            </div> `
          : null}
      </div>

      ${!event.msg.text && !event.msg.attachments && !event.optin
        ? html`<div class="unsupported">Unsupported Message</div>`
        : null}

      <div
        class="msg-summary"
        style="flex-direction:row${isInbound ? '-reverse' : ''}"
      >
        <div style="flex-grow:1"></div>
        ${summary}
      </div>
    </div>

    ${!isInbound && event.created_by
      ? html`<div style="margin-left:0.8em;margin-top:0.3em;font-size:0.9em">
          ${renderUserAvatar(event.created_by)}
        </div>`
      : null}
  </div>`;
};

export const renderFlowEvent = (event: FlowEvent): TemplateResult => {
  let verb = 'Interrupted';
  let icon = Icon.flow_interrupted;

  if (event.status !== 'I') {
    if (event.type === Events.FLOW_ENTERED) {
      verb = 'Started';
      icon = Icon.flow;
    } else {
      verb = 'Completed';
      icon = Icon.flow;
    }
  }

  return html`
    <temba-icon name="${icon}"></temba-icon>
    <div class="description">
      ${verb}
      <span
        class="linked"
        href="/flow/editor/${event.flow.uuid}/"
        onclick="goto(event)"
      >
        ${event.flow.name}
      </span>
    </div>
  `;
};

export const renderResultEvent = (event: UpdateResultEvent): TemplateResult => {
  if (event.name.startsWith('_')) {
    return null;
  }
  return html`
    <temba-icon name="${Icon.updated}"></temba-icon>
    <div class="description">
      Updated
      <div class="attn">${event.name}</div>
      to
      <div class="attn">${event.value}</div>
      ${event.category
        ? html`with category
            <div class="attn">${event.category}</div>`
        : null}
    </div>
  `;
};

export const renderUpdateEvent = (event: UpdateFieldEvent): TemplateResult => {
  return html`
    <temba-icon name="${Icon.contact_updated}"></temba-icon>
    <div class="description">
      ${event.value
        ? html`Updated
            <div class="attn">${event.field.name}</div>
            to
            <div class="attn">${event.value.text}</div>`
        : html`Cleared
            <div class="attn">${event.field.name}</div>`}
    </div>
  `;
};

export const renderNameChanged = (event: NameChangedEvent): TemplateResult => {
  return html`
    <temba-icon name="${Icon.contact_updated}"></temba-icon>
    <div class="description">
      Updated
      <div class="attn">Name</div>
      to
      <div class="attn">${event.name}</div>
    </div>
  `;
};

export const renderContactURNsChanged = (
  event: URNsChangedEvent
): TemplateResult => {
  return html`
    <temba-icon name="${Icon.contact_updated}"></temba-icon>
    <div class="description">
      Updated
      <div class="attn">URNs</div>
      to
        ${oxfordFn(
          event.urns,
          (urn: string) =>
            html`<div class="attn">${urn.split(':')[1].split('?')[0]}</div>`
        )}
      </div>
    </div>
  `;
};

export const renderEmailSent = (event: EmailSentEvent): TemplateResult => {
  return html`
    <temba-icon name="${Icon.email}"></temba-icon>
    <div class="description">
      Email sent to
      <div class="attn">${oxford(event.to, 'and')}</div>
      with subject
      <div class="attn">${event.subject}</div>
    </div>
  `;
};

export const renderLabelsAdded = (event: LabelsAddedEvent): TemplateResult => {
  return html`
    <temba-icon name="${Icon.label}"></temba-icon>
    <div class="description">
      Message labeled with
      <div class="attn">${oxfordNamed(event.labels, 'and')}</div>
    </div>
  `;
};

export const renderNoteCreated = (event: TicketEvent): TemplateResult => {
  return html` <div style="display:flex;align-items:flex-start">
    <div style="display:flex;flex-direction:column">
      <div class="description">${event.note}</div>
      <div class="note-summary">
        <div style="flex-grow:1"></div>
        <temba-date
          class="time"
          value="${event.created_on}"
          display="duration"
        ></temba-date>
      </div>
    </div>
    <div style="margin-left:0.8em;margin-top:0.3em;font-size:0.8em">
      ${renderUserAvatar(event.created_by)}
    </div>
  </div>`;
};

const getTicketIcon = (event: TicketEvent) => {
  let icon = Icon.inbox;
  if (event.ticket.ticketer.name.indexOf('Email') > -1) {
    icon = Icon.email;
  } else if (event.ticket.ticketer.name.indexOf('Zendesk') > -1) {
    icon = Icon.zendesk;
  }
  return icon;
};

export const renderTicketAction = (
  event: TicketEvent,
  action: string,
  grouped: boolean
): TemplateResult => {
  const reopened = new Date(event.created_on);
  const icon = getTicketIcon(event);
  if (grouped) {
    return html`<div class="" style="display: flex">
      <temba-icon name="${icon}"></temba-icon>
      <div class="description">
        ${getDisplayName(event.created_by)} ${action} a
        <span
          onclick="goto(event)"
          class="linked"
          href="/ticket/all/open/${event.ticket.uuid}/"
        >
          ticket
        </span>
      </div>
    </div>`;
  }

  return html`
    <div class="assigned active">
      <div style="text-align:center">
        ${event.created_by
          ? html` ${getDisplayName(event.created_by)} ${action} this ticket `
          : html` This ticket was ${action} `}
      </div>
      <div class="subtext" style="justify-content:center">
        <temba-date
          class="time"
          value="${event.created_on}"
          display="duration"
        ></temba-date>
      </div>
    </div>
  `;
};

export const renderTicketAssigned = (event: TicketEvent): TemplateResult => {
  return html`
    <div class="assigned active">
      <div style="text-align:center">
        ${event.assignee
          ? event.assignee.id === event.created_by.id
            ? html`${getDisplayName(event.created_by)} took this ticket`
            : html`${getDisplayName(event.created_by)} assigned this ticket to
                <div class="attn">${getDisplayName(event.assignee)}</div>`
          : html`${getDisplayName(event.created_by)} unassigned this ticket`}
      </div>
      <div class="subtext" style="justify-content:center">
        <temba-date
          class="time"
          value="${event.created_on}"
          display="duration"
        ></temba-date>
      </div>
    </div>
  `;
};

export const renderTicketOpened = (
  event: TicketEvent,
  handleClose: (uuid: string) => void,
  grouped: boolean
): TemplateResult => {
  const icon = getTicketIcon(event);

  if (grouped) {
    return html`<div class="" style="display: flex">
      <temba-icon name="${icon}"></temba-icon>
      <div class="description">
        ${event.ticket.topic.name}
        <span
          class="linked"
          onclick="goto(event)"
          href="/ticket/all/open/${event.ticket.uuid}"
          >ticket</span
        >
        was opened
      </div>
    </div>`;
  } else {
    return html`
      <div>
        <div style="text-align:center">
          ${getDisplayName(event.created_by)} opened this ticket
        </div>
        <div class="subtext" style="justify-content:center">
          <temba-date
            class="time"
            value="${event.created_on}"
            display="duration"
          ></temba-date>
        </div>
      </div>
    `;
  }
};

export const renderErrorMessage = (
  event: ErrorMessageEvent
): TemplateResult => {
  return html`
    <temba-icon
      name="${Icon.error}"
      style="--icon-color:var(--color-error)"
    ></temba-icon>
    <div class="description">
      ${event.text}
      ${event.type === Events.FAILURE
        ? html`<div>Run ended prematurely, check the flow design.</div>`
        : null}
    </div>
  `;
};

export const renderWebhookEvent = (event: WebhookEvent): TemplateResult => {
  return html`
    <div
      class="${event.status === 'success' ? '' : 'failed'}"
      style="display: flex"
    >
      <temba-icon name="${Icon.webhook}"></temba-icon>
      <div class="description">
        ${event.status === 'success'
          ? html`Successfully called ${event.url}`
          : html`Failed to call ${event.url}`}
      </div>
    </div>
  `;
};

export const renderAirtimeTransferredEvent = (
  event: AirtimeTransferredEvent
): TemplateResult => {
  if (parseFloat(event.actual_amount) === 0) {
    return html`<temba-icon
        name="${Icon.error}"
        style="--icon-color: var(--color-error)"
      ></temba-icon>
      <div class="description error">Airtime transfer failed</div>`;
  }

  return html`<temba-icon name="${Icon.airtime}"></temba-icon>
    <div class="description">
      Transferred
      <div class="attn">${event.actual_amount} ${event.currency}</div>
      of airtime
    </div>`;
};

export const renderCallStartedEvent = (): TemplateResult => {
  return html`<temba-icon name="${Icon.call}"></temba-icon>
    <div class="description">Call Started</div>`;
};

export const renderContactLanguageChangedEvent = (
  event: ContactLanguageChangedEvent
): TemplateResult => {
  return html`<temba-icon name="${Icon.contact_updated}"></temba-icon>
    <div class="description">
      Language updated to <span class="attn">${event.language}</span>
    </div>`;
};

export const renderOptinRequested = (
  event: OptinRequestedEvent
): TemplateResult => {
  return html`<temba-icon name="${Icon.optin_requested}"></temba-icon>
    <div class="description">
      Requested opt-in for <span class="attn">${event.optin.name}</span>
    </div>`;
};

export const renderChannelEvent = (event: ChannelEvent): TemplateResult => {
  let eventMessage: string | TemplateResult = '';
  let icon = Icon.call;

  if (event.event.type === 'mt_miss') {
    eventMessage = 'Missed outgoing call';
    icon = Icon.call_missed;
  } else if (event.event.type === 'mo_miss') {
    eventMessage = 'Missed incoming call';
    icon = Icon.call_missed;
  } else if (event.event.type === 'new_conversation') {
    eventMessage = 'Started Conversation';
    icon = Icon.event;
  } else if (event.channel_event_type === 'welcome_message') {
    eventMessage = 'Welcome Message Sent';
    icon = Icon.event;
  } else if (event.event.type === 'referral') {
    eventMessage = 'Referred';
    icon = Icon.event;
  } else if (event.event.type === 'follow') {
    eventMessage = 'Followed';
    icon = Icon.event;
  } else if (event.event.type === 'stop_contact') {
    eventMessage = 'Stopped';
    icon = Icon.contact_stopped;
  } else if (event.event.type === 'mt_call') {
    eventMessage = 'Outgoing Phone Call';
  } else if (event.event.type == 'mo_call') {
    eventMessage = 'Incoming Phone call';
  } else if (event.event.type == 'optin') {
    eventMessage = html`Opted in to
      <span class="attn">${event.event.optin.name}</span>`;
    icon = Icon.optin;
  } else if (event.event.type == 'optout') {
    eventMessage = html`Opted out of
      <span class="attn">${event.event.optin.name}</span>`;
    icon = Icon.optout;
  }

  return html`<temba-icon name="${icon}"></temba-icon>
    <div class="description">${eventMessage}</div>`;
};

export const renderCampaignFiredEvent = (
  event: CampaignFiredEvent
): TemplateResult => {
  return html`<temba-icon name="${Icon.campaign}"></temba-icon>
    <div class="description">
      Campaign
      <span
        class="linked"
        onclick="goto(event, this)"
        href="/campaign/read/${event.campaign.uuid}/"
        >${event.campaign.name}</span
      >
      ${event.fired_result === 'S' ? 'skipped' : 'triggered'}
      <span
        class="linked"
        onclick="goto(event, this)"
        href="/campaignevent/read/${event.campaign.uuid}/${event.campaign_event
          .id}/"
      >
        ${event.campaign_event.offset_display}
        ${event.campaign_event.relative_to.name}</span
      >
    </div>`;
};

export const renderContactGroupsEvent = (
  event: ContactGroupsEvent
): TemplateResult => {
  const groups = event.groups_added || event.groups_removed;
  const added = !!event.groups_added;
  return html`
    <temba-icon
      name="${Icon.users}"
      class="${getClasses({ added: added, removed: !added })}"
    ></temba-icon>
    <div class="description">
      ${added ? 'Added to' : 'Removed from'}
      ${oxfordFn(
        groups,
        (group: ObjectReference) =>
          html`<span
            class="linked"
            onclick="goto(event)"
            href="/contact/filter/${group.uuid}"
            >${group.name}</span
          >`
      )}
      ${event.type === Events.FAILURE
        ? html`<div>Run ended prematurely, check the flow design.</div>`
        : null}
    </div>
  `;
};
