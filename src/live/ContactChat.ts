/* eslint-disable @typescript-eslint/no-this-alias */
import {
  css,
  html,
  nothing,
  PropertyValueMap,
  PropertyValues,
  TemplateResult
} from 'lit';
import { property } from 'lit/decorators.js';
import { msg } from '@lit/localize';
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
  postJSON,
  postUrl,
  WebResponse
} from '../utils';
import { ContactStoreElement } from './ContactStoreElement';
import { Compose, ComposeValue } from '../form/Compose';
import { ContactHistoryPage } from '../events';
import {
  Chat,
  MessageType,
  ContactEvent,
  MsgEvent,
  TypingEvent
} from '../display/Chat';
import { DEFAULT_AVATAR } from '../webchat/assets';
import { UserSelect } from '../form/select/UserSelect';
import { Select } from '../form/select/Select';
import {
  renderEvent,
  renderTicketAction,
  renderTicketAssigneeChanged
} from '../events/eventRenderers';
import { publishToSocket } from './SocketService';
import { subscribeToContactHistory, RealtimeSubscription } from './Realtime';

// how often we re-publish typing_started while composing - just inside the
// tightest platform sustain interval (Telegram's indicator lapses after 5s)
const TYPING_PULSE_INTERVAL = 4000;

// re-export for backwards compatibility
export { renderTicketAction, renderTicketAssigneeChanged };

interface SearchResult {
  uuid: string;
  type: string;
  created_on: string;
  msg?: any;
  _user?: any;
  [key: string]: any;
}

export class ContactChat extends ContactStoreElement {
  public static get styles() {
    return css`
      :host {
        flex-grow: 1;
        display: flex;
        flex-direction: row;
        min-height: 0;
        margin-top: var(--gap);
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
        background: var(--surface);
        border: 1px solid var(--border-strong);
        border-radius: var(--r-sm);
        box-shadow: var(--shadow-2);
        overflow: hidden;
      }

      temba-contact-history {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }

      .compose {
        display: flex;
        flex-direction: column;
        --compose-border: 1px solid #e1e1e1;
        --compose-curvature: 6px;
        margin: 0.5em;
        background: #f9f9f9;
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
        --color-chat-out: var(--color-message);
        transition: opacity 0.15s ease;
      }

      .chat-container {
        position: relative;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        min-height: 0;
      }

      @keyframes search-slide-in {
        from {
          max-height: 0;
          opacity: 0;
          padding-top: 0;
          padding-bottom: 0;
        }
        to {
          max-height: 3em;
          opacity: 1;
          padding-top: 0.5em;
          padding-bottom: 0.5em;
        }
      }

      @keyframes search-slide-out {
        from {
          max-height: 3em;
          opacity: 1;
          padding-top: 0.5em;
          padding-bottom: 0.5em;
        }
        to {
          max-height: 0;
          opacity: 0;
          padding-top: 0;
          padding-bottom: 0;
        }
      }

      .search-overlay {
        display: flex;
        align-items: center;
        gap: 0.25em;
        padding: 1em 1em;
        border-bottom: 1px solid #ddd;
        overflow: hidden;
        animation: search-slide-in 0.15s ease-out;
      }

      .search-overlay.closing {
        animation: search-slide-out 0.15s ease-in forwards;
      }

      .search-input-wrapper {
        flex-grow: 1;
        min-width: 0;
        position: relative;
        margin-right: 0.5em;
      }

      .search-input {
        --temba-textinput-padding: 6px 28px 6px 8px;
      }

      .search-go {
        position: absolute;
        right: 4px;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        align-items: center;
        justify-content: center;
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.15em;
        border-radius: 3px;
        color: #999;
        z-index: 1;
      }

      .search-go:hover {
        color: #333;
      }

      .search-go:disabled {
        opacity: 0.3;
        cursor: default;
      }

      .search-counter {
        font-size: 11px;
        color: #666;
        white-space: nowrap;
        min-width: 3em;
        text-align: center;
      }

      .search-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.25em;
        border-radius: 4px;
        color: #666;
        font-size: 11px;
      }

      .search-btn:hover,
      .search-btn.enter-target:not(:disabled) {
        background: rgba(0, 0, 0, 0.08);
        color: #333;
      }

      .search-btn:disabled {
        opacity: 0.3;
        cursor: default;
      }

      .search-btn:disabled:hover {
        background: none;
      }

      .search-no-results {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #999;
        font-size: 14px;
        text-align: center;
        pointer-events: none;
        z-index: 5;
      }

      .search-toggle {
        position: absolute;
        top: 0.5em;
        right: 1.5em;
        z-index: 5;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid #ddd;
        border-radius: 50%;
        width: 2em;
        height: 2em;
        cursor: pointer;
        color: #888;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .search-toggle:hover {
        background: #fff;
        color: #333;
        border-color: #ccc;
      }

      /* "Currently in [flow]" treatment.
         Lives in the chat footer to advertise the active run with an
         optional Interrupt action (the chip's X). Sized to its
         contents only (inline-flex) so the chat scrollbar to the
         right remains clickable, and pointer-events:none on the
         wrapping footer means the rest of the row doesn't intercept
         scrollbar drags either. Translucent white bg + backdrop
         blur keeps the chat history legible through the chip. */
      .in-flow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 0.4em 0.75em;
        margin: 0.5em;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.75);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        box-shadow: var(--shadow-1);
      }

      .flow-footer {
        text-align: center;
        pointer-events: none;
        /* The chat history has a scrollbar on the right edge; the
           footer overlay spans the full container width, so centering
           inside it lands the chip slightly right-of-center relative
           to the visible message area. Reserve the scrollbar width on
           the right so the chip is centered to what the user sees. */
        padding-right: 15px;
      }

      .flow-footer .in-flow {
        pointer-events: auto;
      }

      .in-flow .flow-name {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        /* Match the chat history event text — same hue + size — so
           the "Currently in" line reads as one of the events rather
           than its own UI chrome. */
        font-size: 13.5px;
        color: #8e8e93;
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

      /* Keep the assignment + topic controls the same height as the
         Close button so the row reads as one strip. Shrink the user
         avatars (--temba-scale) so they fit in the smaller box. */
      .in-ticket temba-user-select,
      .in-ticket temba-select {
        --temba-select-min-height: 28px;
      }

      .in-ticket temba-user-select {
        --temba-scale: 0.75;
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

  // uuid of the logged-in user, used to filter out our own typing events
  // (publications are echoed to all subscribers, including the publisher)
  @property({ type: String, attribute: 'user' })
  userUuid = '';

  @property({ type: Boolean })
  blockFetching = false;

  @property({ type: Boolean })
  showInterrupt = false;

  @property({ type: Boolean })
  disableAssign = false;

  @property({ type: Boolean })
  disableReply = false;

  @property({ type: Boolean })
  showSearch = false;

  @property({ type: String })
  avatar = DEFAULT_AVATAR;

  @property({ type: String })
  set showMessageLogsAfter(value: string) {
    const oldValue = this._showMessageLogsAfter;
    this._showMessageLogsAfter = value ? new Date(value) : null;
    this.requestUpdate('showMessageLogsAfter', oldValue);
  }

  get showMessageLogsAfter(): Date {
    return this._showMessageLogsAfter;
  }

  private _showMessageLogsAfter: Date = null;

  @property({ type: String })
  errorMessage: string;

  @property({ type: Boolean, attribute: false })
  searchMode = false;

  @property({ type: String, attribute: false })
  searchQuery = '';

  @property({ type: Array, attribute: false })
  searchResults: SearchResult[] = [];

  @property({ type: Number, attribute: false })
  searchIndex = -1;

  @property({ type: Boolean, attribute: false })
  searchLoading = false;

  @property({ type: Boolean, attribute: false })
  searchFocused = false;

  @property({ type: Boolean, attribute: false })
  searchClosing = false;

  @property({ type: Boolean, attribute: false })
  searchNoResults = false;

  // http promise to monitor for completeness
  public httpComplete: Promise<void>;
  private chat: Chat;

  ticket = null;
  beforeUUID: string = null; // for scrolling back through history
  afterUUID: string = null; // newest event seen, for catch-up fetches

  // live history subscriptions by topic for the current contact (and ticket)
  private subscriptions = new Map<string, RealtimeSubscription>();
  private fetchingMissed = false;

  // the contact's most recent incoming message, tracked for the external id
  // that typing publications carry (WhatsApp expresses typing as an operation
  // on the contact's last incoming message)
  private lastIncomingMsgOn: Date = null;
  private lastIncomingMsgExternalId: string = null;

  // typing publication state - the pulse interval while the agent is
  // composing, and whether publishing was denied for this conversation
  private typingChannel: string = null;
  private typingPulse: number = null;
  private typingDisabled = false;

  constructor() {
    super();
  }

  public willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);

    if (changed.has('data')) {
      this.currentContact = this.data;
    }

    if (changed.has('currentContact') && this.currentContact) {
      const prev = changed.get('currentContact') as Contact | undefined;
      if (this.currentContact.uuid !== prev?.uuid) {
        this.blockFetching = false;
        this.errorMessage = null;
      }
    }
  }

  public firstUpdated(
    changed: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.firstUpdated(changed);
  }

  public connectedCallback() {
    super.connectedCallback();
    this.chat = this.shadowRoot.querySelector('temba-chat');
    this.updateSubscriptions();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this.stopTyping();
    this.unsubscribeAll();
  }

  public updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    if (
      changedProperties.has('currentContact') ||
      changedProperties.has('currentTicket')
    ) {
      this.updateSubscriptions();
    }

    if (changedProperties.has('currentContact') && this.currentContact) {
      this.chat = this.shadowRoot.querySelector('temba-chat');
      if (
        this.currentContact.uuid !==
        changedProperties.get('currentContact')?.uuid
      ) {
        this.reset();
      } else {
        this.fetchMissedEvents();
      }
      this.fetchPreviousMessages();
    }
  }

  private unsubscribeAll() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions.clear();
  }

  /**
   * Keeps our socket subscriptions in sync with the current contact and
   * ticket. New events arrive as they happen on "history:<contact-uuid>";
   * ticket detail events (notes, assignment, topic) only arrive on
   * "history:<contact-uuid>:<ticket-uuid>" so we subscribe to both when
   * viewing a ticket. Only the channels that actually changed are touched,
   * so switching tickets on the same contact leaves the contact channel
   * continuously subscribed with no gap in delivery.
   */
  private updateSubscriptions() {
    const topics = new Map<string, { contact: string; ticket: string }>();
    if (this.isConnected && this.currentContact) {
      const contact = this.currentContact.uuid;
      topics.set(contact, { contact, ticket: null });

      // on a contact switch the new ticket is set before the new contact has
      // finished fetching, so hold off on the ticket channel until they match
      // - a ticket paired with another contact's channel is denied server-side
      const contactPending = this.contact && this.contact !== contact;
      if (this.currentTicket && !contactPending) {
        topics.set(`${contact}:${this.currentTicket.uuid}`, {
          contact,
          ticket: this.currentTicket.uuid
        });
      }
    }

    // drop subscriptions we no longer need
    this.subscriptions.forEach((sub, key) => {
      if (!topics.has(key)) {
        sub.unsubscribe();
        this.subscriptions.delete(key);
      }
    });

    // add any new ones
    topics.forEach((topic, key) => {
      if (!this.subscriptions.has(key)) {
        this.subscriptions.set(
          key,
          subscribeToContactHistory(
            topic.contact,
            topic.ticket,
            (data: any) => this.handleSocketEvent(data),
            // on every (re)subscribe fetch anything we might have missed
            () => this.fetchMissedEvents()
          )
        );
      }
    });
  }

  private handleSocketEvent(event: any) {
    // while searching we're viewing an arbitrary point in history, new
    // events will be picked up by the refetch when search closes
    if (!this.chat || this.searchMode || !this.currentContact) {
      return;
    }

    // typing events are ephemeral indicator state, not history
    if (event.type === 'typing_started' || event.type === 'typing_stopped') {
      this.handleTypingEvent(event);
      return;
    }

    const messages = this.createMessages({ events: [event], next: null });
    if (messages.length > 0) {
      this.chat.addMessages(messages, null, true);
    }
  }

  private handleTypingEvent(event: TypingEvent) {
    // our own publications are echoed back to us - ignore them
    if (event._user && this.userUuid && event._user.uuid === this.userUuid) {
      return;
    }

    event.created_on = new Date(event.created_on);
    this.resolveUserAvatar(event);

    if (event.type === 'typing_started') {
      this.chat.setTyping(event);
    } else {
      this.chat.clearTyping(event);
    }
  }

  /**
   * Fired as the agent edits the compose box. Composing (any text present)
   * keeps typing_started pulses going on the contact's history channel;
   * emptying the box (including via a send) publishes typing_stopped.
   */
  private handleComposeChanged(evt: CustomEvent) {
    // temba-compose's ContentChanged detail is its langValues map keyed by
    // language, and it drops a language entry when that value empties. Derive
    // composing across all languages so this doesn't hinge on a hardcoded key.
    const composing = Object.values(evt.detail || {}).some((v: any) =>
      v?.text?.trim()
    );
    if (composing) {
      this.startTyping();
    } else {
      this.stopTyping();
    }
  }

  private getTypingPayload(type: string) {
    const payload: any = { type };
    if (this.lastIncomingMsgExternalId) {
      payload.msg_external_id = this.lastIncomingMsgExternalId;
    }
    return payload;
  }

  private startTyping() {
    if (this.typingDisabled || this.typingPulse || !this.currentContact) {
      return;
    }

    // publications are only allowed on the contact-level channel
    this.typingChannel = `history:${this.currentContact.uuid}`;
    this.sendTypingPulse();
    this.typingPulse = window.setInterval(
      () => this.sendTypingPulse(),
      TYPING_PULSE_INTERVAL
    );
  }

  private sendTypingPulse() {
    // the interval can fire once after clearTypingPulse() nulled the channel
    if (!this.typingChannel) {
      return;
    }
    const channel = this.typingChannel;
    publishToSocket(channel, this.getTypingPayload('typing_started')).catch(
      (error: any) => {
        // a temporary server error just costs us this pulse - a denial means
        // something is genuinely wrong with this conversation, so silently
        // stop pulsing for it. The handler runs async, so don't clobber a
        // fresh conversation's state with an error for a stale one.
        if (!error?.temporary && this.isCurrentTypingChannel(channel)) {
          this.typingDisabled = true;
          this.clearTypingPulse();
        }
      }
    );
  }

  // whether the channel belongs to the contact currently being viewed
  private isCurrentTypingChannel(channel: string) {
    return channel === `history:${this.currentContact?.uuid}`;
  }

  private clearTypingPulse() {
    if (this.typingPulse) {
      window.clearInterval(this.typingPulse);
      this.typingPulse = null;
    }
    this.typingChannel = null;
  }

  private stopTyping() {
    if (!this.typingPulse) {
      return;
    }

    const channel = this.typingChannel;
    this.clearTypingPulse();
    publishToSocket(channel, this.getTypingPayload('typing_stopped')).catch(
      (error: any) => {
        // on a contact switch this stop targets the old conversation - a
        // denial for it must not disable typing for the new one
        if (!error?.temporary && this.isCurrentTypingChannel(channel)) {
          this.typingDisabled = true;
        }
      }
    );
  }

  private reset() {
    if (this.chat) {
      this.chat.reset();
    }
    this.ticket = null;
    this.beforeUUID = null;
    this.afterUUID = null;
    this.fetchingMissed = false;

    // let the old conversation know we stopped composing and start the new
    // one with a clean typing slate
    this.stopTyping();
    this.typingDisabled = false;
    this.lastIncomingMsgOn = null;
    this.lastIncomingMsgExternalId = null;

    const compose = this.shadowRoot.querySelector('temba-compose') as Compose;
    if (compose) {
      compose.reset();
    }
  }

  private handleSearchToggle() {
    if (this.searchMode) {
      this.handleSearchClose();
    } else {
      this.searchMode = true;
      this.searchQuery = '';
      this.searchResults = [];
      this.searchIndex = -1;
      this.searchLoading = false;
      this.searchNoResults = false;
      window.setTimeout(() => {
        const input = this.shadowRoot.querySelector('.search-input') as any;
        if (input) {
          input.focus();
        }
      }, 50);
    }
  }

  private handleSearchClose() {
    this.searchClosing = true;
    window.setTimeout(() => {
      this.searchClosing = false;
      this.searchMode = false;
      this.searchQuery = '';
      this.searchResults = [];
      this.searchIndex = -1;
      this.searchLoading = false;
      this.searchNoResults = false;
      this.lastSearchedQuery = '';
      const chat = this.chat;
      if (!chat) {
        return;
      }

      chat.searchHighlight = null;
      chat.highlightMessageUuid = null;
      // reload the current view
      chat.reset();
      this.blockFetching = false;
      this.blockFetchingNewer = false;
      this.fetchingNewer = false;
      this.beforeUUID = null;
      this.afterUUID = null;
      this.fetchPreviousMessages();
    }, 150);
  }

  private handleSearchInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.searchQuery = input.value;
  }

  // tracks the query that produced the current searchResults
  private lastSearchedQuery = '';

  private handleSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentQuery = this.searchQuery.trim();
      if (currentQuery !== this.lastSearchedQuery) {
        this.executeSearch();
      } else if (e.shiftKey) {
        this.handleSearchPrev();
      } else {
        this.handleSearchNext();
      }
    } else if (e.key === 'Escape') {
      this.handleSearchClose();
      e.preventDefault();
    }
  }

  private executeSearch() {
    const query = this.searchQuery.trim();
    if (!query || !this.currentContact || this.searchLoading) {
      return;
    }

    this.searchLoading = true;
    this.searchResults = [];
    this.searchIndex = -1;
    this.searchNoResults = false;
    this.lastSearchedQuery = query;
    if (this.chat) {
      this.chat.searchHighlight = null;
      this.chat.highlightMessageUuid = null;
      this.chat.reset();
    }

    const url = `/contact/chat_search/${this.currentContact.uuid}/?text=${encodeURIComponent(query)}`;
    getUrl(url)
      .then((response: WebResponse) => {
        this.searchLoading = false;
        this.searchResults = response.json.results || [];
        if (this.searchResults.length > 0) {
          this.searchNoResults = false;
          this.searchIndex = 0;
          this.navigateToResult(0);
        } else {
          this.searchNoResults = true;
          this.searchIndex = -1;
        }
      })
      .catch(() => {
        this.searchLoading = false;
        this.searchResults = [];
        this.searchIndex = -1;
        this.searchNoResults = false;
      });
  }

  private navigateToResult(index: number) {
    if (index < 0 || index >= this.searchResults.length) {
      return;
    }

    this.searchIndex = index;
    const result = this.searchResults[index];

    const FADE_MS = 120;

    if (!this.chat) {
      return;
    }

    const endpoint = this.getEndpoint();
    if (!endpoint) {
      return;
    }

    this.chat.searchHighlight = this.searchQuery.trim();

    // start fetches immediately (in parallel with fade-out)
    const beforePromise = fetchContactHistory(
      endpoint,
      this.currentTicket?.uuid,
      result.uuid,
      null
    );
    const afterPromise = fetchContactHistory(
      endpoint,
      this.currentTicket?.uuid,
      null,
      result.uuid
    );

    // fade out, then hide completely before swapping content
    this.chat.style.opacity = '0';

    window.setTimeout(() => {
      // fully hidden (including scrollbar) during content swap
      this.chat.style.visibility = 'hidden';
      this.chat.reset();
      this.blockFetching = false;
      this.blockFetchingNewer = false;
      this.fetchingNewer = false;
      this.beforeUUID = null;
      this.afterUUID = null;

      const matchedEvent: ContactEvent = {
        ...result,
        created_on: new Date(result.created_on)
      };

      let navigationCompleted = false;
      Promise.all([beforePromise, afterPromise])
        .then(([beforePage, afterPage]) => {
          const afterMessages = this.createMessages(afterPage);
          afterMessages.reverse();

          const beforeMessages = this.createMessages(beforePage);
          beforeMessages.reverse();

          const matchPage = {
            events: [matchedEvent],
            next: null
          } as ContactHistoryPage;
          const matchMessages = this.createMessages(matchPage);
          matchMessages.reverse();

          if (beforePage.next) {
            this.beforeUUID = beforePage.next;
          } else if (beforeMessages.length > 0) {
            const oldestBefore =
              beforePage.events[beforePage.events.length - 1];
            this.beforeUUID = oldestBefore.uuid;
          } else {
            this.blockFetching = true;
            const allEvents = [...afterMessages, ...matchMessages];
            if (allEvents.length > 0) {
              const oldest = allEvents[allEvents.length - 1];
              this.chat.setEndOfHistory(new Date(oldest.created_on));
            }
          }

          // synchronously load all messages (no internal timeouts)
          const allMessages = [
            ...beforeMessages,
            ...matchMessages,
            ...afterMessages
          ];
          this.chat.loadMessages(allMessages);

          // wait for Lit to render the DOM, then position scroll, then reveal
          // uses setTimeout instead of requestAnimationFrame for test compatibility
          navigationCompleted = true;
          this.chat.updateComplete.then(() => {
            window.setTimeout(() => {
              if (!this.chat) return;

              // position internal scroll only — never use scrollIntoView
              // which can move ancestor containers
              this.chat.highlightMessageUuid = result.uuid;
              const scroll = this.chat.shadowRoot?.querySelector(
                '.scroll'
              ) as HTMLElement;
              const row = this.chat.shadowRoot?.querySelector(
                `.row[data-uuid="${result.uuid}"]`
              ) as HTMLElement;
              if (scroll && row) {
                // calculate position to center the row within the scroll area
                // column-reverse: scrollTop=0 is bottom, negative is up
                const scrollRect = scroll.getBoundingClientRect();
                const rowRect = row.getBoundingClientRect();
                const rowCenter = rowRect.top + rowRect.height / 2;
                const scrollCenter = scrollRect.top + scrollRect.height / 2;
                const offset = rowCenter - scrollCenter;
                scroll.scrollTop = scroll.scrollTop + offset;
              } else {
                // fallback: just go to bottom
                if (scroll) {
                  scroll.scrollTop = 0;
                }
              }

              // let scroll settle, then fade in
              window.setTimeout(() => {
                if (this.chat) {
                  this.chat.style.visibility = 'visible';
                  this.chat.style.opacity = '0';
                  window.setTimeout(() => {
                    if (this.chat) {
                      this.chat.style.opacity = '1';
                    }
                  }, 16);
                }
              }, 16);
            }, 16);
          });
        })
        .catch(() => {
          this.blockFetching = false;
          this.blockFetchingNewer = false;
          this.fetchingNewer = false;
          this.beforeUUID = null;
          this.afterUUID = null;
          this.fetchPreviousMessages();
        })
        .finally(() => {
          if (!navigationCompleted && this.chat) {
            this.chat.style.visibility = 'visible';
            this.chat.style.opacity = '1';
          }
        });
    }, FADE_MS);
  }

  private handleSearchPrev() {
    if (this.searchResults.length === 0) {
      return;
    }
    const newIndex =
      this.searchIndex <= 0
        ? this.searchResults.length - 1
        : this.searchIndex - 1;
    this.navigateToResult(newIndex);
  }

  private handleSearchNext() {
    if (this.searchResults.length === 0) {
      return;
    }
    const newIndex =
      this.searchIndex >= this.searchResults.length - 1
        ? 0
        : this.searchIndex + 1;
    this.navigateToResult(newIndex);
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
          this.resolveUserAvatar(event);
          this.chat.addMessages([event], null, true);
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

  public prerender(event: ContactEvent) {
    // use the unified renderEvent function with isSimulation = false
    const rendered = renderEvent(event, false);

    if (rendered) {
      event._rendered = {
        html: rendered,
        type: MessageType.Inline
      };
    }
  }

  /**
   * Keeps the store's avatar cache fresh from server-hydrated user refs and
   * fills in refs that arrive without one - events published over sockets
   * carry only a user's uuid and name.
   */
  private resolveUserAvatar(event: any) {
    const user = event._user;
    if (user && user.uuid && this.store) {
      if (user.avatar) {
        this.store.setUserAvatar(user.uuid, user.avatar);
      } else {
        user.avatar = this.store.getUserAvatar(user.uuid);
      }
    }
  }

  private createMessages(page: ContactHistoryPage): ContactEvent[] {
    if (page.events) {
      const messages: ContactEvent[] = [];
      page.events.forEach((event) => {
        this.resolveUserAvatar(event);
        // track the UUID of the newest event for polling
        if (
          !this.afterUUID ||
          event.uuid.toLowerCase() > this.afterUUID.toLowerCase()
        ) {
          this.afterUUID = event.uuid;
        }

        // convert to dates
        event.created_on = new Date(event.created_on);

        // track the contact's most recent incoming message for the external
        // id our typing publications carry
        if (event.type === 'msg_received') {
          if (
            !this.lastIncomingMsgOn ||
            event.created_on > this.lastIncomingMsgOn
          ) {
            this.lastIncomingMsgOn = event.created_on;
            this.lastIncomingMsgExternalId =
              (event as MsgEvent).msg?.external_id || null;
          }
        }

        if (
          event.type === 'msg_created' ||
          event.type === 'msg_received' ||
          event.type === 'ivr_created' ||
          event.type === 'ticket_note_added'
        ) {
          // Notes render as chat-style bubbles (see Chat.ts), so push them
          // through directly rather than prerendering into an inline event.
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

  /**
   * Fetches any events newer than the last one we've seen. New events
   * normally arrive over the socket, so this is only needed to cover gaps -
   * events published between our initial history fetch and the subscription
   * becoming active, or while a dropped connection was reconnecting.
   */
  private fetchMissedEvents() {
    // we are already working on it or in search mode
    if (this.fetchingMissed || this.searchMode) {
      return;
    }

    const chat = this.chat;
    if (this.currentContact && this.afterUUID) {
      this.fetchingMissed = true;
      const endpoint = this.getEndpoint();
      if (!endpoint) {
        this.fetchingMissed = false;
        return;
      }

      const fetchContact = this.currentContact.uuid;
      const fetchTicket = this.currentTicket?.uuid;

      fetchContactHistory(endpoint, fetchTicket, null, this.afterUUID).then(
        (page: ContactHistoryPage) => {
          this.fetchingMissed = false;

          // things may have changed while we were fetching
          if (
            this.searchMode ||
            fetchContact !== this.currentContact?.uuid ||
            fetchTicket !== this.currentTicket?.uuid
          ) {
            return;
          }

          const messages = this.createMessages(page);
          messages.reverse();
          chat.addMessages(messages, null, true);
        }
      );
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
      });
    }
  }

  private fetchComplete() {
    if (this.chat) {
      this.chat.fetching = false;
    }
    this.fetchingNewer = false;
  }

  private blockFetchingNewer = false;
  private fetchingNewer = false;

  private fetchNewerMessages() {
    if (
      !this.searchMode ||
      !this.afterUUID ||
      !this.chat ||
      this.fetchingNewer ||
      this.blockFetchingNewer
    ) {
      return;
    }

    this.fetchingNewer = true;
    const endpoint = this.getEndpoint();
    if (!endpoint) {
      this.fetchingNewer = false;
      return;
    }

    fetchContactHistory(
      endpoint,
      this.currentTicket?.uuid,
      null,
      this.afterUUID
    )
      .then((page: ContactHistoryPage) => {
        if (!this.chat) {
          this.fetchingNewer = false;
          return;
        }

        const messages = this.createMessages(page);
        messages.reverse();

        if (messages.length === 0) {
          this.blockFetchingNewer = true;
          this.fetchingNewer = false;
          return;
        }

        // maintainScroll=true keeps the user's visual position stable
        // so they must actively scroll down to trigger the next fetch
        // fetchingNewer is reset in fetchComplete after scroll settles
        this.chat.addMessages(messages, null, true, true);
      })
      .catch(() => {
        this.fetchingNewer = false;
      });
  }

  private getTembaCompose(): TemplateResult {
    if (this.currentTicket) {
      if (this.currentContact && this.currentContact.status !== 'active') {
        //no chatbox for archived, blocked, or stopped contacts
        return null;
      } else {
        if (!this.currentTicket.closed_on) {
          // hide compose if agent can't reply to unassigned tickets
          if (
            this.disableReply &&
            (!this.currentTicket.assignee ||
              this.currentTicket.assignee.email !== this.agent)
          ) {
            return null;
          }
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
          min-height="75"
          @temba-submitted=${this.handleSend.bind(this)}
          @temba-content-changed=${this.handleComposeChanged.bind(this)}
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
    if (this.disableAssign) {
      return;
    }

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
        ? html`<div class="chat-container">
              ${this.showSearch && this.searchMode
                ? html`<div
                    class="search-overlay ${this.searchClosing
                      ? 'closing'
                      : ''}"
                  >
                    <div class="search-input-wrapper">
                      <temba-textinput
                        class="search-input"
                        placeholder="Search messages..."
                        .value=${this.searchQuery}
                        .submitOnEnter=${false}
                        @input=${this.handleSearchInput}
                        @keydown=${this.handleSearchKeydown}
                        @focus=${() => (this.searchFocused = true)}
                        @blur=${() => (this.searchFocused = false)}
                        widget_only
                      ></temba-textinput>
                      <button
                        class="search-go"
                        @click=${this.executeSearch}
                        ?disabled=${!this.searchQuery.trim() ||
                        this.searchLoading}
                        title="Search (Enter)"
                      >
                        <temba-icon name="search" size="0.8"></temba-icon>
                      </button>
                    </div>
                    ${this.searchLoading
                      ? html`<span class="search-counter"
                          ><temba-loading size="8"></temba-loading
                        ></span>`
                      : this.searchResults.length > 0
                        ? html`<span class="search-counter"
                              >${this.searchIndex + 1} /
                              ${this.searchResults.length}</span
                            ><button
                              class="search-btn ${this.searchFocused &&
                              this.searchQuery.trim() === this.lastSearchedQuery
                                ? 'enter-target'
                                : ''}"
                              @click=${this.handleSearchNext}
                              title="Older match (Enter)"
                            >
                              &#x25B2;
                            </button>
                            <button
                              class="search-btn"
                              @click=${this.handleSearchPrev}
                              title="Newer match (Shift+Enter)"
                            >
                              &#x25BC;
                            </button>`
                        : null}
                    <button
                      class="search-btn"
                      @click=${this.handleSearchClose}
                      title="Close search (Escape)"
                    >
                      &#x2715;
                    </button>
                  </div>`
                : null}
              ${this.showSearch && !this.searchMode
                ? html`<button
                    class="search-toggle"
                    @click=${this.handleSearchToggle}
                    title="Search messages"
                  >
                    <temba-icon name="search" size="1"></temba-icon>
                  </button>`
                : null}
              <temba-chat
                @temba-scroll-threshold=${this.fetchPreviousMessages}
                @temba-scroll-threshold-bottom=${this.fetchNewerMessages}
                @temba-fetch-complete=${this.fetchComplete}
                avatar=${this.avatar}
                contactName=${this.currentContact?.name ?? nothing}
                contactUuid=${this.currentContact?.uuid ?? nothing}
                agent
                avatars
                ?hasFooter=${inFlow}
                .showMessageLogsAfter=${this.showMessageLogsAfter}
              >
                ${inFlow
                  ? html`
                      <div slot="footer" class="flow-footer">
                        <div class="in-flow">
                          <div class="flow-name">
                            <span>Currently in</span>
                            <a
                              href="/flow/editor/${this.currentContact.flow
                                .uuid}/"
                              onclick="goto(event, this)"
                              ><temba-label
                                type="flow"
                                clickable
                                ?removable=${this.showInterrupt}
                                removeLabel=${msg('Interrupt flow')}
                                @temba-remove=${this.handleInterrupt}
                                >${this.currentContact.flow.name}</temba-label
                              ></a
                            >
                          </div>
                        </div>
                      </div>
                    `
                  : null}
                <div slot="footer"></div>
              </temba-chat>
              ${this.searchNoResults
                ? html`<div class="search-no-results">
                    No results found for
                    <strong>${this.lastSearchedQuery}</strong>
                  </div>`
                : null}
            </div>
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
                      ?disabled=${ticketClosed || this.disableAssign}
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
    const emptyPage: ContactHistoryPage = {
      events: [],
      next: null
    };
    const controller = new AbortController();
    pendingRequests.push(controller);
    const clearController = () => {
      pendingRequests = pendingRequests.filter(
        (pendingController: AbortController) => pendingController !== controller
      );
    };

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
        clearController();
        const page = response.json as ContactHistoryPage;
        resolve(page || emptyPage);
      })
      .catch(() => {
        clearController();
        resolve(emptyPage);
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
