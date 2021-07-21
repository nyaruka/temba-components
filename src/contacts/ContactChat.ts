import { css, html, property, TemplateResult } from 'lit-element';
import { RapidElement } from '../RapidElement';
import { Contact, CustomEventType, Ticket } from '../interfaces';
import { COOKIE_KEYS, getCookieBoolean, postJSON, setCookie } from '../utils';
import { TextInput } from '../textinput/TextInput';
import { Completion } from '../completion/Completion';
import { ContactHistory } from './ContactHistory';
import { Modax } from '../dialog/Modax';

export class ContactChat extends RapidElement {
  public static get styles() {
    return css`
      :host {
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.2),
          0 1px 2px 0 rgba(0, 0, 0, 0.06);

        height: 100%;
        border-radius: 0.5rem;

        flex-grow: 1;
        width: 100%;
        display: block;
        background: #f2f2f2;
        overflow: hidden;
      }

      .chat-wrapper {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #fff;
        overflow: hidden;
        border-radius: var(--curvature);
      }

      .chatbox {
        padding: 1em;
        background: #f2f2f2;
        border-top: 3px solid #e1e1e1;
        display: flex;
        flex-direction: column;
        z-index: 3;
      }

      .closed-footer {
        padding: 1em;
        background: #f2f2f2;
        border-top: 3px solid #e1e1e1;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      temba-completion {
        --textarea-height: 2.5em;
      }

      a {
        color: var(--color-link-primary);
      }

      a:hover {
        text-decoration: underline;
        color: var(--color-link-primary-hover);
      }

      temba-button#send-button {
        --button-y: 1px;
        --button-x: 12px;
        margin-top: 0.8em;
        align-self: flex-end;
      }

      temba-button#reopen-button {
        --button-y: 1px;
        --button-x: 12px;
      }

      .toolbar {
        position: relative;
        width: 2em;
        background: #f2f2f2;
        transition: all 600ms ease-in;
        z-index: 10;
        box-shadow: -1px 0px 6px 1px rgba(0, 0, 0, 0.1);
        flex-shrink: 0;
        border-top-right-radius: 0.5em;
        border-bottom-right-radius: 0.5em;
        padding: 0.5em 0;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .toolbar temba-icon {
        fill: rgb(60, 60, 60);
        margin-bottom: 0.5em;
      }

      .toolbar.closed {
        box-shadow: -1px 0px 1px 1px rgba(0, 0, 0, 0);
      }

      temba-contact-details {
        flex-basis: 16em;
        flex-grow: 0;
        flex-shrink: 0;
        transition: margin 600ms cubic-bezier(0.68, -0.55, 0.265, 1.05);
        z-index: 5;
        margin-right: -2.5em;
      }

      temba-contact-details.hidden {
        margin-right: -16em;
      }

      @media only screen and (max-width: 768px) {
        temba-contact-details {
          flex-basis: 12em;
          flex-shrink: 0;
        }

        temba-contact-details.hidden {
          margin-right: -12em;
        }
      }

      #close-button,
      #open-button {
        margin-top: 1em;
      }

      #details-button {
        margin-top: 0.25em;
        transform: rotate(180deg);
      }

      #note-dialog,
      #assign-dialog {
        --header-bg: rgb(255, 249, 194);
        --header-text: #555;
        --textarea-height: 5em;
      }
    `;
  }

  @property({ type: Object })
  contact: Contact = null;

  @property({ type: String })
  contactsEndpoint = '/api/v2/contacts.json';

  @property({ type: String })
  currentChat = '';

  @property({ type: String })
  currentNote = '';

  @property({ type: Boolean })
  showDetails = true;

  @property({ type: Object })
  currentTicket: Ticket = null;

  @property({ type: Number })
  agent = -1;

  constructor() {
    super();
    this.showDetails = getCookieBoolean(COOKIE_KEYS.TICKET_SHOW_DETAILS);
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
    }
  }

  public updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    // if we don't have an endpoint infer one
    if (changedProperties.has('contact')) {
      // focus our completion on load
      const prevContact = changedProperties.get('contact');
      if (
        !prevContact ||
        (this.contact && this.contact.ticket.uuid !== prevContact.ticket.uuid)
      ) {
        const completion = this.shadowRoot.querySelector(
          'temba-completion'
        ) as Completion;
        if (completion) {
          window.setTimeout(() => {
            completion.click();
          }, 0);
        }
      }
    }
  }

  private handleChatChange(event: Event) {
    event.stopPropagation();
    event.preventDefault();

    const chat = event.currentTarget as TextInput;
    this.currentChat = chat.value;
  }

  private handleReopen() {
    const uuid = this.contact.ticket.uuid;
    postJSON(`/api/v2/tickets.json?uuid=${uuid}`, {
      status: 'open',
    })
      .then(() => {
        this.refresh();
        this.fireCustomEvent(CustomEventType.ContentChanged, {
          ticket: { uuid, status: 'open' },
        });
      })
      .catch((response: any) => {
        console.error(response);
      });
  }

  private handleSend() {
    postJSON(`/api/v2/broadcasts.json`, {
      contacts: [this.contact.uuid],
      text: this.currentChat,
      ticket: this.currentTicket.uuid,
    })
      .then(() => {
        this.currentChat = '';
        this.refresh(true);
      })
      .catch(err => {
        // error message dialog?
        console.error(err);
      });
  }

  private handleTicketAssigned() {
    this.refresh();
    this.getContactHistory().checkForAgentTakeEvent(this.agent);
  }

  private handleDetailSlider(): void {
    this.showDetails = !this.showDetails;
    setCookie(COOKIE_KEYS.TICKET_SHOW_DETAILS, this.showDetails);
  }

  private handleCurrentTicketChanged(event: CustomEvent): void {
    this.currentTicket = event.detail.context;
  }

  public render(): TemplateResult {
    return html`
      <div style="display: flex; height: 100%;">
        <div style="flex-grow: 1; margin-right: 0em;">
          <div class="chat-wrapper">
            ${this.contact
              ? html` <temba-contact-history
                    .uuid=${this.contact.uuid}
                    .ticket=${this.contact.ticket.uuid}
                    .endDate=${this.contact.ticket.closed_on}
                    .agent=${this.agent}
                    @temba-context-changed=${this.handleCurrentTicketChanged}
                  ></temba-contact-history>

                  ${
                    this.contact.ticket.closed_on
                      ? html`<div class="closed-footer">
                          <temba-button
                            id="reopen-button"
                            name="Reopen"
                            @click=${this.handleReopen}
                          ></temba-button>
                        </div>`
                      : html` <div class="chatbox">
                          <temba-completion
                            @change=${this.handleChatChange}
                            .value=${this.currentChat}
                            @keydown=${(e: KeyboardEvent) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                const chat = e.target as Completion;
                                if (!chat.hasVisibleOptions()) {
                                  this.handleSend();
                                  e.preventDefault();
                                  e.stopPropagation();
                                }
                              }
                            }}
                            textarea
                          >
                          </temba-completion>
                          <temba-button
                            id="send-button"
                            name="Send"
                            @click=${this.handleSend}
                            ?disabled=${this.currentChat.trim().length === 0}
                          ></temba-button>
                        </div>`
                  }
                  </div>`
              : null}
          </div>
        </div>
        ${this.contact
          ? html`<temba-contact-details
              style="z-index: 10"
              class="${this.showDetails ? '' : 'hidden'}"
              .uuid="${this.contact.uuid}"
              .name="${this.contact.name}"
              .visible=${this.showDetails}
              .ticket=${this.currentTicket}
              endpoint="${this.contactsEndpoint}?uuid=${this.contact.uuid}"
            ></temba-contact-details>`
          : null}

        <div class="toolbar ${this.showDetails ? '' : 'closed'}">
          ${this.contact
            ? html`
                <temba-tip
                  style="margin-top:5px"
                  text="${this.showDetails ? 'Hide Details' : 'Show Details'}"
                  position="left"
                  hideOnChange
                >
                  <temba-icon
                    id="details-button"
                    name="${this.showDetails ? 'chevrons-left' : 'sidebar'}"
                    @click="${this.handleDetailSlider}"
                    clickable
                    animatechange="spin"
                  ></temba-icon>
                </temba-tip>

                ${this.currentTicket
                  ? html`<temba-tip
                        style="margin-top:5px"
                        text="Assign"
                        position="left"
                      >
                        <temba-icon
                          id="assign-button"
                          name="user"
                          @click="${() => {
                            const modax = this.shadowRoot.getElementById(
                              'assign-dialog'
                            ) as Modax;
                            modax.open = true;
                          }}"
                          clickable
                        ></temba-icon>
                      </temba-tip>
                      <temba-tip
                        style="margin-top:5px"
                        text="Add Note"
                        position="left"
                      >
                        <temba-icon
                          id="add-note-button"
                          name="edit"
                          @click="${() => {
                            const note = this.shadowRoot.getElementById(
                              'note-dialog'
                            ) as Modax;
                            note.open = true;
                          }}"
                          clickable
                        ></temba-icon>
                      </temba-tip>`
                  : null}
              `
            : null}
        </div>
      </div>

      ${this.currentTicket
        ? html`<temba-modax
              header="Add Note"
              id="note-dialog"
              @temba-submitted=${this.refresh}
              endpoint="/ticket/note/${this.currentTicket.uuid}/"
            ></temba-modax>
            <temba-modax
              header="Assign Ticket"
              id="assign-dialog"
              @temba-submitted=${this.handleTicketAssigned}
              endpoint="/ticket/assign/${this.currentTicket.uuid}/"
            /></temba-modax>`
        : null}
    `;
  }
}
