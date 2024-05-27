/* eslint-disable @typescript-eslint/no-this-alias */
import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { Contact, CustomEventType, Ticket } from '../interfaces';
import { postJSON } from '../utils';
import { ContactHistory } from './ContactHistory';
import { ContactStoreElement } from './ContactStoreElement';
import { Compose } from '../compose/Compose';
import { fetchContactHistory } from './helpers';
import { ContactHistoryPage, MsgEvent } from './events';
import { Chat } from '../chat/Chat';

const DEFAULT_REFRESH = 10000;

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

  @property({ type: Boolean })
  monitor = false;

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

  constructor() {
    super();
  }

  refreshInterval = null;

  public firstUpdated(
    changed: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.firstUpdated(changed);
  }

  public connectedCallback() {
    super.connectedCallback();

    this.chat = this.shadowRoot.querySelector('temba-chat');

    if (this.monitor) {
      this.refreshInterval = setInterval(() => {
        if (this.currentTicket && this.currentTicket.closed_on) {
          return;
        }
        this.refresh();
      }, DEFAULT_REFRESH);
    }
  }

  public disconnectedCallback() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  public getContactHistory(): ContactHistory {
    return this.shadowRoot.querySelector(
      'temba-contact-history'
    ) as ContactHistory;
  }

  public refresh(scrollToBottom = false): void {
    const contactHistory = this.getContactHistory();
    if (contactHistory) {
      if (scrollToBottom) {
        contactHistory.scrollToBottom();
      }
      contactHistory.refresh();
      // super.refresh();
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
      this.fetchPreviousMessages();
    }
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
            compose.reset();
            this.refresh(true);
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

  ticket = null;
  lastEventTime = null;

  private fetchPreviousMessages() {
    const chat = this.chat;
    const contactChat = this;

    if (!chat || chat.fetching || contactChat.blockFetching) {
      return;
    }

    chat.fetching = true;
    if (this.currentContact) {
      const endpoint = `/contact/history/${this.currentContact.uuid}/?_format=json`;
      fetchContactHistory(
        false,
        endpoint,
        this.ticket,
        this.lastEventTime
      ).then((page: ContactHistoryPage) => {
        this.lastEventTime = page.next_before;
        let messages = page.events.map((event) => {
          if (event.type === 'msg_created' || event.type === 'msg_received') {
            const msgEvent = event as MsgEvent;
            let user = null;

            if (msgEvent.created_by) {
              const storeUser = this.store.getUser(msgEvent.created_by.email);
              if (storeUser) {
                user = {
                  email: msgEvent.created_by.email,
                  name: [storeUser.first_name, storeUser.last_name].join(' '),
                  avatar: storeUser.avatar
                };
              }
            }

            return {
              type: msgEvent.type === 'msg_created' ? 'msg_out' : 'msg_in',
              msg_id: msgEvent.msg.id + '',
              user: user,
              time: msgEvent.created_on,
              text: msgEvent.msg.text
            };
          }
        });

        // remove any messages we don't recognize
        messages = messages.filter((msg) => !!msg);
        messages.reverse();

        if (messages.length === 0) {
          contactChat.blockFetching = true;
        }
        chat.addMessages(messages);
      });
    }
  }

  private fetchComplete() {
    this.chat.fetching = false;
  }

  private getTembaContactHistory(): TemplateResult {
    return html` <temba-chat
      @temba-scroll-threshold=${this.fetchPreviousMessages}
      @temba-fetch-complete=${this.fetchComplete}
    ></temba-chat>`;
    /*
    return html` <temba-contact-history
      .uuid=${this.currentContact.uuid}
      .contact=${this.currentContact}
      .ticket=${this.currentTicket ? this.currentTicket.uuid : null}
      .endDate=${this.currentTicket ? this.currentTicket.closed_on : null}
      .agent=${this.agent}
    >
    </temba-contact-history>`;
    */
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
