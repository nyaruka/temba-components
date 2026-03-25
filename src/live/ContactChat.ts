/* eslint-disable @typescript-eslint/no-this-alias */
import {
  css,
  html,
  PropertyValueMap,
  PropertyValues,
  TemplateResult
} from 'lit';
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
  postJSON,
  postUrl,
  WebResponse
} from '../utils';
import { ContactStoreElement } from './ContactStoreElement';
import { Compose, ComposeValue } from '../form/Compose';
import { ContactHistoryPage } from '../events';
import { Chat, MessageType, ContactEvent } from '../display/Chat';
import { DEFAULT_AVATAR } from '../webchat/assets';
import { UserSelect } from '../form/select/UserSelect';
import { Select } from '../form/select/Select';
import {
  renderEvent,
  renderTicketAction,
  renderTicketAssigneeChanged
} from '../events/eventRenderers';

/*
export const SCROLL_THRESHOLD = 100;
export const SIMULATED_WEB_SLOWNESS = 0;
export const MAX_CHAT_REFRESH = 10000;
export const MIN_CHAT_REFRESH = 500;
export const BODY_SNIPPET_LENGTH = 250;
*/

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
        background: #fff;
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

      .flow-footer {
        text-align: center;
        pointer-events: none;
      }

      .flow-footer .in-flow {
        pointer-events: auto;
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

  @property({ type: Boolean })
  disableAssign = false;

  @property({ type: Boolean })
  disableReply = false;

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
  afterUUID: string = null; // for polling new messages
  refreshId = null;
  polling = false;
  pollingInterval = 2000; // start at 2 seconds
  lastFetchTime: number = null;

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
    this.ticket = null;
    this.beforeUUID = null;
    this.afterUUID = null;
    this.refreshId = null;
    this.polling = false;
    this.pollingInterval = 2000;
    this.lastFetchTime = null;

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
      // stop polling while searching
      if (this.refreshId) {
        clearTimeout(this.refreshId);
        this.refreshId = null;
      }
      window.setTimeout(() => {
        const input = this.shadowRoot.querySelector(
          '.search-input'
        ) as any;
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
      if (this.chat) {
        this.chat.searchHighlight = null;
        this.chat.highlightMessageUuid = null;
      }
      // reload the current view
      this.chat.reset();
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

      Promise.all([beforePromise, afterPromise]).then(
        ([beforePage, afterPage]) => {
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
        }
      );
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
    // use the unified renderEvent function with isSimulation = false
    const rendered = renderEvent(event, false);

    if (rendered) {
      event._rendered = {
        html: rendered,
        type: MessageType.Inline
      };
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
    // we are already working on it or in search mode
    if (this.polling || this.searchMode) {
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
        if (!this.searchMode) {
          this.scheduleRefresh();
        }
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
    if (!this.searchMode || !this.afterUUID || !this.chat || this.fetchingNewer || this.blockFetchingNewer) {
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
    ).then((page: ContactHistoryPage) => {
      const messages = this.createMessages(page);
      messages.reverse();

      if (messages.length === 0) {
        this.blockFetchingNewer = true;
      }

      // maintainScroll=true keeps the user's visual position stable
      // so they must actively scroll down to trigger the next fetch
      // fetchingNewer is reset in fetchComplete after scroll settles
      this.chat.addMessages(messages, null, true, true);
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
              ${this.searchMode
                ? html`<div class="search-overlay ${this.searchClosing ? 'closing' : ''}">
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
                        <temba-icon
                          name="search"
                          size="0.8"
                        ></temba-icon>
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
                            class="search-btn ${this.searchFocused && this.searchQuery.trim() === this.lastSearchedQuery ? 'enter-target' : ''}"
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
              ${!this.searchMode
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
