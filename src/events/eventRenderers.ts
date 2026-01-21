import { html, TemplateResult } from 'lit';
import {
  AirtimeTransferredEvent,
  CallEvent,
  ChatStartedEvent,
  ContactGroupsEvent,
  ContactLanguageChangedEvent,
  ContactStatusChangedEvent,
  NameChangedEvent,
  OptInEvent,
  RunEvent,
  TicketEvent,
  UpdateFieldEvent,
  URNsChangedEvent
} from '../events';
import { oxfordFn } from '../utils';

export enum Events {
  AIRTIME_TRANSFERRED = 'airtime_transferred',
  BROADCAST_CREATED = 'broadcast_created',
  CALL_CREATED = 'call_created',
  CALL_MISSED = 'call_missed',
  CALL_RECEIVED = 'call_received',
  CHAT_STARTED = 'chat_started',
  CONTACT_FIELD_CHANGED = 'contact_field_changed',
  CONTACT_GROUPS_CHANGED = 'contact_groups_changed',
  CONTACT_LANGUAGE_CHANGED = 'contact_language_changed',
  CONTACT_NAME_CHANGED = 'contact_name_changed',
  CONTACT_STATUS_CHANGED = 'contact_status_changed',
  CONTACT_URNS_CHANGED = 'contact_urns_changed',
  EMAIL_CREATED = 'email_created',
  EMAIL_SENT = 'email_sent',
  FLOW_ENTERED = 'flow_entered',
  INPUT_LABELS_ADDED = 'input_labels_added',
  IVR_CREATED = 'ivr_created',
  MSG_CREATED = 'msg_created',
  MSG_RECEIVED = 'msg_received',
  OPTIN_REQUESTED = 'optin_requested',
  OPTIN_STARTED = 'optin_started',
  OPTIN_STOPPED = 'optin_stopped',
  RESTHOOK_CALLED = 'resthook_called',
  RUN_ENDED = 'run_ended',
  RUN_RESULT_CHANGED = 'run_result_changed',
  RUN_STARTED = 'run_started',
  SERVICE_CALLED = 'service_called',
  SESSION_TRIGGERED = 'session_triggered',
  TICKET_ASSIGNEE_CHANGED = 'ticket_assignee_changed',
  TICKET_CLOSED = 'ticket_closed',
  TICKET_NOTE_ADDED = 'ticket_note_added',
  TICKET_OPENED = 'ticket_opened',
  TICKET_REOPENED = 'ticket_reopened',
  TICKET_TOPIC_CHANGED = 'ticket_topic_changed',
  WEBHOOK_CALLED = 'webhook_called'
}

const renderInfoList = (
  singular: string,
  plural: string,
  items: any[]
): TemplateResult => {
  if (items.length === 1) {
    return html`<div>${singular} <strong>${items[0].name}</strong></div>`;
  } else {
    const list = items.map((item) => item.name);
    if (list.length === 2) {
      return html`<div>
        ${plural} <strong>${list[0]}</strong> and <strong>${list[1]}</strong>
      </div>`;
    } else {
      const last = list.pop();
      const middle = list.map(
        (name, index) =>
          html`<strong>${name}</strong>${index < list.length - 1 ? ', ' : ''}`
      );
      return html`<div>${plural} ${middle}, and <strong>${last}</strong></div>`;
    }
  }
};

export const renderRunEvent = (event: RunEvent): TemplateResult => {
  let verb = 'Started';
  if (event.type === Events.RUN_ENDED) {
    if (event.status === 'completed') {
      verb = 'Completed';
    } else if (event.status === 'expired') {
      verb = 'Expired from';
    } else {
      verb = 'Interrupted';
    }
  }

  return html`<div>
    ${verb}
    <a href="/flow/editor/${event.flow.uuid}/"
      ><strong>${event.flow.name}</strong></a
    >
  </div>`;
};

export const renderChatStartedEvent = (
  event: ChatStartedEvent
): TemplateResult => {
  if (event.params) {
    return html`<div>Chat referral</div>`;
  } else {
    return html`<div>Chat started</div>`;
  }
};

export const renderUpdateEvent = (event: UpdateFieldEvent): TemplateResult => {
  return event.value
    ? html`<div>
        Updated <strong>${event.field.name}</strong> to
        <strong>${event.value.text}</strong>
      </div>`
    : html`<div>Cleared <strong>${event.field.name}</strong></div>`;
};

export const renderNameChanged = (event: NameChangedEvent): TemplateResult => {
  return html`<div>
    Updated <strong>name</strong> to <strong>${event.name}</strong>
  </div>`;
};

export const renderContactURNsChanged = (
  event: URNsChangedEvent
): TemplateResult => {
  return html`<div>
    Updated <strong>URNs</strong> to
    ${oxfordFn(
      event.urns,
      (urn: string) => html`<strong>${urn.split(':')[1].split('?')[0]}</strong>`
    )}
  </div>`;
};

export const renderTicketAction = (
  event: TicketEvent,
  action: string
): TemplateResult => {
  const ticketUUID = event.ticket?.uuid || event.ticket_uuid;

  const actionNote = event.note
    ? html`<div
        style="width:85%; background: #fffac3; padding: 1em;margin-bottom: 1em;margin-top:1em; border: 1px solid #ffe97f;border-radius: var(--curvature);line-height: 1.2em; word-break: break-word;"
      >
        <div style="color: #8e830fff; font-size: 1em;margin-bottom:0.25em; ">
          <strong>${event._user ? event._user.name : 'Someone'}</strong> added a
          note
          <temba-date
            value=${event.created_on.toISOString()}
            display="relative"
          ></temba-date>
        </div>
        <div style="white-space: pre-wrap;">${event.note}</div>
      </div>`
    : null;

  if (action === 'noted') {
    return html`${actionNote}`;
  }

  const description = event._user
    ? html`<div>
        <strong>${event._user.name}</strong> ${action} a
        <strong><a href="/ticket/all/closed/${ticketUUID}/">ticket</a></strong>
      </div>`
    : html`<div>
        A
        <strong><a href="/ticket/all/closed/${ticketUUID}/">ticket</a></strong>
        was <strong>${action}</strong>
      </div>`;

  return html`<div style="${actionNote ? 'margin-bottom: 1em;' : ''}">
      ${description}
    </div>
    ${actionNote}`;
};

export const renderTicketAssigneeChanged = (
  event: TicketEvent
): TemplateResult => {
  if (event._user) {
    if (event.assignee) {
      return html`<div>
        <strong>${event._user.name}</strong> assigned this ticket to
        <strong>${event.assignee.name}</strong>
      </div>`;
    } else {
      return html`<div>
        <strong>${event._user.name}</strong> unassigned this ticket
      </div>`;
    }
  } else {
    if (event.assignee) {
      return html`<div>
        This ticket was assigned to <strong>${event.assignee.name}</strong>
      </div>`;
    } else {
      return html`<div>This ticket was unassigned</div>`;
    }
  }
};

export const renderTicketOpened = (event: TicketEvent): TemplateResult => {
  return html`<div>${event.ticket.topic.name} ticket was opened</div>`;
};

export const renderContactGroupsEvent = (
  event: ContactGroupsEvent
): TemplateResult => {
  const groupsEvent = event as ContactGroupsEvent;
  if (groupsEvent.groups_added) {
    return renderInfoList(
      'Added to group',
      'Added to groups',
      groupsEvent.groups_added
    );
  } else if (groupsEvent.groups_removed) {
    return renderInfoList(
      'Removed from group',
      'Removed from groups',
      groupsEvent.groups_removed
    );
  }
};

export const renderAirtimeTransferredEvent = (
  event: AirtimeTransferredEvent
): TemplateResult => {
  if (parseFloat(event.amount) === 0) {
    return html`<div>Airtime transfer failed</div>`;
  }
  return html`<div>
    Transferred <strong>${event.amount}</strong> ${event.currency} of airtime
  </div>`;
};

export const renderContactLanguageChangedEvent = (
  event: ContactLanguageChangedEvent
): TemplateResult => {
  return html`<div>
    Language updated to <strong>${event.language}</strong>
  </div>`;
};

export const renderContactStatusChangedEvent = (
  event: ContactStatusChangedEvent
): TemplateResult => {
  return html`<div>Status updated to <strong>${event.status}</strong></div>`;
};

export const renderCallEvent = (event: CallEvent): TemplateResult => {
  if (event.type === Events.CALL_CREATED) {
    return html`<div>Call started</div>`;
  } else if (event.type === Events.CALL_MISSED) {
    return html`<div>Call missed</div>`;
  } else if (event.type === Events.CALL_RECEIVED) {
    return html`<div>Call answered</div>`;
  }
};

export const renderOptInEvent = (event: OptInEvent): TemplateResult => {
  if (event.type === Events.OPTIN_REQUESTED) {
    return html`<div>
      Requested opt-in for <strong>${event.optin.name}</strong>
    </div>`;
  } else if (event.type === Events.OPTIN_STARTED) {
    return html`<div>Opted in to <strong>${event.optin.name}</strong></div>`;
  } else if (event.type === Events.OPTIN_STOPPED) {
    return html`<div>Opted out of <strong>${event.optin.name}</strong></div>`;
  }
};

// simulator-specific event renderers
export const renderSimulatorEvent = (event: any): TemplateResult | null => {
  switch (event.type) {
    case Events.CONTACT_GROUPS_CHANGED: {
      const groups = event.groups_added || [];
      const removedGroups = event.groups_removed || [];
      if (groups.length > 0) {
        const groupNames = groups.map((g: any) => `"${g.name}"`).join(', ');
        return html`<p>Added to ${groupNames}</p>`;
      }
      if (removedGroups.length > 0) {
        const groupNames = removedGroups
          .map((g: any) => `"${g.name}"`)
          .join(', ');
        return html`<p>Removed from ${groupNames}</p>`;
      }
      return null;
    }
    case Events.CONTACT_FIELD_CHANGED: {
      const field = event.field;
      const value = event.value;
      const valueText = value ? value.text || value : '';
      if (field) {
        if (valueText) {
          return html`<p>Set contact "${field.name}" to "${valueText}"</p>`;
        } else {
          return html`<p>Cleared contact "${field.name}"</p>`;
        }
      }
      return null;
    }
    case Events.CONTACT_LANGUAGE_CHANGED:
      return html`<p>Set preferred language to "${event.language}"</p>`;
    case Events.CONTACT_NAME_CHANGED:
      return html`<p>Set contact name to "${event.name}"</p>`;
    case Events.CONTACT_STATUS_CHANGED:
      return html`<p>Set status to "${event.status}"</p>`;
    case Events.CONTACT_URNS_CHANGED:
      return html`<p>Added a URN for the contact</p>`;
    case Events.INPUT_LABELS_ADDED: {
      const labels = event.labels || [];
      if (labels.length > 0) {
        const labelNames = labels.map((l: any) => `"${l.name}"`).join(', ');
        return html`<p>Message labeled with ${labelNames}</p>`;
      }
      return null;
    }
    case Events.RUN_RESULT_CHANGED: {
      const val = String(event.value);
      const MAX_LEN = 30;

      if (val.length > MAX_LEN) {
        const displayVal = val.substring(0, MAX_LEN) + '...';
        return html`<p>
          Set result "${event.name}" to "<span
            title="${val}"
            style="cursor: help; border-bottom: 1px dotted #999;"
            >${displayVal}</span
          >"
        </p>`;
      }
      return html`<p>Set result "${event.name}" to "${val}"</p>`;
    }
    case Events.RUN_STARTED:
    case Events.FLOW_ENTERED: {
      const flow = event.flow;
      if (flow) {
        return html`<p>Entered flow "${flow.name}"</p>`;
      }
      return null;
    }
    case Events.RUN_ENDED: {
      const flow = event.flow;
      if (flow) {
        return html`<p>Exited flow "${flow.name}"</p>`;
      }
      return null;
    }
    case Events.EMAIL_CREATED:
    case Events.EMAIL_SENT: {
      const recipients = event.to || event.addresses || [];
      const subject = event.subject;
      const recipientList = recipients.map((r: string) => `"${r}"`).join(', ');
      return html`<p>
        Sent email to ${recipientList} with subject "${subject}"
      </p>`;
    }
    case Events.BROADCAST_CREATED: {
      const translations = event.translations;
      const baseLanguage = event.base_language;
      if (translations && translations[baseLanguage]) {
        return html`<p>
          Sent broadcast: "${translations[baseLanguage].text}"
        </p>`;
      }
      return html`<p>Sent broadcast</p>`;
    }
    case Events.SESSION_TRIGGERED: {
      const flow = event.flow;
      if (flow) {
        return html`<p>Started somebody else in "${flow.name}"</p>`;
      }
      return null;
    }
    case Events.TICKET_OPENED: {
      const ticket = event.ticket;
      if (ticket && ticket.topic) {
        return html`<p>Ticket opened with topic "${ticket.topic.name}"</p>`;
      }
      return html`<p>Ticket opened</p>`;
    }
    case Events.RESTHOOK_CALLED:
      return html`<p>Triggered flow event "${event.resthook}"</p>`;
    case Events.WEBHOOK_CALLED:
      return html`<p>Called ${event.url}</p>`;
    case Events.SERVICE_CALLED: {
      const service = event.service;
      if (service === 'classifier') {
        return html`<p>Called classifier</p>`;
      }
      return html`<p>Called ${service}</p>`;
    }
    case Events.AIRTIME_TRANSFERRED: {
      const amount = event.actual_amount;
      const currency = event.currency;
      const recipient = event.recipient;
      if (amount && currency && recipient) {
        return html`<p>Transferred ${amount} ${currency} to ${recipient}</p>`;
      }
      return null;
    }
    default:
      return null;
  }
};
