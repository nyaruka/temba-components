/* eslint-disable @typescript-eslint/no-this-alias */
import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { Contact, CustomEventType, Ticket } from '../interfaces';
import { hashCode, oxford, oxfordFn, postJSON } from '../utils';
import { ContactStoreElement } from './ContactStoreElement';
import { Compose } from '../compose/Compose';
import { fetchContactHistory, getDisplayName } from './helpers';
import {
  AirtimeTransferredEvent,
  CampaignFiredEvent,
  ChannelEvent,
  ContactEvent,
  ContactGroupsEvent,
  ContactHistoryPage,
  ContactLanguageChangedEvent,
  EmailSentEvent,
  ErrorMessageEvent,
  FlowEvent,
  LabelsAddedEvent,
  MsgEvent,
  NameChangedEvent,
  OptinRequestedEvent,
  TicketEvent,
  UpdateFieldEvent,
  UpdateResultEvent,
  URNsChangedEvent,
  WebhookEvent
} from './events';
import { Chat, MessageType } from '../chat/Chat';
import { getUserDisplay } from '../webchat';

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
  FAILURE = 'failure'
}

const renderInfoList = (singular: string, plural: string, items: any[]) => {
  if (items.length === 1) {
    return `${singular} **${items[0].name}**`;
  } else {
    const list = items.map((item) => `**${item.name}**`);
    if (list.length === 2) {
      return `${plural} ${list.join(' and ')}`;
    } else {
      const last = list.pop();
      return `${plural} ${list.join(', ')}, and ${last}`;
    }
  }
};

const toTitleCase = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const renderChannelEvent = (event: ChannelEvent): string => {
  if (event.event.type === 'mt_miss') {
    return 'Missed outgoing call';
  } else if (event.event.type === 'mo_miss') {
    return 'Missed incoming call';
  } else if (event.event.type === 'new_conversation') {
    return 'Started conversation';
  } else if (event.channel_event_type === 'welcome_message') {
    return 'Welcome Message Sent';
  } else if (event.event.type === 'referral') {
    return 'Referred';
  } else if (event.event.type === 'follow') {
    return 'Followed';
  } else if (event.event.type === 'stop_contact') {
    return 'Stopped';
  } else if (event.event.type === 'mt_call') {
    return 'Outgoing Phone Call';
  } else if (event.event.type == 'mo_call') {
    return 'Incoming Phone call';
  } else if (event.event.type == 'optin') {
    return `Opted in to **${event.event.optin?.name}**`;
  } else if (event.event.type == 'optout') {
    return `Opted out of **${event.event.optin?.name}**`;
  }
};

const renderFlowEvent = (event: FlowEvent): string => {
  let verb = 'Interrupted';
  if (event.status !== 'I') {
    if (event.type === Events.FLOW_ENTERED) {
      verb = 'Started';
    } else {
      verb = 'Completed';
    }
  }
  return `${verb} [**${event.flow.name}**](/flow/editor/${event.flow.uuid}/)`;
};

const renderResultEvent = (event: UpdateResultEvent): string => {
  if (!event.name.startsWith('_') && event.value) {
    return `Updated flow result **${event.name}** to **${event.value}**`;
  }
};

const renderUpdateEvent = (event: UpdateFieldEvent): string => {
  return event.value
    ? `Updated **${event.field.name}** to **${event.value.text}**`
    : `Cleared **${event.field.name}**`;
};

const renderNameChanged = (event: NameChangedEvent): string => {
  return `Updated **Contact Name** to **${event.name}**`;
};

const renderContactURNsChanged = (event: URNsChangedEvent): string => {
  return `Updated **URNs** to ${oxfordFn(
    event.urns,
    (urn: string) => `**${urn.split(':')[1].split('?')[0]}**`
  )}`;
};

const renderEmailSent = (event: EmailSentEvent): string => {
  return `Email sent to **${oxford(event.to, 'and')}** with subject **${
    event.subject
  }**`;
};

const renderLabelsAdded = (event: LabelsAddedEvent): string => {
  return `Applied ${renderInfoList('label', 'labels', event.labels)}`;
};

export const renderTicketAction = (
  event: TicketEvent,
  action: string
): string => {
  if (event.created_by) {
    return `**${getUserDisplay(
      event.created_by
    )}** ${action} a [ticket](/ticket/all/closed/${event.ticket.uuid}/)`;
  }
  return `A [ticket](/ticket/all/closed/${event.ticket.uuid}/) was ${action}`;
};

export const renderTicketAssigned = (event: TicketEvent): string => {
  return event.assignee
    ? event.assignee.id === event.created_by.id
      ? `**${getDisplayName(event.created_by)}** took this ticket`
      : `${getDisplayName(
          event.created_by
        )} assigned this ticket to **${getDisplayName(event.assignee)}**`
    : `**${getDisplayName(event.created_by)}** unassigned this ticket`;
};

export const renderContactGroupsEvent = (event: ContactGroupsEvent): string => {
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

export const renderCampaignFiredEvent = (event: CampaignFiredEvent): string => {
  return `Campaign ${event.campaign.name}
      ${event.fired_result === 'S' ? 'skipped' : 'triggered'}
      ${event.campaign_event.offset_display}
      ${event.campaign_event.relative_to.name}`;
};

export const renderTicketOpened = (event: TicketEvent): string => {
  return `${event.ticket.topic.name} ticket was opened`;
};

export const renderErrorMessage = (event: ErrorMessageEvent): string => {
  return `${event.text} ${
    event.type === Events.FAILURE
      ? `Run ended prematurely, check the flow design`
      : null
  }`;
};

export const renderWebhookEvent = (event: WebhookEvent): string => {
  return event.status === 'success'
    ? `Successfully called ${event.url}`
    : `Failed to call ${event.url}`;
};

export const renderAirtimeTransferredEvent = (
  event: AirtimeTransferredEvent
): string => {
  if (parseFloat(event.actual_amount) === 0) {
    return `Airtime transfer failed</div>`;
  }
  return `Transferred **${event.actual_amount}** ${event.currency} of airtime`;
};

export const renderCallStartedEvent = (): string => {
  return `Call Started`;
};

export const renderContactLanguageChangedEvent = (
  event: ContactLanguageChangedEvent
): string => {
  return `Language updated to **${event.language}**`;
};

export const renderOptinRequested = (event: OptinRequestedEvent): string => {
  return `Requested opt-in for ${event.optin.name}`;
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
      }

      .chat-wrapper {
        display: flex;
        flex-grow: 1;
        flex-direction: column;
        min-height: 0;
      }

      temba-contact-history {
        border-bottom: 1px solid #f6f6f6;
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }

      .chatbox {
        background: #fff;
        display: flex;
        flex-direction: column;
        --textarea-min-height: 1em;
        --textarea-height: 1.2em;
        --widget-box-shadow-focused: none;
      }

      .chatbox.full {
        border-bottom-right-radius: 0 !important;
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

      temba-button#reopen-button {
        --button-y: 1px;
        --button-x: 12px;
      }

      temba-completion {
        --widget-box-shadow: none;
        --color-widget-border: transparent;
        --widget-box-shadow-focused: none;
        --color-focus: transparent;
        --color-widget-bg-focused: transparent;
      }

      .border {
        border-top: 1px solid #f1f1f1;
        margin: 0 1em;
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

  // http promise to monitor for completeness
  public httpComplete: Promise<void>;
  private chat: Chat;

  ticket = null;
  lastEventTime = null;
  newestEventTime = null;
  refreshId = null;
  polling = false;

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
      this.currentContact = this.data;
    }

    if (changedProperties.has('currentContact')) {
      this.chat = this.shadowRoot.querySelector('temba-chat');
      this.reset();
      this.fetchPreviousMessages();
    }
  }

  private reset() {
    this.blockFetching = false;
    this.ticket = null;
    this.lastEventTime = null;
    this.newestEventTime = null;
    this.refreshId = null;
    this.polling = false;
  }

  public refresh() {
    this.checkForNewMessages();
  }

  private handleSend(evt: CustomEvent) {
    const buttonName = evt.detail.name;
    if (buttonName === 'Send') {
      const payload = {
        contact: this.currentContact.uuid
      };
      const compose = evt.currentTarget as Compose;
      if (compose) {
        const text = compose.currentText;
        if (text && text.length > 0) {
          payload['text'] = text;
        }
        const attachments = compose.currentAttachments;
        if (attachments && attachments.length > 0) {
          const attachment_uuids = attachments.map(
            (attachment) => attachment.uuid
          );
          payload['attachments'] = attachment_uuids;
        }
      }
      if (this.currentTicket) {
        payload['ticket'] = this.currentTicket.uuid;
      }

      const genericError = buttonName + ' failed, please try again.';

      postJSON(`/api/v2/messages.json`, payload)
        .then((response) => {
          if (response.status < 400) {
            this.checkForNewMessages();
            compose.reset();
            this.fireCustomEvent(CustomEventType.MessageSent, { msg: payload });
          } else if (response.status < 500) {
            if (
              response.json.text &&
              response.json.text.length > 0 &&
              response.json.text[0].length > 0
            ) {
              let textError = response.json.text[0];
              textError = textError.replace(
                'Ensure this field has no more than',
                'Maximum allowed text is'
              );
              compose.buttonError = textError;
            } else if (
              response.json.attachments &&
              response.json.attachments.length > 0 &&
              response.json.attachments[0].length > 0
            ) {
              let attachmentError = response.json.attachments[0];
              attachmentError = attachmentError
                .replace(
                  'Ensure this field has no more than',
                  'Maximum allowed attachments is'
                )
                .replace('elements', 'files');
              compose.buttonError = attachmentError;
            } else {
              compose.buttonError = genericError;
            }
          } else {
            compose.buttonError = genericError;
          }
        })
        .catch((error) => {
          console.error(error);
          compose.buttonError = genericError;
        });
    }
  }

  public render(): TemplateResult {
    const contactHistory = this.currentContact
      ? this.getTembaContactHistory()
      : null;
    const chatbox = this.currentContact ? this.getTembaChatbox() : null;

    const contactHistoryAndChatbox = html`
      <div class="chat-wrapper">${contactHistory} ${chatbox}</div>
    `;
    return html`${contactHistoryAndChatbox}`;
  }

  private getEndpoint() {
    return `/contact/history/${this.currentContact.uuid}/?_format=json`;
  }

  private scheduleRefresh() {
    // knock five seconds off the newest event time so we are
    // a little more aggressive about refreshing short term
    let window = new Date().getTime() - this.newestEventTime / 1000 - 5000;

    if (this.refreshId) {
      clearTimeout(this.refreshId);
      this.refreshId = null;
    }

    // wait no longer than 15 seconds
    window = Math.min(window, 15000);

    // wait at least 2 seconds
    window = Math.max(window, 2000);

    this.refreshId = setTimeout(() => {
      this.checkForNewMessages();
    }, window);
  }

  public getEventMessage(event: ContactEvent): {
    type: MessageType;
    text: string;
  } {
    switch (event.type) {
      case Events.ERROR:
      case Events.FAILURE:
        return {
          type: MessageType.Collapse,
          text: `Error during flow: ${toTitleCase(
            (event as ErrorMessageEvent).text
          )}`
        };
      case Events.TICKET_OPENED:
        return {
          type: MessageType.Inline,
          text: renderTicketAction(event as TicketEvent, 'opened')
        };
      case Events.TICKET_ASSIGNED:
        return {
          type: MessageType.Inline,
          text: renderTicketAssigned(event as TicketEvent)
        };
      case Events.TICKET_REOPENED:
        return {
          type: MessageType.Inline,
          text: renderTicketAction(event as TicketEvent, 'reopened')
        };
      case Events.TICKET_CLOSED:
        return {
          type: MessageType.Inline,
          text: renderTicketAction(event as TicketEvent, 'closed')
        };
      case Events.FLOW_ENTERED:
      case Events.FLOW_EXITED:
        return {
          type: MessageType.Collapse,
          text: renderFlowEvent(event as FlowEvent)
        };
      case Events.RUN_RESULT_CHANGED:
        return {
          type: MessageType.Collapse,
          text: renderResultEvent(event as UpdateResultEvent)
        };
      case Events.CONTACT_FIELD_CHANGED:
        return {
          type: MessageType.Collapse,
          text: renderUpdateEvent(event as UpdateFieldEvent)
        };
      case Events.CONTACT_NAME_CHANGED:
        return {
          type: MessageType.Collapse,
          text: renderNameChanged(event as NameChangedEvent)
        };
      case Events.CONTACT_URNS_CHANGED:
        return {
          type: MessageType.Collapse,
          text: renderContactURNsChanged(event as URNsChangedEvent)
        };
      case Events.EMAIL_SENT:
        return {
          type: MessageType.Collapse,
          text: renderEmailSent(event as EmailSentEvent)
        };
      case Events.INPUT_LABELS_ADDED:
        return {
          type: MessageType.Collapse,
          text: renderLabelsAdded(event as LabelsAddedEvent)
        };
      case Events.CONTACT_GROUPS_CHANGED:
        return {
          type: MessageType.Collapse,
          text: renderContactGroupsEvent(event as ContactGroupsEvent)
        };
      case Events.WEBHOOK_CALLED:
        return {
          type: MessageType.Collapse,
          text: renderWebhookEvent(event as WebhookEvent)
        };
      case Events.AIRTIME_TRANSFERRED:
        return {
          type: MessageType.Collapse,
          text: renderAirtimeTransferredEvent(event as AirtimeTransferredEvent)
        };
      case Events.CALL_STARTED:
        return { type: MessageType.Collapse, text: renderCallStartedEvent() };
      case Events.CAMPAIGN_FIRED:
        return {
          type: MessageType.Collapse,
          text: renderCampaignFiredEvent(event as CampaignFiredEvent)
        };
      case Events.CHANNEL_EVENT:
        return {
          type: MessageType.Collapse,
          text: renderChannelEvent(event as ChannelEvent)
        };
      case Events.CONTACT_LANGUAGE_CHANGED:
        return {
          type: MessageType.Collapse,
          text: renderContactLanguageChangedEvent(
            event as ContactLanguageChangedEvent
          )
        };
      case Events.OPTIN_REQUESTED:
        return {
          type: MessageType.Collapse,
          text: renderOptinRequested(event as OptinRequestedEvent)
        };
    }
    return null;
  }

  private getUserForEvent(event: MsgEvent | TicketEvent) {
    let user = null;
    if (event.created_by) {
      const storeUser = this.store.getUser(event.created_by.email);
      if (storeUser) {
        user = {
          email: event.created_by.email,
          name: [storeUser.first_name, storeUser.last_name].join(' '),
          avatar: storeUser.avatar
        };
      }
    } else if (event.type === 'msg_received') {
      user = {
        name: this.currentContact.name
      };
    }
    return user;
  }

  private createMessages(page: ContactHistoryPage) {
    let messages = page.events.map((event) => {
      const ts = new Date(event.created_on).getTime() * 1000;
      if (ts > this.newestEventTime) {
        this.newestEventTime = ts;
      }

      if (event.type === 'ticket_note_added') {
        const ticketEvent = event as TicketEvent;
        return {
          type: MessageType.Note,
          msg_id: event.created_on + event.type,
          user: this.getUserForEvent(ticketEvent),
          time: ticketEvent.created_on,
          text: ticketEvent.note
        };
      }

      if (event.type === 'msg_created' || event.type === 'msg_received') {
        const msgEvent = event as MsgEvent;
        return {
          type: msgEvent.type === 'msg_created' ? 'msg_out' : 'msg_in',
          msg_id: msgEvent.msg.id + '',
          user: this.getUserForEvent(msgEvent),
          time: msgEvent.created_on,
          text: msgEvent.msg.text
        };
      } else {
        const response = this.getEventMessage(event);
        if (response) {
          const msg_id = `${event.created_on}-${event.type}-${
            response.text ? hashCode(response.text) : 0
          }`;
          return {
            msg_id,
            type: response.type,
            text: response.text,
            time: event.created_on
          };
        }

        console.log(event);
      }
    });

    // remove any messages we don't recognize
    messages = messages.filter((msg) => !!msg);
    return messages;
  }

  private checkForNewMessages() {
    // we are already working on it
    if (this.polling) {
      return;
    }

    const chat = this.chat;
    const contactChat = this;
    if (this.currentContact && this.newestEventTime) {
      this.polling = true;
      const endpoint = this.getEndpoint();

      fetchContactHistory(
        false,
        endpoint,
        this.currentTicket?.uuid,
        null,
        this.newestEventTime
      ).then((page: ContactHistoryPage) => {
        this.lastEventTime = page.next_before;
        const messages = this.createMessages(page);
        if (messages.length === 0) {
          contactChat.blockFetching = true;
        }
        messages.reverse();
        chat.addMessages(messages, null, true);
        this.polling = false;
        this.scheduleRefresh();
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
      fetchContactHistory(
        false,
        endpoint,
        this.currentTicket?.uuid,
        this.lastEventTime
      ).then((page: ContactHistoryPage) => {
        this.lastEventTime = page.next_before;
        const messages = this.createMessages(page);
        messages.reverse();

        if (messages.length === 0) {
          contactChat.blockFetching = true;
        }
        chat.addMessages(messages);
        this.scheduleRefresh();
      });
    }
  }

  private fetchComplete() {
    this.chat.fetching = false;
  }

  private getTembaContactHistory(): TemplateResult {
    return html`<temba-chat
      @temba-scroll-threshold=${this.fetchPreviousMessages}
      @temba-fetch-complete=${this.fetchComplete}
      agent
    ></temba-chat>`;
  }

  private getTembaChatbox(): TemplateResult {
    if (this.currentTicket) {
      if (this.currentContact && this.currentContact.status !== 'active') {
        //no chatbox for archived, blocked, or stopped contacts
        return null;
      } else {
        if (!this.currentTicket.closed_on) {
          //chatbox for active contacts with an open ticket
          return this.getChatbox();
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
      return this.getChatbox();
    }
  }

  private getChatbox(): TemplateResult {
    return html`<div class="border"></div>
      <div class="chatbox">
        <temba-compose
          chatbox
          attachments
          counter
          button
          autogrow
          @temba-button-clicked=${this.handleSend.bind(this)}
        >
        </temba-compose>
      </div>`;
  }
}
