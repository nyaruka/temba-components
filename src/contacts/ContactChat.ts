/* eslint-disable @typescript-eslint/no-this-alias */
import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { Contact, CustomEventType, Ticket } from '../interfaces';
import { oxford, oxfordFn, postJSON } from '../utils';
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
import { Chat, ChatEvent, MessageType } from '../chat/Chat';
import { getUserDisplay } from '../webchat';
import { DEFAULT_AVATAR } from '../webchat/assets';

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
  TICKET_TOPIC_CHANGED = 'ticket_topic_changed',
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
    )}** ${action} a **[ticket](/ticket/all/closed/${event.ticket.uuid}/)**`;
  }
  return `A **[ticket](/ticket/all/closed/${event.ticket.uuid}/)** was **${action}**`;
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
    return `Airtime transfer failed`;
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

      .compose {
        background: #fff;
        display: flex;
        flex-direction: column;
        --textarea-min-height: 8em;
        --textarea-height: 0.5em;
        --widget-box-shadow-focused: none;
        --compose-curvature: 0px;
        border-top: 1px solid #e6e6e6;
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
      }

      temba-compose {
        border-top-right-radius: 0;
        border-top-left-radius: 0;
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

  @property({ type: String })
  avatar = DEFAULT_AVATAR;

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
    if (this.chat) {
      this.chat.reset();
    }
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
    const tembaCompose = this.currentContact ? this.getTembaCompose() : null;

    const contactHistoryAndChatbox = html`
      <div class="chat-wrapper">${contactHistory} ${tembaCompose}</div>
    `;
    return html`${contactHistoryAndChatbox}`;
  }

  private getEndpoint() {
    return `/contact/history/${this.contact}/?_format=json`;
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

  public getEventMessage(event: ContactEvent): ChatEvent {
    let message = null;
    switch (event.type) {
      case Events.ERROR:
      case Events.FAILURE:
        message = {
          type: MessageType.Inline,
          text: `Error during flow: ${toTitleCase(
            (event as ErrorMessageEvent).text
          )}`
        };
        break;
      case Events.TICKET_OPENED:
        message = {
          type: MessageType.Inline,
          text: renderTicketAction(event as TicketEvent, 'opened')
        };
        break;
      case Events.TICKET_ASSIGNED:
        message = {
          type: MessageType.Inline,
          text: renderTicketAssigned(event as TicketEvent)
        };
        break;
      case Events.TICKET_REOPENED:
        message = {
          type: MessageType.Inline,
          text: renderTicketAction(event as TicketEvent, 'reopened')
        };
        break;
      case Events.TICKET_CLOSED:
        message = {
          type: MessageType.Inline,
          text: renderTicketAction(event as TicketEvent, 'closed')
        };
        break;
      case Events.TICKET_TOPIC_CHANGED:
        message = {
          type: MessageType.Inline,
          text: `Topic changed to **${(event as TicketEvent).topic.name}**`
        };
        break;
      case Events.FLOW_ENTERED:
      case Events.FLOW_EXITED:
        message = {
          type: MessageType.Inline,
          text: renderFlowEvent(event as FlowEvent)
        };
        break;
      case Events.RUN_RESULT_CHANGED:
        message = {
          type: MessageType.Inline,
          text: renderResultEvent(event as UpdateResultEvent)
        };
        break;
      case Events.CONTACT_FIELD_CHANGED:
        message = {
          type: MessageType.Inline,
          text: renderUpdateEvent(event as UpdateFieldEvent)
        };
        break;
      case Events.CONTACT_NAME_CHANGED:
        message = {
          type: MessageType.Inline,
          text: renderNameChanged(event as NameChangedEvent)
        };
        break;
      case Events.CONTACT_URNS_CHANGED:
        message = {
          type: MessageType.Inline,
          text: renderContactURNsChanged(event as URNsChangedEvent)
        };
        break;
      case Events.EMAIL_SENT:
        message = {
          type: MessageType.Inline,
          text: renderEmailSent(event as EmailSentEvent)
        };
        break;
      case Events.INPUT_LABELS_ADDED:
        message = {
          type: MessageType.Inline,
          text: renderLabelsAdded(event as LabelsAddedEvent)
        };
        break;
      case Events.CONTACT_GROUPS_CHANGED:
        message = {
          type: MessageType.Inline,
          text: renderContactGroupsEvent(event as ContactGroupsEvent)
        };
        break;
      case Events.WEBHOOK_CALLED:
        message = {
          type: MessageType.Inline,
          text: renderWebhookEvent(event as WebhookEvent)
        };
        break;
      case Events.AIRTIME_TRANSFERRED:
        message = {
          type: MessageType.Inline,
          text: renderAirtimeTransferredEvent(event as AirtimeTransferredEvent)
        };
        break;
      case Events.CALL_STARTED:
        message = {
          type: MessageType.Inline,
          text: renderCallStartedEvent()
        };
        break;
      case Events.CAMPAIGN_FIRED:
        message = {
          type: MessageType.Inline,
          text: renderCampaignFiredEvent(event as CampaignFiredEvent)
        };
        break;
      case Events.CHANNEL_EVENT:
        message = {
          type: MessageType.Inline,
          text: renderChannelEvent(event as ChannelEvent)
        };
        break;
      case Events.CONTACT_LANGUAGE_CHANGED:
        message = {
          type: MessageType.Inline,
          text: renderContactLanguageChangedEvent(
            event as ContactLanguageChangedEvent
          )
        };
        break;
      case Events.OPTIN_REQUESTED:
        message = {
          type: MessageType.Inline,
          text: renderOptinRequested(event as OptinRequestedEvent)
        };
        break;
    }

    if (message && event.created_on) {
      message.date = new Date(event.created_on);
    } else {
      console.error('Unknown event type', event);
    }

    return message;
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

  private createMessages(page: ContactHistoryPage): ChatEvent[] {
    if (page.events) {
      let messages = [];
      page.events.forEach((event) => {
        const ts = new Date(event.created_on).getTime() * 1000;
        if (ts > this.newestEventTime) {
          this.newestEventTime = ts;
        }

        if (event.type === 'ticket_note_added') {
          const ticketEvent = event as TicketEvent;
          messages.push({
            type: MessageType.Note,
            id: event.created_on + event.type,
            user: this.getUserForEvent(ticketEvent),
            date: new Date(ticketEvent.created_on),
            text: ticketEvent.note
          });
        } else if (event.type === 'ticket_opened') {
          // ticket open events can have a note attached
          const ticketEvent = event as TicketEvent;
          messages.push({
            type: MessageType.Note,
            id: event.created_on + event.type + '_note',
            user: this.getUserForEvent(ticketEvent),
            date: new Date(ticketEvent.created_on),
            text: ticketEvent.note
          });

          // but the opening of the ticket is a normal event
          messages.push(this.getEventMessage(event));
        } else if (
          event.type === 'msg_created' ||
          event.type === 'msg_received' ||
          event.type === 'broadcast_created'
        ) {
          const msgEvent = event as MsgEvent;
          messages.push({
            type: msgEvent.type === 'msg_received' ? 'msg_in' : 'msg_out',
            id: msgEvent.msg.id + '',
            user: this.getUserForEvent(msgEvent),
            date: new Date(msgEvent.created_on),
            attachments: msgEvent.msg.attachments,
            text: msgEvent.msg.text,
            sendError: msgEvent.status === 'E' || msgEvent.status === 'F',
            popup: html`<div
              style="display: flex; flex-direction: row; align-items:center; justify-content: space-between;font-size:0.9em;line-height:1em;min-width:10em"
            >
              <div style="justify-content:left;text-align:left">
                <temba-date
                  value=${msgEvent.created_on}
                  display="duration"
                ></temba-date>

                ${msgEvent.optin
                  ? html`<div style="font-size:0.9em;color:#aaa">
                      ${msgEvent.optin.name}
                    </div>`
                  : null}
                ${msgEvent.failed_reason_display
                  ? html`
                      <div
                        style="margin-top:0.2em;margin-right: 0.5em;min-width:10em;max-width:15em;color:var(--color-error);font-size:0.9em"
                      >
                        ${msgEvent.failed_reason_display}
                      </div>
                    `
                  : null}
              </div>
              ${msgEvent.logs_url
                ? html`<a style="margin-left:0.5em" href="${msgEvent.logs_url}"
                    ><temba-icon name="log"></temba-icon
                  ></a>`
                : null}
            </div> `
          });
        } else {
          messages.push(this.getEventMessage(event));
        }
      });

      // remove any messages we don't recognize
      messages = messages.filter((msg) => !!msg);
      return messages as ChatEvent[];
    }
    return [];
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

      const fetchContact = this.currentContact.uuid;

      fetchContactHistory(
        false,
        endpoint,
        this.currentTicket?.uuid,
        null,
        this.newestEventTime
      ).then((page: ContactHistoryPage) => {
        if (fetchContact === this.currentContact.uuid) {
          this.lastEventTime = page.next_before;
          const messages = this.createMessages(page);
          if (messages.length === 0) {
            contactChat.blockFetching = true;
          }
          messages.reverse();
          chat.addMessages(messages, null, true);
        }
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
      avatar=${this.avatar}
      agent
    ></temba-chat>`;
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
