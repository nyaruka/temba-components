import { css, html, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { Contact, CustomEventType, Ticket } from '../interfaces';
import { COOKIE_KEYS, getCookieBoolean, postJSON } from '../utils';
import { ContactHistory } from './ContactHistory';
import { ContactStoreElement } from './ContactStoreElement';
import { Compose } from '../compose/Compose';

const DEFAULT_REFRESH = 10000;

export class ContactChat extends ContactStoreElement {
  public static get styles() {
    return css`
      .left-pane {
        box-shadow: -13px 10px 7px 14px rgba(0, 0, 0, 0);
        transition: box-shadow 600ms linear;
      }

      .left-pane.open {
        z-index: 1000;
      }

      :host {
        flex-grow: 1;
        display: flex;
        flex-direction: row;
        min-height: 0;
        border-radius: var(--curvature);
      }

      .chat-wrapper {
        display: flex;
        flex-grow: 1;
        flex-direction: column;
        overflow: hidden;
        min-height: 0;
        border-radius: var(--curvature);
      }

      temba-contact-history {
        border-bottom: 3px solid #e1e1e1;
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }

      .chatbox {
        background: rgb(242, 242, 242);
        padding: 1em;
        display: flex;
        flex-direction: column;
        z-index: 3;
        border-bottom-left-radius: var(--curvature);
        border-bottom-right-radius: var(--curvature);
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

  // http promise to monitor for completeness
  public httpComplete: Promise<void>;

  constructor() {
    super();
    this.showDetails = getCookieBoolean(COOKIE_KEYS.TICKET_SHOW_DETAILS);
  }

  refreshInterval = null;

  public connectedCallback() {
    super.connectedCallback();
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
  }

  private handleSend(evt: CustomEvent) {
    const buttonName = evt.detail.name;
    if (buttonName === 'Send') {
      const payload = {
        contact: this.currentContact.uuid,
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
            attachment => attachment.uuid
          );
          payload['attachments'] = attachment_uuids;
        }
      }
      if (this.currentTicket) {
        payload['ticket'] = this.currentTicket.uuid;
      }

      const genericError = buttonName + ' failed, please try again.';

      postJSON(`/api/v2/messages.json`, payload)
        .then(response => {
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
        .catch(error => {
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

    const contactHistoryAndChatbox = html`<div
      style="flex-grow: 1; margin-right: 0em; display:flex; flex-direction:row; min-height: 0;"
      class="left-pane  ${this.showDetails ? 'open' : ''}"
    >
      <div class="chat-wrapper">${contactHistory} ${chatbox}</div>
    </div>`;
    return html`${contactHistoryAndChatbox}`;
  }

  private getTembaContactHistory(): TemplateResult {
    return html` <temba-contact-history
      .uuid=${this.currentContact.uuid}
      .contact=${this.currentContact}
      .ticket=${this.currentTicket ? this.currentTicket.uuid : null}
      .endDate=${this.currentTicket ? this.currentTicket.closed_on : null}
      .agent=${this.agent}
    >
    </temba-contact-history>`;
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
    return html`<div class="chatbox">
      <temba-compose
        chatbox
        attachments
        counter
        button
        @temba-button-clicked=${this.handleSend.bind(this)}
      >
      </temba-compose>
    </div>`;
  }
}
