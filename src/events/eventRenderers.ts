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
  ERROR = 'error',
  FAILURE = 'failure',
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
  WARNING = 'warning',
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

export const renderDiagnosticEvent = (
  event: any,
  _isSimulation: boolean = false
): TemplateResult | null => {
  if (event.text) {
    let icon = '⚠️';
    let bgColor = '#fff3cd';
    let textColor = '#856404';

    if (event.type === 'error') {
      icon = '❗';
      bgColor = '#fee3e3';
      textColor = '#c01829';
    } else if (event.type === 'failure') {
      icon = '💥';
      bgColor = '#fee3e3';
      textColor = '#c01829';
    }

    return html`<div
      style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: ${bgColor}; color: ${textColor}; border-radius: 12px; margin: 4px 18px;"
    >
      <span style="font-size: 16px; line-height: 1.4;">${icon}</span>
      <span style="flex: 1; line-height: 1.4;">${event.text}</span>
    </div>`;
  }
  return null;
};

export const renderRunResultChanged = (
  event: any,
  isSimulation: boolean = false
): TemplateResult | null => {
  const val = String(event.value);
  const MAX_LEN = isSimulation ? 30 : 100;

  if (val.length > MAX_LEN) {
    const displayVal = val.substring(0, MAX_LEN) + '...';
    return html`<div>
      Set result <strong>${event.name}</strong> to "<span
        title="${val}"
        style="cursor: help; border-bottom: 1px dotted #999;"
        >${displayVal}</span
      >"
    </div>`;
  }
  return html`<div>Set result <strong>${event.name}</strong> to "${val}"</div>`;
};

export const renderInputLabelsAdded = (event: any): TemplateResult | null => {
  const labels = event.labels || [];
  if (labels.length > 0) {
    const labelList = labels.map((l: any) => l.name);
    if (labelList.length === 1) {
      return html`<div>
        Message labeled with <strong>${labelList[0]}</strong>
      </div>`;
    } else {
      const last = labelList.pop();
      return html`<div>
        Message labeled with
        ${labelList.map(
          (name: string, index: number) =>
            html`<strong>${name}</strong>${index < labelList.length - 1
                ? ', '
                : ''}`
        )}
        and <strong>${last}</strong>
      </div>`;
    }
  }
  return null;
};

export const renderEmailSent = (event: any): TemplateResult | null => {
  const recipients = event.to || event.addresses || [];
  const subject = event.subject;
  if (recipients.length > 0) {
    const recipientList = recipients.join(', ');
    return html`<div>
      Sent email to <strong>${recipientList}</strong> with subject "${subject}"
    </div>`;
  }
  return null;
};

export const renderBroadcastCreated = (event: any): TemplateResult | null => {
  const translations = event.translations;
  const baseLanguage = event.base_language;
  if (translations && translations[baseLanguage]) {
    return html`<div>
      Sent broadcast: "${translations[baseLanguage].text}"
    </div>`;
  }
  return html`<div>Sent broadcast</div>`;
};

export const renderSessionTriggered = (event: any): TemplateResult | null => {
  const flow = event.flow;
  if (flow) {
    return html`<div>
      Started somebody else in <strong>${flow.name}</strong>
    </div>`;
  }
  return null;
};

export const renderResthookCalled = (event: any): TemplateResult | null => {
  return html`<div>
    Triggered flow event <strong>${event.resthook}</strong>
  </div>`;
};

export const renderWebhookCalled = (event: any): TemplateResult | null => {
  return html`<div>Called <strong>${event.url}</strong></div>`;
};

export const renderServiceCalled = (event: any): TemplateResult | null => {
  const service = event.service;
  if (service === 'classifier') {
    return html`<div>Called classifier</div>`;
  }
  return html`<div>Called <strong>${service}</strong></div>`;
};

/**
 * Unified event renderer that handles both simulation and contact chat contexts.
 * @param event - The event to render
 * @param isSimulation - Whether this is for simulation (true) or contact chat (false)
 * @returns A template result or null if the event cannot be rendered
 */
export const renderEvent = (
  event: any,
  isSimulation: boolean
): TemplateResult | null => {
  let content: TemplateResult | null = null;

  switch (event.type) {
    case Events.ERROR:
    case Events.FAILURE:
    case Events.WARNING:
      content = renderDiagnosticEvent(event, isSimulation);
      break;
    case Events.AIRTIME_TRANSFERRED:
      content = renderAirtimeTransferredEvent(event as AirtimeTransferredEvent);
      break;
    case Events.CALL_CREATED:
    case Events.CALL_MISSED:
    case Events.CALL_RECEIVED:
      content = renderCallEvent(event as CallEvent);
      break;
    case Events.CHAT_STARTED:
      content = renderChatStartedEvent(event as ChatStartedEvent);
      break;
    case Events.CONTACT_FIELD_CHANGED:
      content = renderUpdateEvent(event as UpdateFieldEvent);
      break;
    case Events.CONTACT_GROUPS_CHANGED:
      content = renderContactGroupsEvent(event as ContactGroupsEvent);
      break;
    case Events.CONTACT_LANGUAGE_CHANGED:
      content = renderContactLanguageChangedEvent(
        event as ContactLanguageChangedEvent
      );
      break;
    case Events.CONTACT_NAME_CHANGED:
      content = renderNameChanged(event as NameChangedEvent);
      break;
    case Events.CONTACT_STATUS_CHANGED:
      content = renderContactStatusChangedEvent(
        event as ContactStatusChangedEvent
      );
      break;
    case Events.CONTACT_URNS_CHANGED:
      content = renderContactURNsChanged(event as URNsChangedEvent);
      break;
    case Events.INPUT_LABELS_ADDED:
      content = renderInputLabelsAdded(event);
      break;
    case Events.RUN_RESULT_CHANGED:
      content = renderRunResultChanged(event, isSimulation);
      break;
    case Events.OPTIN_REQUESTED:
    case Events.OPTIN_STARTED:
    case Events.OPTIN_STOPPED:
      content = renderOptInEvent(event as OptInEvent);
      break;
    case Events.RUN_STARTED:
    case Events.RUN_ENDED:
    case Events.FLOW_ENTERED:
      content = renderRunEvent(event as RunEvent);
      break;
    case Events.EMAIL_CREATED:
    case Events.EMAIL_SENT:
      content = renderEmailSent(event);
      break;
    case Events.BROADCAST_CREATED:
      content = renderBroadcastCreated(event);
      break;
    case Events.SESSION_TRIGGERED:
      content = renderSessionTriggered(event);
      break;
    case Events.RESTHOOK_CALLED:
      content = renderResthookCalled(event);
      break;
    case Events.WEBHOOK_CALLED:
      content = renderWebhookCalled(event);
      break;
    case Events.SERVICE_CALLED:
      content = renderServiceCalled(event);
      break;
    case Events.TICKET_ASSIGNEE_CHANGED:
      content = renderTicketAssigneeChanged(event as TicketEvent);
      break;
    case Events.TICKET_CLOSED:
      content = renderTicketAction(event as TicketEvent, 'closed');
      break;
    case Events.TICKET_OPENED:
      content = renderTicketAction(event as TicketEvent, 'opened');
      break;
    case Events.TICKET_NOTE_ADDED:
      content = renderTicketAction(event as TicketEvent, 'noted');
      break;
    case Events.TICKET_REOPENED:
      content = renderTicketAction(event as TicketEvent, 'reopened');
      break;
    case Events.TICKET_TOPIC_CHANGED:
      content = html`<div>
        Topic changed to <strong>${(event as TicketEvent).topic.name}</strong>
      </div>`;
      break;
    default:
      return null;
  }

  if (content === null) {
    return null;
  }

  // wrap in a div with appropriate font size
  const fontSize = isSimulation ? '11px' : '14px';
  return html`<div style="font-size: ${fontSize}">${content}</div>`;
};

/**
 * @deprecated Use renderEvent(event, true) instead
 */
export const renderSimulatorEvent = (event: any): TemplateResult | null => {
  return renderEvent(event, true);
};
