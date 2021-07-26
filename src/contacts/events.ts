import { css } from 'lit-element';
import { html, TemplateResult } from 'lit-html';
import { Msg, ObjectReference, User } from '../interfaces';
import { getClasses, oxford, oxfordFn, oxfordNamed, timeSince } from '../utils';
import { getDisplayName } from './helpers';

export const getEventStyles = () => {
  return css`
    .grouping {
      padding: 0 2em;
      margin: 0 -1em;
    }

    .grouping.verbose {
      background: #f9f9f9;
      max-height: 1px;
      border-top: 1px solid #f9f9f9;
      padding-top: 0;
      padding-bottom: 0;
      margin-top: 0;
      margin-bottom: 1.5em;
      color: #efefef;
      --color-link-primary: rgba(38, 166, 230, 1);
      pointer-events: none;
    }

    .grouping.verbose.expanded,
    .grouping.verbose .event-count {
      pointer-events: auto;
    }

    .grouping.verbose temba-icon {
      margin-top: 3px;
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
      color: #fff;
    }

    .event-count {
      position: relative;
      top: -1.2em;
      font-size: 0.8em;
      text-align: center;
      border: 2px solid #f9f9f9;
      background: #fff;
      margin: 0 auto;
      display: table;
      padding: 3px 10px;
      font-weight: 400;
      color: #777;
      border-radius: var(--curvature);
      cursor: pointer;
      min-width: 0%;
      opacity: 1;
      transition: all var(--transition-speed) ease-in, opacity 0.1ms,
        margin-top 0ms;
    }

    .closing .grouping-close-button {
      opacity: 0 !important;
      transition: none !important;
    }

    .event-count {
      z-index: 1;
      margin-bottom: 1em;
    }

    .event-count:hover {
      padding: 3px 10px;
      min-width: 50%;
      background: #f9f9f9;
      color: #333;
    }

    .expanded .event-count {
      opacity: 0;
      margin-top: -42px;
      z-index: 0;
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

    .grouping.verbose.closing {
      opacity: 0 !important;
      padding: 0 !important;
      background: #f9f9f9 !important;
      max-height: 1px !important;
      border-top: 1px solid #f9f9f9 !important;
      padding-top: 0 !important;
      padding-bottom: 0 !important;
      margin-top: 0 !important;
      margin-bottom: 0 !important;
    }

    .grouping.verbose.closing .event,
    .grouping.verbose.closing pre {
      max-height: 0px;
    }

    .grouping.verbose.expanded {
      transition: all var(--transition-speed)
          cubic-bezier(0.68, -0.55, 0.265, 1.05),
        color 0.1ms;
      background: #444;
      color: #efefef;
      max-height: 1000px;
      border-top: 1px solid #f1f1f1;
      padding: 2em;
      margin-left: 1em;
      margin-right: 1em;
      border-radius: var(--curvature);
      padding-bottom: 1em;
      box-shadow: inset 0px 11px 4px -15px #000, inset 0px -11px 4px -15px #000;
    }

    .grouping.verbose.expanded .event,
    .grouping.verbose.expanded pre {
      max-height: 500px;
      margin-bottom: 0.5em;
      opacity: 1;
      transition: all var(--transition-speed) ease-in-out;
    }

    .grouping-close-button {
      opacity: 0;
      float: right;
      margin-top: -1em !important;
      margin-right: -1em !important;
      fill: #f2f2f2;
      transition: opacity var(--transition-speed) ease-in;
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
      margin-bottom: 1em;
      border-radius: var(--curvature);
      flex-grow: 1;
    }

    .msg {
      padding: var(--event-padding);
      border-radius: 8px;
      border: 2px solid rgba(100, 100, 100, 0.1);
      max-width: 300px;
    }

    .event.msg_received .msg {
      background: rgba(200, 200, 200, 0.1);
    }

    .event.msg_created,
    .event.broadcast_created,
    .event.ivr_created,
    .tickets .event.ticket_note_added {
      align-self: flex-end;
    }

    .event.msg_created .msg,
    .event.broadcast_created .msg,
    .event.ivr_created .msg {
      background: rgb(231, 243, 255);
    }

    .webhook_called {
      fill: #e68628;
    }

    .webhook_called .failed {
      fill: var(--color-error);
      color: var(--color-error);
    }

    .input_labels_added,
    .contact_name_changed,
    .contact_field_changed,
    .contact_urns_changed,
    .contact_language_changed,
    .run_result_changed {
      fill: rgba(1, 193, 175, 1);
    }

    .email_sent {
      fill: #8e5ea7;
    }

    .contact_groups_changed .added {
      fill: #309c42;
    }
    .contact_groups_changed .removed {
      fill: var(--color-error);
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

    .tickets .ticket_note_added {
      max-width: 300px;
    }

    .tickets .note-summary {
      display: flex;
      flex-direction: row;
      line-height: 0.5;
      font-size: 80%;
      color: rgba(0, 0, 0, 0.6);
      padding: 8px 3px;
    }

    .tickets .ticket_note_added .description {
      border: 2px solid rgba(100, 100, 100, 0.1);
      background: rgb(255, 249, 194);
      padding: var(--event-padding);
      border-radius: 8px;
    }

    .channel_event {
      fill: rgb(230, 230, 230);
    }

    .airtime_transferred,
    .flow_exited,
    .flow_entered,
    .ticket_opened,
    .ticket_reopened,
    .ticket_closed,
    .call_started,
    .campaign_fired {
      fill: rgba(223, 65, 159, 1);
    }

    .ticket_opened {
      padding: 0em 1em;
    }

    .ticket_opened temba-icon.clickable[name='check'] {
      fill: rgba(100, 100, 100, 1);
    }

    .ticket_opened .active {
      color: var(--color-text);
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
      margin-top: 5px;
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
      line-height: 0.5;

      font-size: 80%;
      color: rgba(0, 0, 0, 0.6);
      padding: 6px 3px;
    }

    .msg-summary temba-icon[name='log'] {
      --icon-color: rgba(0, 0, 0, 0.2);
    }

    .msg-summary temba-icon[name='log']:hover {
      --icon-color: var(--color-link-primary-hover);
      cursor: pointer;
    }

    .msg-summary temba-icon.error[name='log'] {
      --icon-color: rgba(var(--error-rgb), 0.75);
    }

    .msg-summary temba-icon.error[name='log']:hover {
      --icon-color: var(--color-error);
      cursor: pointer;
    }

    .msg-summary temba-icon[name='megaphone'] {
      --icon-color: rgba(90, 90, 90, 0.5);
    }

    .msg-summary * {
      display: flex;
      margin-right: 1px;
      margin-left: 1px;
    }

    .time {
      padding: 0.3em 1px;
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

    temba-icon[name='check'] {
      margin-top: 3px;
    }

    .attn {
      display: inline-block;
      font-weight: 500;
      margin: 0px 2px;
    }

    .subtext {
      font-size: 80%;
    }

    .body-pre {
      white-space: pre-wrap;
      word-wrap: break-word;
      font-size: 90%;
    }

    a {
      color: var(--color-link-primary);
    }

    a:hover {
      text-decoration: underline;
      color: var(--color-link-primary-hover);
    }

    temba-icon[name='alert-triangle'] {
      --icon-color: var(--color-error);
    }

    .flow {
      fill: #ddd;
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
  `;
};

const FLOW_USER_ID = -1;

export interface EventGroup {
  type: string;
  events: ContactEvent[];
  open: boolean;
  closing: boolean;
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
}

export interface ContactLanguageChangedEvent extends ContactEvent {
  language: string;
  step_uuid: string;
  session_uuid: string;
}

export interface MsgEvent extends ContactEvent {
  msg: Msg;
  status: string;
  logs_url: string;
  msg_type: string;
  recipient_count?: number;
  created_by?: User;
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
    subject: string;
    body: string;
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
  campaign: { id: number; name: string };
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
    case Events.TICKET_NOTE_ADDED:
    case Events.TICKET_OPENED:
    case Events.TICKET_CLOSED:
    case Events.TICKET_REOPENED:
      if (!ticket || (event as TicketEvent).ticket.uuid === ticket) {
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
      return 'messages';
  }
  return 'verbose';
};

export const renderAvatar = (user: User, agent = -1) => {
  const current = user && user.id === agent;
  if (user.id === FLOW_USER_ID || !user || !user.first_name) {
    return html`<temba-tip text="Automated message" position="top"
      ><div class="avatar flow" style="margin-top:0.5em">
        <temba-icon size="1" name="activity" /></div
    ></temba-tip>`;
  } else {
    return html`<temba-tip
      text="${user.first_name + ' ' + user.last_name}"
      position="top"
    >
      <div
        class="avatar"
        style="
          border-radius: 9999px; 
          display:flex;
          align-items:center;
          border: 2px solid rgba(0,0,0,.05);
          background: ${current ? 'var(--color-primary-dark)' : '#eee'};
          color: ${current ? '#fff' : '#999'} ;
          font-weight: 400;
          padding: 0.5em;
          line-height:1.2em;
        "
      >
        ${user.first_name[0] + user.last_name[0]}
      </div>
    </temba-tip>`;
  }
};

export const renderMsgEvent = (
  event: MsgEvent,
  agent: number
): TemplateResult => {
  const isInbound = event.type === Events.MESSAGE_RECEIVED;
  const isError = event.status === 'E' || event.status === 'F';
  return html` <div style="display:flex;align-items:flex-start">
    <div style="display:flex;flex-direction:column">
      <div class="msg">${event.msg.text}</div>
      <div
        class="msg-summary"
        style="flex-direction:row${isInbound ? '-reverse' : ''}"
      >
        <div style="flex-grow:1"></div>
        ${event.logs_url
          ? html`
              <a class="icon-link" target="_logs" href="${event.logs_url}">
                <temba-icon
                  name="log"
                  class="${isError ? 'error' : ''}"
                ></temba-icon
              ></a>
            `
          : isError
          ? html`<temba-icon
              title="Message delivery error"
              name="alert-triangle"
            ></temba-icon>`
          : null}
        ${event.recipient_count > 1
          ? html`<temba-icon size="1" name="megaphone"></temba-icon>
              <div class="recipients">${event.recipient_count} contacts</div>
              <div class="separator">•</div>`
          : null}
        <div class="time">${timeSince(new Date(event.created_on))}</div>
      </div>
    </div>

    ${!isInbound
      ? html`<div style="margin-left:0.8em;margin-top:0.3em">
          ${event.msg.created_by
            ? html`<div style="font-size:0.8em">
                ${renderAvatar(event.msg.created_by, agent)}
              </div>`
            : renderAvatar({ id: FLOW_USER_ID })}
        </div>`
      : null}
  </div>`;
};

export const renderFlowEvent = (event: FlowEvent): TemplateResult => {
  let verb = 'Interrupted';
  let icon = 'x-octagon';

  if (event.status !== 'I') {
    if (event.type === Events.FLOW_ENTERED) {
      verb = 'Started';
      icon = 'flow';
    } else {
      verb = 'Completed';
      icon = 'flow';
    }
  }

  return html`
    <temba-icon name="${icon}"></temba-icon>
    <div class="description">
      ${verb}
      <a target="_" href="/flow/editor/${event.flow.uuid}/"
        >${event.flow.name}</a
      >
    </div>
  `;
};

export const renderResultEvent = (event: UpdateResultEvent): TemplateResult => {
  if (event.name.startsWith('_')) {
    return null;
  }
  return html`
    <temba-icon name="flow"></temba-icon>
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
    <temba-icon name="contact"></temba-icon>
    <div class="description">
      Updated
      <div class="attn">${event.field.name}</div>
      to
      <div class="attn">${event.value.text}</div>
    </div>
  `;
};

export const renderNameChanged = (event: NameChangedEvent): TemplateResult => {
  return html`
    <temba-icon name="contact"></temba-icon>
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
    <temba-icon name="contact"></temba-icon>
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
    <temba-icon name="mail"></temba-icon>
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
    <temba-icon name="tag"></temba-icon>
    <div class="description">
      Message labeled with
      <div class="attn">${oxfordNamed(event.labels, 'and')}</div>
    </div>
  `;
};

export const renderNoteCreated = (
  event: TicketEvent,
  agent: number
): TemplateResult => {
  return html`<div style="display:flex;align-items:flex-start">
    <div style="display:flex;flex-direction:column">
      <div class="description">${event.note}</div>
      <div class="note-summary">
        <div style="flex-grow:1"></div>
        <div class="time">${timeSince(new Date(event.created_on))}</div>
      </div>
    </div>
    <div style="margin-left:0.8em;margin-top:0.3em;font-size:0.8em">
      ${renderAvatar(event.created_by, agent)}
    </div>
  </div>`;
};

export const renderTicketClosed = (event: TicketEvent): TemplateResult => {
  const closed = new Date(event.ticket.opened_on);
  return html`
    <div class="assigned active">
      <div style="text-align:center">
        ${getDisplayName(event.created_by)} closed this ticket
      </div>
      <div class="subtext" style="justify-content:center">
        ${timeSince(closed, { hideRecentText: true, suffix: ' ago' })}
      </div>
    </div>
  `;
};

const getTicketIcon = (event: TicketEvent) => {
  let icon = 'inbox';
  if (event.ticket.ticketer.name.indexOf('Email') > -1) {
    icon = 'mail';
  } else if (event.ticket.ticketer.name.indexOf('Zendesk') > -1) {
    icon = 'zendesk';
  }
  return icon;
};

export const renderTicketAction = (
  event: TicketEvent,
  action: string
): TemplateResult => {
  const reopened = new Date(event.created_on);
  return html`
    <div class="assigned active">
      <div style="text-align:center">
        ${getDisplayName(event.created_by)} ${action} this ticket
      </div>
      <div class="subtext" style="justify-content:center">
        ${timeSince(reopened, { hideRecentText: true, suffix: ' ago' })}
      </div>
    </div>
  `;
};

export const renderTicketAssigned = (event: TicketEvent): TemplateResult => {
  const created = new Date(event.created_on);
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
        ${timeSince(created, { hideRecentText: true, suffix: ' ago' })}
      </div>
    </div>
  `;
};

export const renderTicketOpened = (
  event: TicketEvent,
  handleClose: (uuid: string) => void
): TemplateResult => {
  const icon = getTicketIcon(event);
  return html`
    <temba-icon size="1.5" name="${icon}"></temba-icon>

    <div class="active" style="flex-grow:1;">
      Opened
      <div class="attn">${event.ticket.subject}</div>
      <div class="subtext">${timeSince(new Date(event.created_on))}</div>
    </div>
    ${handleClose
      ? html`
          <temba-tip text="Resolve" position="left" style="width:1.5em">
            <temba-icon
              class="clickable"
              size="1.5"
              name="check"
              @click=${() => {
                handleClose(event.ticket.uuid);
              }}
              ?clickable=${open}
            />
          </temba-tip>
        `
      : null}
  `;
};

export const renderErrorMessage = (
  event: ErrorMessageEvent
): TemplateResult => {
  return html`
    <temba-icon
      name="alert-triangle"
      style="fill:var(--color-error)"
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
      <temba-icon name="external-link"></temba-icon>
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
        name="alert-triangle"
        style="fill:var(--color-error)"
      ></temba-icon>
      <div class="description error">Airtime transfer failed</div>`;
  }

  return html`<temba-icon name="dollar-sign"></temba-icon>
    <div class="description">
      Transferred
      <div class="attn">${event.actual_amount} ${event.currency}</div>
      of airtime
    </div>`;
};

export const renderCallStartedEvent = (): TemplateResult => {
  return html`<temba-icon name="phone"></temba-icon>
    <div class="description">Call Started</div>`;
};

export const renderContactLanguageChangedEvent = (
  event: ContactLanguageChangedEvent
): TemplateResult => {
  return html`<temba-icon name="contact"></temba-icon>
    <div class="description">Language updated to ${event.language}</div>`;
};

export const renderChannelEvent = (event: ChannelEvent): TemplateResult => {
  let eventMessage = '';
  let icon = 'phone';

  if (event.channel_event_type === 'mt_miss') {
    eventMessage = 'Missed outgoing call';
    icon = 'phone-missed';
  } else if (event.channel_event_type === 'mo_miss') {
    eventMessage = 'Missed incoming call';
    icon = 'phone-missed';
  } else if (event.channel_event_type === 'new_conversation') {
    eventMessage = 'Started Conversation';
    icon = 'zap';
  } else if (event.channel_event_type === 'welcome_message') {
    eventMessage = 'Welcome Message Sent';
    icon = 'zap';
  } else if (event.channel_event_type === 'referral') {
    eventMessage = 'Referred';
    icon = 'zap';
  } else if (event.channel_event_type === 'follow') {
    eventMessage = 'Followed';
    icon = 'zap';
  } else if (event.channel_event_type === 'stop_contact') {
    eventMessage = 'Stopped';
    icon = 'x-octagon';
  } else if (event.channel_event_type === 'mt_call') {
    eventMessage = 'Outgoing Phone Call';
  } else if (event.channel_event_type == 'mo_call') {
    eventMessage = 'Incoming Phone call';
  }

  return html`<temba-icon name="${icon}"></temba-icon>
    <div class="description">${eventMessage}</div>`;
};

export const renderCampaignFiredEvent = (
  event: CampaignFiredEvent
): TemplateResult => {
  return html`<temba-icon name="campaign"></temba-icon>
    <div class="description">
      Campaign
      <a href="/campaign/read/${event.campaign.id}" target="_"
        >${event.campaign.name}</a
      >
      ${event.fired_result === 'S' ? 'skipped' : 'triggered'}
      <a href="/campaignevent/read/${event.campaign_event.id}" target="_">
        ${event.campaign_event.offset_display}
        ${event.campaign_event.relative_to.name}</a
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
      name="users"
      class="${getClasses({ added: added, removed: !added })}"
    ></temba-icon>
    <div class="description">
      ${added ? 'Added to' : 'Removed from'}
      ${oxfordFn(
        groups,
        (group: ObjectReference) =>
          html`<a target="_" href="/contact/filter/${group.uuid}"
            >${group.name}</a
          >`
      )}
      ${event.type === Events.FAILURE
        ? html`<div>Run ended prematurely, check the flow design.</div>`
        : null}
    </div>
  `;
};
