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
import { getLanguageName } from '../languages';
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

/**
 * Renders a single DS pill of the given type. temba-label auto-resolves
 * the icon from `type` (via PILL_TYPE_ICONS), so we don't pass `icon`
 * unless the consumer explicitly overrides it. When `href` is provided
 * the pill is wrapped in a navigation anchor (SPA goto); otherwise it's
 * rendered inline as a plain pill. Single source of truth for the
 * "entity pill in chat history" look — inline margin keeps wrapping
 * airy, and inline style works regardless of host-page Tailwind reach.
 */
const renderEntityPill = (
  pillType: string,
  name: string,
  opts: { href?: string; icon?: string } = {}
): TemplateResult => {
  const pill = opts.icon
    ? html`<temba-label
        icon=${opts.icon}
        type=${pillType}
        ?clickable=${!!opts.href}
        style="margin: 1px 2px; vertical-align: middle;"
        >${name}</temba-label
      >`
    : html`<temba-label
        type=${pillType}
        ?clickable=${!!opts.href}
        style="margin: 1px 2px; vertical-align: middle;"
        >${name}</temba-label
      >`;
  return opts.href
    ? html`<a
        href=${opts.href}
        onclick="goto(event, this)"
        style="vertical-align: middle;"
        >${pill}</a
      >`
    : pill;
};

const groupPill = (item: any) =>
  renderEntityPill('group', item.name, {
    href: `/contact/group/${item.uuid}/`
  });

const flowPill = (flow: any) =>
  renderEntityPill('flow', flow.name, {
    href: `/flow/editor/${flow.uuid}/`
  });

const fieldPill = (field: any) => renderEntityPill('field', field.name);

const topicPill = (topic: any) =>
  renderEntityPill('topic', topic.name, {
    href: `/ticket/${topic.uuid}/open/`
  });

/**
 * Renders a user as a plain text link to the "All" ticket folder
 * filtered by that assignee. Used for actor attribution in the
 * chat history (ticket assigned / opened / closed events).
 *
 * The richer avatar-chip variant is parked in git history (see
 * userPill) — we'll bring it back if denser surfaces need it.
 */
const userLink = (user: any): TemplateResult => {
  const name =
    user.name || [user.first_name, user.last_name].filter(Boolean).join(' ');
  return html`<a
    href="/ticket/all/open/?assignee=${user.uuid}"
    onclick="goto(event, this)"
    title=${name}
    >${name}</a
  >`;
};

/**
 * Renders a contact-data value (field text, name, URN, language,
 * status, amount, etc.) as bold inline text, truncated with an
 * ellipsis past a reasonable width. Pills are reserved for system-
 * level objects (group, flow, field, topic, …) — these are just
 * values, so the chip chrome would over-state them. The full value
 * is exposed via `title` for hover inspection.
 */
const valueText = (value: string | number) => {
  const str = String(value);
  return html`<span
    title=${str}
    style="display: inline-block; max-width: 18em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle; font-weight: 600;"
    >${str}</span
  >`;
};

/**
 * Inline-flex wrapper style that text + pills share. Without it,
 * plain text sits on its own baseline while vertical-align: middle
 * pills sit slightly above and the text appears to "float". flex
 * centering keeps the row of words and pills on one cross-axis.
 */
// min-height keeps the row a consistent height across renderers
// whether or not they contain a pill (which is ~22px tall) — without
// it, plain-text events like "Cleared language" sit a few pixels
// shorter than "Removed from <group pill>" and the chat history
// looks unevenly spaced.
const eventLineStyle =
  'display: inline-flex; align-items: center; flex-wrap: wrap; justify-content: center; gap: 2px 4px; min-height: 24px;';

const renderInfoList = (
  singular: string,
  plural: string,
  items: any[]
): TemplateResult => {
  if (items.length === 1) {
    return html`<div style=${eventLineStyle}>
      ${singular} ${groupPill(items[0])}
    </div>`;
  }
  if (items.length === 2) {
    return html`<div style=${eventLineStyle}>
      ${plural} ${groupPill(items[0])} and ${groupPill(items[1])}
    </div>`;
  }
  // No commas between pills — the flex `gap` on eventLineStyle
  // already provides visual separation, and a pill list reads as a
  // single "set" rather than a sentence.
  const middle = items.slice(0, -1).map((item) => groupPill(item));
  const last = items[items.length - 1];
  return html`<div style=${eventLineStyle}>
    ${plural} ${middle} and ${groupPill(last)}
  </div>`;
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

  return html`<div style=${eventLineStyle}>
    ${verb} ${flowPill(event.flow)}
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
  // Treat both a missing value object and an empty-string text as a
  // cleared field — backfill / reset payloads sometimes arrive as
  // `value: { text: '' }`, which would otherwise render with an
  // empty value pill.
  return event.value && event.value.text
    ? html`<div style=${eventLineStyle}>
        Updated ${fieldPill(event.field)} to ${valueText(event.value.text)}
      </div>`
    : html`<div style=${eventLineStyle}>
        Cleared ${fieldPill(event.field)}
      </div>`;
};

export const renderNameChanged = (event: NameChangedEvent): TemplateResult => {
  if (!event.name) {
    return html`<div style=${eventLineStyle}>Cleared name</div>`;
  }
  return html`<div style=${eventLineStyle}>
    Updated name to ${valueText(event.name)}
  </div>`;
};

export const renderContactURNsChanged = (
  event: URNsChangedEvent
): TemplateResult => {
  if (!event.urns || event.urns.length === 0) {
    return html`<div style=${eventLineStyle}>Cleared URNs</div>`;
  }
  return html`<div style=${eventLineStyle}>
    Updated URNs to
    ${oxfordFn(event.urns, (urn: string) =>
      valueText(urn.split(':')[1].split('?')[0])
    )}
  </div>`;
};

export const renderTicketAction = (
  event: TicketEvent,
  action: string
): TemplateResult => {
  const ticketUUID = event.ticket?.uuid || event.ticket_uuid;

  // Notes in the real chat history now go through Chat.ts#renderNote
  // (see ContactChat.ts: ticket_note_added bypasses prerender). This
  // path only runs for non-chat consumers (e.g. the flow Simulator).
  // Render notes as a simple inline italic line — the chat-bubble
  // styling lives in Chat.ts so the two can't drift.
  if (action === 'noted') {
    return event.note
      ? html`<div style="white-space: pre-wrap; font-style: italic;">
          ${event.note}
        </div>`
      : null;
  }

  // closed → ticket is in the closed folder now; reopened → it's
  // back in open. Linking the word "ticket" lets a reader jump to
  // wherever the ticket actually lives.
  const folder = action === 'closed' ? 'closed' : 'open';
  const href = `/ticket/all/${folder}/${ticketUUID}/`;
  return event._user
    ? html`<div style=${eventLineStyle}>
        ${userLink(event._user)} ${action} a <a href=${href}>ticket</a>
      </div>`
    : html`<div style=${eventLineStyle}>
        A <a href=${href}>ticket</a> was ${action}
      </div>`;
};

export const renderTicketAssigneeChanged = (
  event: TicketEvent
): TemplateResult => {
  const ticketUUID = event.ticket?.uuid || event.ticket_uuid;
  // Link the word "ticket" in assignee events too, so the noun is
  // consistently interactive across open / close / reopen / assigned
  // rows (the contact-history page can show events from any of the
  // contact's tickets, so the jump-to-ticket affordance is useful).
  const ticketLink = html`<a href="/ticket/all/open/${ticketUUID}/">ticket</a>`;
  const ticketLinkCapitalized = html`<a href="/ticket/all/open/${ticketUUID}/"
    >This ticket</a
  >`;
  if (event._user) {
    if (event.assignee) {
      // Self-assignment ("took the ticket") reads naturally as one
      // user link + verb, rather than "<user> assigned to <same user>".
      // Match on uuid when present, falling back to email — depending
      // on the API surface a user payload may carry one or the other.
      const sameUser =
        (event._user.uuid && event._user.uuid === event.assignee.uuid) ||
        (event._user.email && event._user.email === event.assignee.email);
      if (sameUser) {
        return html`<div style=${eventLineStyle}>
          ${userLink(event._user)} took this ${ticketLink}
        </div>`;
      }
      return html`<div style=${eventLineStyle}>
        ${userLink(event._user)} assigned this ${ticketLink} to
        ${userLink(event.assignee)}
      </div>`;
    } else {
      return html`<div style=${eventLineStyle}>
        ${userLink(event._user)} unassigned this ${ticketLink}
      </div>`;
    }
  } else {
    if (event.assignee) {
      return html`<div style=${eventLineStyle}>
        ${ticketLinkCapitalized} was assigned to ${userLink(event.assignee)}
      </div>`;
    } else {
      return html`<div style=${eventLineStyle}>
        ${ticketLinkCapitalized} was unassigned
      </div>`;
    }
  }
};

export const renderTicketOpened = (event: TicketEvent): TemplateResult => {
  const ticketUUID = event.ticket.uuid;
  const href = `/ticket/all/open/${ticketUUID}/`;
  // ticket.topic is optional in events.ts — guard so a payload
  // without one degrades to "A ticket was opened" rather than
  // throwing inside topicPill.
  const topic = event.ticket.topic;
  const tail = topic ? html` in ${topicPill(topic)}` : null;
  return event._user
    ? html`<div style=${eventLineStyle}>
        ${userLink(event._user)} opened a <a href=${href}>ticket</a>${tail}
      </div>`
    : html`<div style=${eventLineStyle}>
        A <a href=${href}>ticket</a> was opened${tail}
      </div>`;
};

export const renderContactGroupsEvent = (
  event: ContactGroupsEvent
): TemplateResult => {
  if (event.groups_added) {
    return renderInfoList('Added to', 'Added to', event.groups_added);
  } else if (event.groups_removed) {
    return renderInfoList('Removed from', 'Removed from', event.groups_removed);
  }
};

export const renderAirtimeTransferredEvent = (
  event: AirtimeTransferredEvent
): TemplateResult => {
  if (parseFloat(event.amount) === 0) {
    return html`<div>Airtime transfer failed</div>`;
  }
  return html`<div style=${eventLineStyle}>
    Transferred ${valueText(event.amount)} ${event.currency} of airtime
  </div>`;
};

export const renderContactLanguageChangedEvent = (
  event: ContactLanguageChangedEvent
): TemplateResult => {
  if (!event.language) {
    return html`<div style=${eventLineStyle}>Cleared language</div>`;
  }
  return html`<div style=${eventLineStyle}>
    Language updated to ${valueText(getLanguageName(event.language))}
  </div>`;
};

export const renderContactStatusChangedEvent = (
  event: ContactStatusChangedEvent
): TemplateResult => {
  if (!event.status) {
    return html`<div style=${eventLineStyle}>Cleared status</div>`;
  }
  return html`<div style=${eventLineStyle}>
    Status updated to ${valueText(event.status)}
  </div>`;
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
    return html`<div>Started somebody else in ${flowPill(flow)}</div>`;
  }
  return null;
};

export const renderResthookCalled = (event: any): TemplateResult | null => {
  return html`<div>
    Triggered flow event <strong>${event.resthook}</strong>
  </div>`;
};

export const renderWebhookCalled = (event: any): TemplateResult | null => {
  const maxLen = 50;
  const displayUrl =
    event.url && event.url.length > maxLen
      ? event.url.slice(0, maxLen) + '...'
      : event.url;
  return html`<div>Called <strong>${displayUrl}</strong></div>`;
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
      content = renderTicketOpened(event as TicketEvent);
      break;
    case Events.TICKET_NOTE_ADDED:
      content = renderTicketAction(event as TicketEvent, 'noted');
      break;
    case Events.TICKET_REOPENED:
      content = renderTicketAction(event as TicketEvent, 'reopened');
      break;
    case Events.TICKET_TOPIC_CHANGED: {
      // event.topic is optional — guard so a payload without one
      // degrades cleanly instead of throwing inside topicPill.
      const newTopic = (event as TicketEvent).topic;
      content = newTopic
        ? html`<div style=${eventLineStyle}>
            Topic changed to ${topicPill(newTopic)}
          </div>`
        : null;
      break;
    }
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
