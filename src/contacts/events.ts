import { css } from 'lit-element';
import { html, TemplateResult } from 'lit-html';
import { Msg, ObjectReference, Ticket } from '../interfaces';
import { getClasses, oxford, oxfordFn, oxfordNamed, timeSince } from '../utils';

export const getEventStyles = () => {
  return css`
    .grouping {
      padding: 2em;
      margin: 0 -1em;
      padding-bottom: 1em;
    }

    .grouping.verbose {
      background: #f9f9f9;
      max-height: 1px;
      border-top: 1px solid #f9f9f9;
      padding-top: 0;
      padding-bottom: 0;
      margin-top: 0;
      margin-bottom: 0;
      color: #efefef;
      --color-link-primary: rgba(38, 166, 230, 1);
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
      border-radius: 6px;
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

    .event-count:hover {
      padding: 3px 10px;
      min-width: 50%;
      background: #f9f9f9;
      color: #333;
    }

    .expanded .event-count {
      opacity: 0;
      margin-top: -30px;
    }

    .grouping.flows {
      margin: 2em 1em;
      border: 1px solid #f2f2f2;
      border-radius: 0.5em;
      padding: 0.5em 1em;
    }

    .grouping.flows .event {
      margin: 0;
      padding: 0;
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
      margin: 0em 1em;
      margin-bottom: 0;
      border-radius: 0.5em;
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

    .grouping.messages {
      display: flex;
      flex-direction: column;
    }

    .event {
      margin-bottom: 1em;
      border-radius: 6px;
      flex-grow: 1;
    }

    .msg {
      padding: var(--event-padding);
      border-radius: 8px;
      border: 1px solid rgba(100, 100, 100, 0.1);
      max-width: 300px;
    }

    .event.msg_received .msg {
      background: rgba(200, 200, 200, 0.1);
    }

    .event.msg_created,
    .event.broadcast_created {
      align-self: flex-end;
    }

    .event.msg_created .msg,
    .event.broadcast_created .msg {
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

    .info {
      border: 1px solid rgba(100, 100, 100, 0.2);
      background: rgba(10, 10, 10, 0.02);
    }

    .flow_exited,
    .flow_entered,
    .ticket_opened {
      fill: rgba(223, 65, 159, 1);
    }

    .ticket_opened temba-icon.clickable[name='check'] {
      fill: rgba(180, 180, 180, 1);
    }

    .ticket_opened temba-icon {
    }

    .closed {
      color: var(--color-text);
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
      --icon-color: rgba(0, 0, 0, 0.5);
    }

    .msg-summary temba-icon {
      padding: 0px 2px;
    }

    .time {
      padding: 0.3em 1px;
    }

    .status {
      padding: 0.3em 3px;
    }

    .separator {
      padding: 0.3em 3px;
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

    .icon-link {
      display: inline !important;
    }

    temba-icon[name='alert-triangle'] {
      --icon-color: var(--color-error);
    }
  `;
};

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

  FLOW_ENTERED = 'flow_entered',
  FLOW_EXITED = 'flow_exited',
  RUN_RESULT_CHANGED = 'run_result_changed',
  CONTACT_FIELD_CHANGED = 'contact_field_changed',
  CONTACT_GROUPS_CHANGED = 'contact_groups_changed',
  CONTACT_NAME_CHANGED = 'contact_name_changed',
  CONTACT_URNS_CHANGED = 'contact_urns_changed',
  CAMPAIGN_FIRED = 'campaign_fired',
  WEBHOOK_CALLED = 'webhook_called',
  EMAIL_SENT = 'email_sent',
  INPUT_LABELS_ADDED = 'input_labels_added',
  TICKET_OPENED = 'ticket_opened',
  ERROR = 'error',
  FAILURE = 'failure',
}

export interface ContactEvent {
  type: string;
  created_on: string;
}

export interface MsgEvent extends ContactEvent {
  msg: Msg;
  status: string;
  logs_url: string;
  msg_type: string;
  recipient_count?: number;
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

export interface TicketOpenedEvent extends ContactEvent {
  ticket: {
    uuid: string;
    ticketer: ObjectReference;
    subject: string;
    body: string;
    external_id?: string;
  };
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

export interface ContactHistoryPage {
  has_older: boolean;
  recent_only: boolean;
  next_before: number;
  next_after: number;
  start_date: Date;
  events: ContactEvent[];
}

export const getEventGroupType = (event: ContactEvent) => {
  if (!event) {
    return 'messages';
  }
  switch (event.type) {
    case Events.FLOW_ENTERED:
    case Events.FLOW_EXITED:
      return 'flows';
    case Events.BROADCAST_CREATED:
    case Events.MESSAGE_CREATED:
    case Events.MESSAGE_RECEIVED:
      return 'messages';
    case Events.TICKET_OPENED:
      if ((event as TicketOpenedEvent).ticket.ticketer.name === 'Internal') {
        return 'tickets';
      }
  }
  return 'verbose';
};

export const renderMsgEvent = (event: MsgEvent): TemplateResult => {
  const isInbound = event.type === Events.MESSAGE_RECEIVED;
  const isError = event.status === 'E' || event.status === 'F';

  return html`<div style="display:flex;flex-direction:column">
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
      icon = 'chevrons-down';
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
      <div class="attn">
        ${oxfordFn(
          event.urns,
          (urn: string) => urn.split(':')[1].split('?')[0]
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

export const renderTicketOpened = (
  event: TicketOpenedEvent,
  handleClose?: (uuid: string) => void,
  ticket?: Ticket
): TemplateResult => {
  const closed = ticket && ticket.status === 'closed' ? true : false;
  if (closed) {
    const opened = new Date(event.created_on);
    const closed = new Date(ticket.closed_on);
    return html`
      <temba-icon size="2" name="check"></temba-icon>
      <div class="closed" style="flex-grow:1;">
        Closed
        <div class="attn">${event.ticket.subject}</div>
        <div class="subtext">
          ${ticket.closed_on
            ? html`Opened ${opened.toLocaleString()}, took ${timeSince(closed)}`
            : timeSince(opened)}
        </div>
      </div>
    `;
  } else {
    return html`
      <temba-icon size="${ticket ? '1.5' : '1'}" name="inbox"></temba-icon>
      <div style="flex-grow:1;">
        Opened
        <div class="attn">
          ${event.ticket.subject}${!ticket
            ? html` on ${event.ticket.ticketer.name}`
            : null}
        </div>
        <div class="subtext">${timeSince(new Date(event.created_on))}</div>
      </div>
      <div>
        ${ticket
          ? html` <temba-icon
              class="clickable"
              size="1.5"
              name="check"
              @click=${() => {
                handleClose(event.ticket.uuid);
              }}
              ?clickable=${open}
            />`
          : null}
      </div>
    `;
  }
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
