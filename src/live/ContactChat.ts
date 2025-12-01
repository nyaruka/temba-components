/* eslint-disable @typescript-eslint/no-this-alias */
import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import {
  Contact,
  CustomEventType,
  NamedUser,
  Ticket,
  User
} from '../interfaces';
import {
  fetchResults,
  generateUUIDv7,
  getUrl,
  oxfordFn,
  postJSON,
  postUrl,
  WebResponse
} from '../utils';
import { ContactStoreElement } from './ContactStoreElement';
import { Compose, ComposeValue } from '../form/Compose';
import {
  AirtimeTransferredEvent,
  CallEvent,
  ChatStartedEvent,
  ContactGroupsEvent,
  ContactHistoryPage,
  ContactLanguageChangedEvent,
  ContactStatusChangedEvent,
  NameChangedEvent,
  OptInEvent,
  RunEvent,
  TicketEvent,
  UpdateFieldEvent,
  URNsChangedEvent
} from '../events';
import { Chat, MessageType, ContactEvent } from '../display/Chat';
import { DEFAULT_AVATAR } from '../webchat/assets';
import { UserSelect } from '../form/select/UserSelect';
import { Select } from '../form/select/Select';

/*
export const SCROLL_THRESHOLD = 100;
export const SIMULATED_WEB_SLOWNESS = 0;
export const MAX_CHAT_REFRESH = 10000;
export const MIN_CHAT_REFRESH = 500;
export const BODY_SNIPPET_LENGTH = 250;
*/

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
  IVR_CREATED = 'ivr_created',
  MSG_CREATED = 'msg_created',
  MSG_RECEIVED = 'msg_received',
  OPTIN_REQUESTED = 'optin_requested',
  OPTIN_STARTED = 'optin_started',
  OPTIN_STOPPED = 'optin_stopped',
  RUN_ENDED = 'run_ended',
  RUN_STARTED = 'run_started',
  TICKET_ASSIGNEE_CHANGED = 'ticket_assignee_changed',
  TICKET_CLOSED = 'ticket_closed',
  TICKET_NOTE_ADDED = 'ticket_note_added',
  TICKET_OPENED = 'ticket_opened',
  TICKET_REOPENED = 'ticket_reopened',
  TICKET_TOPIC_CHANGED = 'ticket_topic_changed'
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

const renderRunEvent = (event: RunEvent): TemplateResult => {
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

const renderChatStartedEvent = (event: ChatStartedEvent): TemplateResult => {
  if (event.params) {
    return html`<div>Chat referral</div>`;
  } else {
    return html`<div>Chat started</div>`;
  }
};

const renderUpdateEvent = (event: UpdateFieldEvent): TemplateResult => {
  return event.value
    ? html`<div>
        Updated <strong>${event.field.name}</strong> to
        <strong>${event.value.text}</strong>
      </div>`
    : html`<div>Cleared <strong>${event.field.name}</strong></div>`;
};

const renderNameChanged = (event: NameChangedEvent): TemplateResult => {
  return html`<div>
    Updated <strong>name</strong> to <strong>${event.name}</strong>
  </div>`;
};

const renderContactURNsChanged = (event: URNsChangedEvent): TemplateResult => {
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
        style="width:85%; background: #fffac3; padding: 1em;margin-bottom: 1em 0; border: 1px solid #ffe97f;border-radius: var(--curvature);"
      >
        <div style="color: #8e830fff; font-size: 1em;margin-bottom:0.25em">
          <strong>${event._user ? event._user.name : 'Someone'}</strong> added a
          note
          <temba-date
            value=${event.created_on.toISOString()}
            display="relative"
          ></temba-date>
        </div>
        ${event.note}
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

export class ContactChat extends ContactStoreElement {
  public static get styles() {
    return css`
      :host {
        flex-grow: 1;
        display: flex;
        flex-direction: row;
        min-height: 0;
        --compose-shadow: none;
        --compose-border: none;
        --compose-padding: 3px;
        --compose-curvature: none;
        border-top: 1px inset rgba(0, 0, 0, 0.05);


      }

      .chat-wrapper {
        display: flex;
        flex-grow: 1;
        flex-direction: column;
        min-height: 0;
        background: #f9f9f9;
      }

      temba-contact-history {
        border-bottom: 1px solid #f6f6f6;
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }

      .compose {
        background: #fff;
        display: flex;
        flex-direction: column;
        --textarea-min-height: 8em;
        --textarea-height: 0.5em;
        --widget-box-shadow-focused: none;
        --compose-curvature: 0px;
        overflow: hidden;
      }

      .closed-footer {
        padding: 1em;
        background: #f2f2f2;
        border-top: 3px solid #e1e1e1;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      a {
        color: var(--color-link-primary);
      }

      a:hover {
        text-decoration: underline;
        color: var(--color-link-primary-hover);
      }

      temba-button {
        margin: 0.1em 0.25em;
      }

      temba-completion {
        --widget-box-shadow: none;
        --color-widget-border: transparent;
        --widget-box-shadow-focused: none;
        --color-focus: transparent;
        --color-widget-bg-focused: transparent;
      }

      .border {
      }

      temba-compose {
        border-top-right-radius: 0;
        border-top-left-radius: 0;
        --temba-tabs-options-padding: 0.5em 0.5em 0 0.5em;
        --temba-tabs-border-left: none;
        --temba-tabs-border-right: none;
        --temba-tabs-border-bottom: none;
      }

      .error-gutter {
        display: flex;
        padding: 0.5em 1em;
        background: #f9f9f9;
        item-align: center;
      }

      .error-message {
        color: var(--color-error);
        padding-right: 1em;
        flex-grow: 1;
        align-self: center;
      }

      temba-chat {
        border-bottom: 1px solid #ddd;
        background: linear-gradient(0deg, #fff, #fff);
        --chat-border-in: 1px solid #eee;
        --color-chat-out: var(--color-message)
        );
      }

      .action-bar {
      }

      .in-flow {
        border-radius: 0.8em;
        align-items: center;
        background: #666;
        padding: 0.5em 1em;
        margin: 1em;
        margin-right: 2em;
        display: inline-flex;
        opacity: 0.9;
      }

      .in-flow:hover {
        opacity: 1;
      }

      .in-flow .flow-name {
        display: flex;
        color: #fff;
      }

      .in-flow a {
        font-weight: bold;
        color: #fff;
      }

      .in-flow .interrupt-button {
        margin-left: 1em;
      }

      .in-flow .interrupt {
        text-align: center;
        align-self: stretch;
        display: flex;
        align-items: center;
        cursor: pointer;
        justify-content: center;
        padding: 0.5em 1em;
        font-weight: bold;
      }

      .in-flow .interrupt:hover {
        background: rgba(var(--error-rgb), 0.92);
      }

      .in-flow temba-icon,
      .in-ticket temba-icon {
        margin-right: 0.5em;
      }

      .in-ticket-wrapper {
      }

      .in-ticket {
        box-shadow: none;
        padding: 0.5em 0.5em;
        text-align: center;
        align-items: center;
        border-bottom: 1px solid #ddd;
        display: flex;
        box-shadow: none;
        margin: 0em;
        background: rgba(0, 0, 0, 0.03);
      }

      temba-user {
        border: 1px solid #ddd;
        padding: 0.2em 0.5em;
        border-radius: var(--curvature);
        min-width: 10em;
        background: #fff;
      }

      temba-user:hover {
        border: 1px solid #ddd;
        background: #f9f9f9;
      }

      .assign-button {
        --button-mask: #ebebeb;
        color: #333;
        margin: 0.25em;
      }

      temba-user-select {
        width: 250px;
      }

      temba-button {
        --button-border: 1px solid #ddd;
      }
    `;
  }

  @property({ type: String, attribute: 'ticket' })
  ticketUUID: string;

  @property({ type: String })
  contactsEndpoint = '/api/v2/contacts.json';

  @property({ type: String })
  currentNote = '';

  @property({ type: Boolean })
  showDetails = true;

  @property({ type: Object })
  currentTicket: Ticket = null;

  @property({ type: Object })
  currentContact: Contact = null;

  @property({ type: String })
  agent = '';

  @property({ type: Boolean })
  blockFetching = false;

  @property({ type: Boolean })
  showInterrupt = false;

  @property({ type: String })
  avatar = DEFAULT_AVATAR;

  @property({ type: String })
  showMessageLogsAfter = null;

  @property({ type: String })
  errorMessage: string;

  // http promise to monitor for completeness
  public httpComplete: Promise<void>;
  private chat: Chat;

  ticket = null;
  beforeUUID: string = null; // for scrolling back through history
  afterUUID: string = null; // for polling new messages
  refreshId = null;
  polling = false;
  pollingInterval = 2000; // start at 2 seconds
  lastFetchTime: number = null;

  constructor() {
    super();
  }

  public firstUpdated(
    changed: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.firstUpdated(changed);
  }

  public connectedCallback() {
    super.connectedCallback();
    this.chat = this.shadowRoot.querySelector('temba-chat');
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (this.refreshId) {
      clearInterval(this.refreshId);
    }
  }

  public updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    // if we don't have an endpoint infer one
    if (
      changedProperties.has('data') ||
      changedProperties.has('currentContact')
    ) {
      // unschedule any previous refreshes
      if (this.refreshId) {
        clearTimeout(this.refreshId);
        this.refreshId = null;
      }

      this.currentContact = this.data;
    }

    if (changedProperties.has('currentContact') && this.currentContact) {
      this.chat = this.shadowRoot.querySelector('temba-chat');
      if (
        this.currentContact.uuid !==
        changedProperties.get('currentContact')?.uuid
      ) {
        this.reset();
      } else {
        setTimeout(() => this.checkForNewMessages(), 500);
      }
      this.fetchPreviousMessages();
    }
  }

  private reset() {
    if (this.chat) {
      this.chat.reset();
    }
    this.blockFetching = false;
    this.ticket = null;
    this.beforeUUID = null;
    this.afterUUID = null;
    this.refreshId = null;
    this.polling = false;
    this.pollingInterval = 2000;
    this.lastFetchTime = null;
    this.errorMessage = null;

    const compose = this.shadowRoot.querySelector('temba-compose') as Compose;
    if (compose) {
      compose.reset();
    }
  }

  private handleInterrupt() {
    this.fireCustomEvent(CustomEventType.Interrupt, {
      contact: this.currentContact
    });
  }

  private handleRetry() {
    const compose = this.shadowRoot.querySelector('temba-compose') as Compose;
    compose.triggerSend();
  }

  private handleSend(evt: CustomEvent) {
    this.errorMessage = null;
    const composeEle = evt.currentTarget as Compose;
    const compose = evt.detail.langValues['und'] as ComposeValue;

    const payload = {
      contact: this.currentContact.uuid
    };

    const text = compose.text;
    if (text && text.length > 0) {
      payload['text'] = text;
    }
    const attachments = compose.attachments;
    if (attachments && attachments.length > 0) {
      const attachment_uuids = attachments.map((attachment) => attachment.uuid);
      payload['attachments'] = attachment_uuids;
    }

    if (this.currentTicket) {
      payload['ticket'] = this.currentTicket.uuid;
    }

    const genericError = 'Send failed, please try again.';
    postJSON(`/contact/chat/${this.currentContact.uuid}/`, payload)
      .then((response) => {
        if (response.status < 400) {
          const event = response.json.event;
          event.created_on = new Date(event.created_on);
          this.chat.addMessages([event], null, true);
          // reset polling interval to 2 seconds after sending a message
          this.pollingInterval = 2000;
          this.checkForNewMessages();
          composeEle.reset();
          this.fireCustomEvent(CustomEventType.MessageSent, {
            msg: payload,
            response
          });
        } else {
          this.errorMessage = genericError;
        }
      })
      .catch(() => {
        this.errorMessage = genericError;
      });
  }

  private getEndpoint() {
    if (this.contact) {
      return `/contact/chat/${this.contact}/`;
    }
    return null;
  }

  private scheduleRefresh(hasNewEvents = false) {
    if (this.refreshId) {
      clearTimeout(this.refreshId);
      this.refreshId = null;
    }

    // reset to 2 seconds if we received new events
    if (hasNewEvents) {
      this.pollingInterval = 2000;
    } else {
      // increase interval by 1 second up to max of 15 seconds
      this.pollingInterval = Math.min(this.pollingInterval + 1000, 15000);
    }

    this.refreshId = setTimeout(() => {
      this.checkForNewMessages();
    }, this.pollingInterval);
  }

  public prerender(event: ContactEvent) {
    switch (event.type) {
      case Events.AIRTIME_TRANSFERRED:
        event._rendered = {
          html: renderAirtimeTransferredEvent(event as AirtimeTransferredEvent),
          type: MessageType.Inline
        };
        break;
      case Events.CALL_CREATED:
      case Events.CALL_MISSED:
      case Events.CALL_RECEIVED:
        event._rendered = {
          html: renderCallEvent(event as CallEvent),
          type: MessageType.Inline
        };
        break;
      case Events.CHAT_STARTED:
        event._rendered = {
          html: renderChatStartedEvent(event as ChatStartedEvent),
          type: MessageType.Inline
        };
        break;
      case Events.CONTACT_FIELD_CHANGED:
        event._rendered = {
          html: renderUpdateEvent(event as UpdateFieldEvent),
          type: MessageType.Inline
        };
        break;
      case Events.CONTACT_GROUPS_CHANGED:
        event._rendered = {
          html: renderContactGroupsEvent(event as ContactGroupsEvent),
          type: MessageType.Inline
        };
        break;
      case Events.CONTACT_LANGUAGE_CHANGED:
        event._rendered = {
          html: renderContactLanguageChangedEvent(
            event as ContactLanguageChangedEvent
          ),
          type: MessageType.Inline
        };
        break;
      case Events.CONTACT_NAME_CHANGED:
        event._rendered = {
          html: renderNameChanged(event as NameChangedEvent),
          type: MessageType.Inline
        };
        break;
      case Events.CONTACT_STATUS_CHANGED:
        event._rendered = {
          html: renderContactStatusChangedEvent(
            event as ContactStatusChangedEvent
          ),
          type: MessageType.Inline
        };
        break;
      case Events.CONTACT_URNS_CHANGED:
        event._rendered = {
          html: renderContactURNsChanged(event as URNsChangedEvent),
          type: MessageType.Inline
        };
        break;
      case Events.OPTIN_REQUESTED:
      case Events.OPTIN_STARTED:
      case Events.OPTIN_STOPPED:
        event._rendered = {
          html: renderOptInEvent(event as OptInEvent),
          type: MessageType.Inline
        };
        break;
      case Events.RUN_STARTED:
      case Events.RUN_ENDED:
        event._rendered = {
          html: renderRunEvent(event as RunEvent),
          type: MessageType.Inline
        };
        break;
      case Events.TICKET_ASSIGNEE_CHANGED:
        event._rendered = {
          html: renderTicketAssigneeChanged(event as TicketEvent),
          type: MessageType.Inline
        };
        break;
      case Events.TICKET_CLOSED:
        event._rendered = {
          html: renderTicketAction(event as TicketEvent, 'closed'),
          type: MessageType.Inline
        };
        break;
      case Events.TICKET_OPENED:
        event._rendered = {
          html: renderTicketAction(event as TicketEvent, 'opened'),
          type: MessageType.Inline
        };
        break;
      case Events.TICKET_NOTE_ADDED:
        event._rendered = {
          html: renderTicketAction(event as TicketEvent, 'noted'),
          type: MessageType.Inline
        };
        break;
      case Events.TICKET_REOPENED:
        event._rendered = {
          html: renderTicketAction(event as TicketEvent, 'reopened'),
          type: MessageType.Inline
        };
        break;
      case Events.TICKET_TOPIC_CHANGED:
        event._rendered = {
          html: html`<div>
            Topic changed to
            <strong>${(event as TicketEvent).topic.name}</strong>
          </div>`,
          type: MessageType.Inline
        };
        break;
      default:
        console.error('Unknown event type', event);
    }
  }

  private createMessages(page: ContactHistoryPage): ContactEvent[] {
    if (page.events) {
      const messages: ContactEvent[] = [];
      page.events.forEach((event) => {
        // track the UUID of the newest event for polling
        if (
          !this.afterUUID ||
          event.uuid.toLowerCase() > this.afterUUID.toLowerCase()
        ) {
          this.afterUUID = event.uuid;
        }

        // convert to dates
        event.created_on = new Date(event.created_on);

        if (
          event.type === 'msg_created' ||
          event.type === 'msg_received' ||
          event.type === 'ivr_created'
        ) {
          messages.push(event);
        } else {
          this.prerender(event);
          if (event._rendered) {
            messages.push(event);
          }
        }
      });

      // remove any messages we don't recognize
      return messages.filter((msg) => !!msg);
    }
    return [];
  }

  private checkForNewMessages() {
    // we are already working on it
    if (this.polling) {
      return;
    }

    const chat = this.chat;
    if (this.currentContact && this.afterUUID) {
      this.polling = true;
      this.lastFetchTime = Date.now();
      const endpoint = this.getEndpoint();
      if (!endpoint) {
        return;
      }

      const fetchContact = this.currentContact.uuid;

      fetchContactHistory(
        endpoint,
        this.currentTicket?.uuid,
        null,
        this.afterUUID
      ).then((page: ContactHistoryPage) => {
        const messages = this.createMessages(page);
        messages.reverse();
        if (fetchContact === this.currentContact.uuid) {
          const hasNewEvents = messages.length > 0;
          chat.addMessages(messages, null, true);
          this.polling = false;
          this.scheduleRefresh(hasNewEvents);
        } else {
          this.polling = false;
        }
      });
    }
  }

  private fetchPreviousMessages() {
    const chat = this.chat;
    const contactChat = this;
    if (!chat || chat.fetching || contactChat.blockFetching) {
      return;
    }

    chat.fetching = true;
    if (this.currentContact) {
      const endpoint = this.getEndpoint();
      if (!endpoint) {
        return;
      }

      // initialize anchor UUID if not set (first fetch)
      if (!this.beforeUUID && !this.afterUUID) {
        // generate a UUID v7 for current time as the anchor
        const anchorUUID = generateUUIDv7();
        this.beforeUUID = anchorUUID;
        this.afterUUID = anchorUUID;
      }

      fetchContactHistory(
        endpoint,
        this.currentTicket?.uuid,
        this.beforeUUID,
        null
      ).then((page: ContactHistoryPage) => {
        const messages = this.createMessages(page);
        messages.reverse();

        if (messages.length === 0) {
          contactChat.blockFetching = true;
        } else if (page.next) {
          // update beforeUUID for next fetch of older messages
          this.beforeUUID = page.next;
        } else {
          // no more history, mark end and show oldest event date
          contactChat.blockFetching = true;
          if (page.events && page.events.length > 0) {
            const oldestEvent = page.events[page.events.length - 1];
            chat.setEndOfHistory(new Date(oldestEvent.created_on));
          }
        }

        chat.addMessages(messages);
        this.scheduleRefresh();
      });
    }
  }

  private fetchComplete() {
    if (this.chat) {
      this.chat.fetching = false;
    }
  }

  private getTembaCompose(): TemplateResult {
    if (this.currentTicket) {
      if (this.currentContact && this.currentContact.status !== 'active') {
        //no chatbox for archived, blocked, or stopped contacts
        return null;
      } else {
        if (!this.currentTicket.closed_on) {
          //chatbox for active contacts with an open ticket
          return this.getCompose();
        } else {
          return null;
        }
      }
    }

    if (this.currentContact && this.currentContact.status !== 'active') {
      //no chatbox for archived, blocked, or stopped contacts
      return null;
    } else {
      //chatbox for active contacts
      return this.getCompose();
    }
  }

  private getCompose(): TemplateResult {
    return html`<div class="border"></div>
      <div class="compose">
        <temba-compose
          attachments
          counter
          autogrow
          shortcuts
          ?embeddedTabs=${!this.currentTicket}
          @temba-submitted=${this.handleSend.bind(this)}
        >
        </temba-compose>
        ${this.errorMessage
          ? html` <div class="error-gutter">
              <div class="error-message">${this.errorMessage}</div>
              <temba-button
                name="Retry"
                @click=${this.handleRetry}
              ></temba-button>
            </div>`
          : null}
      </div>`;
  }

  private handleAssignmentChanged(evt: CustomEvent) {
    const users = evt.currentTarget as UserSelect;
    const assignee = users.values[0];

    this.assignTicket(assignee ? assignee.email : null);
    users.blur();
  }

  private handleTopicChanged(evt: CustomEvent) {
    const select = evt.target as Select<any>;
    const topic = select.values[0];

    if (this.currentTicket.topic.uuid !== topic.uuid) {
      postJSON(`/api/v2/ticket_actions.json`, {
        tickets: [this.currentTicket.uuid],
        action: 'change_topic',
        topic: topic.uuid
      })
        .then(() => {
          this.refreshTicket();
        })
        .catch((response: any) => {
          console.error(response);
        });
    }
  }

  public assignTicket(email: string) {
    // if its already assigned to use, it's a noop
    if (
      (this.currentTicket.assignee &&
        this.currentTicket.assignee.email === email) ||
      (this.currentTicket.assignee === null && email === null)
    ) {
      return;
    }

    postJSON(`/api/v2/ticket_actions.json`, {
      tickets: [this.currentTicket.uuid],
      action: 'assign',
      assignee: email
    })
      .then(() => {
        this.refreshTicket();
      })
      .catch((response: any) => {
        console.error(response);
      });
    return true;
  }

  public refreshTicket() {
    if (this.currentTicket) {
      fetchResults(`/api/v2/tickets.json?uuid=${this.currentTicket.uuid}`).then(
        (values) => {
          if (values.length > 0) {
            this.fireCustomEvent(CustomEventType.TicketUpdated, {
              ticket: values[0],
              previous: this.currentTicket
            });
            this.currentTicket = values[0];
          }
        }
      );
    }
  }

  private handleReopen() {
    const uuid = this.currentTicket.uuid;
    postJSON(`/api/v2/ticket_actions.json`, {
      tickets: [uuid],
      action: 'reopen'
    })
      .then(() => {
        this.refreshTicket();
      })
      .catch((response: any) => {
        console.error(response);
      });
  }

  private handleClose() {
    const uuid = this.currentTicket.uuid;
    postJSON(`/api/v2/ticket_actions.json`, {
      tickets: [uuid],
      action: 'close'
    })
      .then(() => {
        this.refreshTicket();
      })
      .catch((response: any) => {
        console.error(response);
      });
  }

  public render(): TemplateResult {
    const inFlow = this.currentContact && this.currentContact.flow;

    const inTicket = this.currentTicket;
    const ticketClosed = this.currentTicket && this.currentTicket.closed_on;

    return html`<div class="chat-wrapper">
      ${this.currentContact
        ? html`<temba-chat
              @temba-scroll-threshold=${this.fetchPreviousMessages}
              @temba-fetch-complete=${this.fetchComplete}
              avatar=${this.avatar}
              agent
              ?hasFooter=${inFlow}
              showMessageLogsAfter=${this.showMessageLogsAfter
                ? new Date(this.showMessageLogsAfter)
                : null}
            >
              ${inFlow
                ? html`
                    <div slot="footer" style="text-align:center;">
                      <div class="in-flow">
                        <div class="flow-name">
                          <temba-icon name="flow" size="1.2"></temba-icon>
                          <div>
                            Currently in
                            <a
                              href="/flow/editor/${this.currentContact.flow
                                .uuid}/"
                              >${this.currentContact.flow.name}</a
                            >
                          </div>
                        </div>
                        ${this.showInterrupt
                          ? html`<temba-button
                              class="interrupt-button"
                              destructive
                              small
                              @click=${this.handleInterrupt}
                              name="Interrupt"
                            >
                            </temba-button>`
                          : null}
                      </div>
                    </div>
                  `
                : null}
              <div slot="footer"></div>
            </temba-chat>
            ${inTicket
              ? html`<div class="in-ticket-wrapper">
                  <div class="in-ticket">
                    <temba-user-select
                      placeholder="Assign to.."
                      searchable
                      searchOnFocus
                      clearable
                      .values=${this.currentTicket.assignee
                        ? [this.currentTicket.assignee]
                        : []}
                      @change=${this.handleAssignmentChanged}
                      ?disabled=${ticketClosed}
                    ></temba-user-select>

                    <temba-select
                      style="margin:0 0.5em; flex-grow:1"
                      endpoint="/api/v2/topics.json"
                      searchable
                      valuekey="uuid"
                      .values=${[this.currentTicket.topic]}
                      @change=${this.handleTopicChanged}
                      ?disabled=${ticketClosed}
                    ></temba-select>

                    ${this.currentTicket.closed_on
                      ? html`
                          <temba-button
                            name="Reopen"
                            @click=${this.handleReopen}
                          ></temba-button>
                        `
                      : html`
                          <temba-button
                            name="Close"
                            destructive
                            @click=${this.handleClose}
                          ></temba-button>
                        `}
                  </div>
                </div> `
              : null}
            ${this.getTembaCompose()}`
        : null}
    </div>`;
  }
}
export const closeTicket = (uuid: string): Promise<WebResponse> => {
  const formData = new FormData();
  formData.append('status', 'C');
  return postUrl(`/ticket/update/${uuid}/?_format=json`, formData);
};
export const fetchContact = (endpoint: string): Promise<Contact> => {
  return new Promise<Contact>((resolve, reject) => {
    fetchResults(endpoint).then((contacts: Contact[]) => {
      if (contacts && contacts.length === 1) {
        resolve(contacts[0]);
      } else {
        reject('No contact found');
      }
    });
  });
};
export const fetchContactHistory = (
  endpoint: string,
  ticket: string = undefined,
  before: string = undefined,
  after: string = undefined
): Promise<ContactHistoryPage> => {
  return new Promise<ContactHistoryPage>((resolve) => {
    const controller = new AbortController();
    pendingRequests.push(controller);

    let url = endpoint;
    const params = [];

    if (before) {
      params.push(`before=${before}`);
    }

    if (after) {
      params.push(`after=${after}`);
    }

    if (ticket) {
      params.push(`ticket=${ticket}`);
    }

    if (params.length > 0) {
      url += (url.includes('?') ? '&' : '?') + params.join('&');
    }

    getUrl(url, controller)
      .then((response: WebResponse) => {
        // on success, remove our abort controller
        pendingRequests = pendingRequests.filter(
          (controller: AbortController) => {
            return response.controller === controller;
          }
        );

        resolve(response.json as ContactHistoryPage);
      })
      .catch(() => {
        // canceled
      });
  });
};
export const getDisplayName = (user: User) => {
  if (!user) {
    return 'Somebody';
  }

  if ((user as NamedUser).name) {
    return (user as NamedUser).name;
  }

  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }

  if (user.first_name) {
    return user.first_name;
  }

  return user.email;
};
export let pendingRequests: AbortController[] = [];
