import { css } from 'lit';
import { property } from 'lit/decorators.js';
import { html, TemplateResult } from 'lit-html';
import { Contact, CustomEventType, Ticket } from '../interfaces';
import { RapidElement } from '../RapidElement';
import { Asset, getAssets, getClasses, postJSON, throttle } from '../utils';

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
  EventGroup,
  Events,
  FlowEvent,
  getEventGroupType,
  LabelsAddedEvent,
  MsgEvent,
  NameChangedEvent,
  OptinRequestedEvent,
  renderAirtimeTransferredEvent,
  renderCallStartedEvent,
  renderCampaignFiredEvent,
  renderChannelEvent,
  renderContactGroupsEvent,
  renderContactLanguageChangedEvent,
  renderContactURNsChanged,
  renderEmailSent,
  renderErrorMessage,
  renderFlowEvent,
  renderLabelsAdded,
  renderMsgEvent,
  renderNameChanged,
  renderNoteCreated,
  renderOptinRequested,
  renderResultEvent,
  renderTicketAction,
  renderTicketAssigned,
  renderUpdateEvent,
  renderWebhookEvent,
  TicketEvent,
  UpdateFieldEvent,
  UpdateResultEvent,
  URNsChangedEvent,
  WebhookEvent
} from './events';
import {
  fetchContactHistory,
  MAX_CHAT_REFRESH,
  MIN_CHAT_REFRESH,
  SCROLL_THRESHOLD
} from './helpers';
import { Lightbox } from '../lightbox/Lightbox';
import { Store } from '../store/Store';

// when images load, make sure we are on the bottom of the scroll window if necessary
export const loadHandler = function (event) {
  const target = event.target as HTMLElement;
  const events = this.host.getEventsPane();
  if (target.tagName == 'IMG') {
    if (!this.host.showMessageAlert) {
      if (
        events.scrollTop > target.offsetTop - 1000 &&
        target.offsetTop > events.scrollHeight - 500
      ) {
        this.host.scrollToBottom();
      }
    }
  }
};

export class ContactHistory extends RapidElement {
  public httpComplete: Promise<void | ContactHistoryPage>;
  private store: Store;

  public constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.addEventListener('load', loadHandler, true);
    this.store = document.querySelector('temba-store') as Store;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.shadowRoot.removeEventListener('load', loadHandler, true);
  }

  private getTicketForEvent(event: TicketEvent) {
    return this.getTicket((event as TicketEvent).ticket.uuid);
  }

  private getTicket(uuid: string) {
    return (this.tickets || []).find((ticket) => ticket.uuid === uuid);
  }

  static get styles() {
    return css``;

    /*css`
      ${getEventStyles()}

      .wrapper {
        border: 0px solid green;
        display: flex;
        flex-direction: column;
        align-items: items-stretch;
        flex-grow: 1;
        min-height: 0;
      }

      .events {
        overflow-y: scroll;
        overflow-x: hidden;
        background: #fff;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        min-height: 0;
        padding-top: 3em;
        padding-bottom: 1em;
      }

      temba-loading {
        align-self: center;
        margin-top: 0.025em;
        position: absolute;
        z-index: 250;
        padding-top: 1em;
      }

      .new-messages-container {
        display: flex;
        z-index: 1;
        background: pink;
        margin-bottom: 0px;
      }

      .new-messages {
        pointer-events: none;
        margin: 0 auto;
        margin-top: 0em;
        margin-bottom: -2.5em;
        padding: 0.25em 1em;
        border-radius: var(--curvature);
        background: var(--color-primary-dark);
        color: var(--color-text-light);
        opacity: 0;
        cursor: pointer;
        transition: all var(--transition-speed) ease-in-out;
        box-shadow: rgb(0 0 0 / 15%) 0px 3px 3px 0px;
      }

      .new-messages.expanded {
        margin-top: -2.5em;
        margin-bottom: 0.5em;
        pointer-events: auto;
        opacity: 1;
        pointer: cursor;
      }

      .scroll-title {
        display: flex;
        flex-direction: column;
        z-index: 2;
        border-top-left-radius: var(--curvature);
        overflow: hidden;
        box-shadow: 0px 3px 3px 0px rgba(0, 0, 0, 0.15);
        background: rgb(240, 240, 240);
        padding: 1em 1.2em;
        font-size: 1.2em;
        font-weight: 400;
      }

      .attachment img {
        cursor: pointer;
      }
    `
    */
  }

  @property({ type: Object })
  contact: Contact;

  @property({ type: String })
  uuid: string;

  @property({ type: String })
  agent: string;

  @property({ type: Array })
  eventGroups: EventGroup[] = [];

  @property({ type: Boolean })
  refreshing = false;

  @property({ type: Boolean })
  fetching = false;

  @property({ type: Boolean })
  complete = false;

  @property({ type: String })
  endpoint: string;

  @property({ type: Boolean })
  debug = false;

  @property({ type: Boolean })
  showMessageAlert = false;

  @property({ attribute: false, type: Object })
  mostRecentEvent: ContactEvent;

  @property({ type: String })
  ticket: string = null;

  @property({ type: String })
  endDate: string = null;

  @property({ type: Array })
  tickets: Ticket[] = null;

  ticketEvents: { [uuid: string]: TicketEvent } = {};

  nextBefore: number;
  nextAfter: number;
  lastHeight = 0;
  lastRefreshAdded: number;
  refreshTimeout: any = null;
  empty = false;

  public firstUpdated(changedProperties: Map<string, any>) {
    super.firstUpdated(changedProperties);
    this.handleClose = this.handleClose.bind(this);
  }

  public updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    // fire an event if we get a new event
    if (
      changedProperties.has('mostRecentEvent') &&
      changedProperties.get('mostRecentEvent') &&
      this.mostRecentEvent
    ) {
      this.fireCustomEvent(CustomEventType.Refreshed);
    }

    if (changedProperties.has('endDate')) {
      if (this.refreshTimeout && this.endDate) {
        window.clearTimeout(this.refreshTimeout);
      }
    }

    // if we don't have an endpoint infer one
    if (changedProperties.has('uuid')) {
      if (this.uuid == null) {
        this.reset();
      } else {
        const endpoint = `/contact/history/${this.uuid}/?_format=json`;

        if (this.endpoint !== endpoint) {
          this.reset();

          if (this.endDate) {
            const before = new Date(this.endDate);
            this.nextBefore = before.getTime() * 1000 + 1000;
          }

          this.endpoint = endpoint;
          this.refreshTickets();
        }
      }
    }

    if (changedProperties.has('ticket')) {
      this.endpoint = null;
      this.requestUpdate('uuid');
    }

    if (
      changedProperties.has('refreshing') &&
      this.refreshing &&
      this.endpoint &&
      !this.endDate
    ) {
      const after = (this.getLastEventTime() - 1) * 1000;
      let forceOpen = false;

      fetchContactHistory(false, this.endpoint, this.ticket, null, after)
        .then((results: ContactHistoryPage) => {
          if (results.events && results.events.length > 0) {
            this.updateMostRecent(results.events[0]);
          }

          // keep track of any ticket events
          results.events.forEach((event: ContactEvent) => {
            if (event.type === Events.TICKET_OPENED) {
              const ticketEvent = event as TicketEvent;
              this.ticketEvents[ticketEvent.ticket.uuid] = ticketEvent;
            }
          });

          const fetchedEvents = results.events.reverse();

          // dedupe any events we get from the server
          // TODO: perhaps make this a little less crazy
          let removed = 0;
          this.eventGroups.forEach((g) => {
            const before = g.events.length;
            g.events = g.events.filter(
              (prev) =>
                !fetchedEvents.find((fetched) => {
                  return (
                    prev.created_on == fetched.created_on &&
                    prev.type === fetched.type
                  );
                })
            );
            removed += before - g.events.length;
          });

          this.lastRefreshAdded = fetchedEvents.length - removed;

          // reflow our most recent event group in case it merges with our new groups
          const previousGroups = [...this.eventGroups];

          if (this.eventGroups.length > 0) {
            const sliced = previousGroups.splice(
              previousGroups.length - 1,
              1
            )[0];

            forceOpen = sliced.open;
            if (sliced.events.length > 0) {
              fetchedEvents.splice(0, 0, ...sliced.events);
            }
          }

          const grouped = this.getEventGroups(fetchedEvents);
          if (grouped.length) {
            if (forceOpen) {
              grouped[grouped.length - 1].open = forceOpen;
            }
            this.eventGroups = [...previousGroups, ...grouped].filter(
              (group) => group.events.length > 0
            );
          }
          this.refreshing = false;
          this.scheduleRefresh();
        })
        .catch(() => {
          this.refreshing = false;
          this.scheduleRefresh();
        });
    }

    if (changedProperties.has('fetching') && this.fetching) {
      if (!this.nextBefore) {
        this.nextBefore = new Date().getTime() * 1000 - 1000;
      }

      this.httpComplete = fetchContactHistory(
        this.empty,
        this.endpoint,
        this.ticket,
        this.nextBefore,
        this.nextAfter
      ).then((results: ContactHistoryPage) => {
        // see if we have a new event
        if (results.events && results.events.length > 0) {
          this.updateMostRecent(results.events[0]);

          // keep track of any ticket events
          results.events.forEach((event: ContactEvent) => {
            if (event.type === Events.TICKET_OPENED) {
              const ticketEvent = event as TicketEvent;
              this.ticketEvents[ticketEvent.ticket.uuid] = ticketEvent;
            }
          });
        }

        let forceOpen = false;
        const fetchedEvents = results.events ? results.events.reverse() : [];

        // reflow our last event group in case it merges with our new groups
        if (this.eventGroups.length > 0) {
          const sliced = this.eventGroups.splice(0, 1)[0];
          forceOpen = sliced.open;
          fetchedEvents.push(...sliced.events);
        }

        const grouped = this.getEventGroups(fetchedEvents);
        if (grouped.length) {
          if (forceOpen) {
            grouped[grouped.length - 1].open = forceOpen;
          }

          this.eventGroups = [...grouped, ...this.eventGroups];
        }

        if (results.next_before === this.nextBefore) {
          this.complete = true;
        }

        this.nextBefore = results.next_before;
        this.nextAfter = results.next_after;
        this.fetching = false;
        this.empty = false;
      });
    }

    if (changedProperties.has('refreshing') && !this.refreshing) {
      if (this.lastRefreshAdded > 0) {
        const events = this.getEventsPane();

        // if we are near the bottom, push us to the bottom to show new stuff
        if (this.lastHeight > 0) {
          const addedHeight = events.scrollHeight - this.lastHeight;

          const distanceFromBottom =
            events.scrollHeight -
            events.scrollTop -
            addedHeight -
            events.clientHeight;

          if (distanceFromBottom < 500) {
            this.scrollToBottom();
          } else {
            this.showMessageAlert = true;
          }
        }

        if (this.eventGroups.length > 0) {
          this.lastHeight = events.scrollHeight;
        }
      }
    }

    if (
      changedProperties.has('fetching') &&
      !this.fetching &&
      changedProperties.get('fetching') !== undefined
    ) {
      const events = this.getEventsPane();

      if (this.lastHeight && events.scrollHeight > this.lastHeight) {
        const scrollTop =
          events.scrollTop + events.scrollHeight - this.lastHeight;
        events.scrollTop = scrollTop;
      }

      // scroll to the bottom if it's our first fetch
      if (!this.lastHeight) {
        this.scrollToBottom();
      }

      // don't record our scroll height until we have history
      if (this.eventGroups.length > 0) {
        this.lastHeight = events.scrollHeight;
      }
    }

    if (changedProperties.has('endpoint') && this.endpoint) {
      this.fetching = true;
      this.empty = true;
    }
  }

  private refreshTickets() {
    if (this.ticket) {
      let url = `/api/v2/tickets.json?contact=${this.uuid}`;
      if (this.ticket) {
        url = `${url}&ticket=${this.ticket}`;
      }

      getAssets(url).then((tickets: Ticket[]) => {
        this.tickets = tickets.reverse();
      });
    }
  }

  public getEventsPane() {
    return this.getDiv('.events');
  }

  public scrollToBottom(smooth = false) {
    const events = this.getEventsPane();
    events.scrollTo({
      top: events.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
    this.showMessageAlert = false;

    window.setTimeout(() => {
      events.scrollTo({
        top: events.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }, 0);
  }

  public refresh(): void {
    this.scheduleRefresh(500);
  }

  private getEventGroups(events: ContactEvent[]): EventGroup[] {
    const grouped: EventGroup[] = [];
    let eventGroup: EventGroup = undefined;
    for (const event of events) {
      const currentEventGroupType = getEventGroupType(event, this.ticket);
      // see if we need a new event group
      if (!eventGroup || eventGroup.type !== currentEventGroupType) {
        // we have a new type, save our last group
        if (eventGroup) {
          grouped.push(eventGroup);
        }
        eventGroup = {
          open: false,
          events: [event],
          type: currentEventGroupType
        };
      } else {
        // our event matches the current group, stuff it in there
        eventGroup.events.push(event);
      }
    }

    if (eventGroup && eventGroup.events.length > 0) {
      grouped.push(eventGroup);
    }
    return grouped;
  }

  private scheduleRefresh(wait = -1) {
    if (this.endDate) {
      return;
    }

    let refreshWait = wait;

    if (wait === -1) {
      const lastEventTime = this.getLastEventTime();
      refreshWait = Math.max(
        Math.min((new Date().getTime() - lastEventTime) / 2, MAX_CHAT_REFRESH),
        MIN_CHAT_REFRESH
      );
    }

    // cancel any outstanding timeout
    if (wait > -1 && this.refreshTimeout) {
      window.clearTimeout(this.refreshTimeout);
    }

    this.refreshTimeout = window.setTimeout(() => {
      if (this.refreshing) {
        this.scheduleRefresh();
        this.refreshing = false;
      } else {
        this.refreshing = true;
      }
    }, refreshWait);
  }

  private reset() {
    this.endpoint = null;
    this.tickets = null;
    this.ticketEvents = {};
    this.eventGroups = [];
    this.fetching = false;
    this.complete = false;
    this.nextBefore = null;
    this.nextAfter = null;
    this.lastHeight = 0;
  }

  private handleEventGroupShow(event: MouseEvent) {
    const grouping = event.currentTarget as HTMLDivElement;
    const groupIndex = parseInt(grouping.getAttribute('data-group-index'));
    const eventGroup =
      this.eventGroups[this.eventGroups.length - groupIndex - 1];
    eventGroup.open = true;
    this.requestUpdate('eventGroups');
  }

  private handleEventGroupHide(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const grouping = event.currentTarget as HTMLDivElement;
    const groupIndex = parseInt(grouping.getAttribute('data-group-index'));
    const eventGroup =
      this.eventGroups[this.eventGroups.length - groupIndex - 1];

    eventGroup.open = false;

    this.requestUpdate('eventGroups');
  }

  private handleScroll() {
    const events = this.getEventsPane();
    if (events.scrollTop <= SCROLL_THRESHOLD) {
      if (this.eventGroups.length > 0 && !this.fetching && !this.complete) {
        this.fetching = true;
      }
    }
  }

  private updateMostRecent(newEvent: ContactEvent) {
    if (
      !this.mostRecentEvent ||
      this.mostRecentEvent.type !== newEvent.type ||
      this.mostRecentEvent.created_on !== newEvent.created_on
    ) {
      this.mostRecentEvent = newEvent;
    }
  }

  private getLastEventTime(): number {
    const mostRecentGroup = this.eventGroups[this.eventGroups.length - 1];
    if (mostRecentGroup) {
      const mostRecentEvent =
        mostRecentGroup.events[mostRecentGroup.events.length - 1];
      return new Date(mostRecentEvent.created_on).getTime();
    }
    return 0;
  }

  public renderEvent(event: ContactEvent): any {
    switch (event.type) {
      case Events.IVR_CREATED:
      case Events.MESSAGE_CREATED:
      case Events.MESSAGE_RECEIVED:
      case Events.BROADCAST_CREATED:
        if ((event as MsgEvent).created_by) {
          (event as MsgEvent).created_by = this.store.getUser(
            (event as MsgEvent).created_by.email
          );
        }

        return renderMsgEvent(event as MsgEvent);

      case Events.FLOW_ENTERED:
      case Events.FLOW_EXITED:
        return renderFlowEvent(event as FlowEvent);

      case Events.RUN_RESULT_CHANGED:
        return renderResultEvent(event as UpdateResultEvent);

      case Events.CONTACT_FIELD_CHANGED:
        return renderUpdateEvent(event as UpdateFieldEvent);

      case Events.CONTACT_NAME_CHANGED:
        return renderNameChanged(event as NameChangedEvent);

      case Events.CONTACT_URNS_CHANGED:
        return renderContactURNsChanged(event as URNsChangedEvent);

      case Events.EMAIL_SENT:
        return renderEmailSent(event as EmailSentEvent);

      case Events.INPUT_LABELS_ADDED:
        return renderLabelsAdded(event as LabelsAddedEvent);

      case Events.TICKET_OPENED: {
        return renderTicketAction(event as TicketEvent, 'opened', !this.ticket);
      }
      case Events.TICKET_NOTE_ADDED:
        return renderNoteCreated(event as TicketEvent);

      case Events.TICKET_ASSIGNED:
        return renderTicketAssigned(event as TicketEvent);
      case Events.TICKET_REOPENED: {
        return renderTicketAction(
          event as TicketEvent,
          'reopened',
          !this.ticket
        );
      }
      case Events.TICKET_CLOSED:
        return renderTicketAction(event as TicketEvent, 'closed', !this.ticket);

      case Events.ERROR:
      case Events.FAILURE:
        return renderErrorMessage(event as ErrorMessageEvent);
      case Events.CONTACT_GROUPS_CHANGED:
        return renderContactGroupsEvent(event as ContactGroupsEvent);
      case Events.WEBHOOK_CALLED:
        return renderWebhookEvent(event as WebhookEvent);
      case Events.AIRTIME_TRANSFERRED:
        return renderAirtimeTransferredEvent(event as AirtimeTransferredEvent);
      case Events.CALL_STARTED:
        return renderCallStartedEvent();
      case Events.CAMPAIGN_FIRED:
        return renderCampaignFiredEvent(event as CampaignFiredEvent);
      case Events.CHANNEL_EVENT:
        return renderChannelEvent(event as ChannelEvent);
      case Events.CONTACT_LANGUAGE_CHANGED:
        return renderContactLanguageChangedEvent(
          event as ContactLanguageChangedEvent
        );
      case Events.OPTIN_REQUESTED:
        return renderOptinRequested(event as OptinRequestedEvent);
    }

    return html`<temba-icon
        name="alert-triangle"
        style="fill:var(--color-error)"
      ></temba-icon>
      <div class="description">${event.type}</div>`;
  }

  private handleClose(uuid: string) {
    this.httpComplete = postJSON(`/api/v2/ticket_actions.json`, {
      tickets: [uuid],
      action: 'close'
    })
      .then(() => {
        this.refreshTickets();
        this.refresh();
        this.fireCustomEvent(CustomEventType.ContentChanged, {
          ticket: { uuid, status: 'closed' }
        });
      })
      .catch((response: any) => {
        console.error(response);
      });
  }

  public checkForAgentAssignmentEvent(agent: string) {
    this.httpComplete = getAssets(
      `/api/v2/tickets.json?uuid=${this.ticket}`
    ).then((assets: Asset[]) => {
      if (assets.length === 1) {
        const ticket = assets[0] as Ticket;
        if (ticket.assignee && ticket.assignee.email === agent) {
          this.fireCustomEvent(CustomEventType.ContentChanged, {
            ticket: { uuid: this.ticket, assigned: 'self' }
          });
        } else {
          this.fireCustomEvent(CustomEventType.ContentChanged, {
            ticket: {
              uuid: this.ticket,
              assigned: ticket.assignee ? ticket.assignee : null
            }
          });
        }
      }
    });
  }

  public getEventHandlers() {
    return [
      {
        event: 'scroll',
        method: throttle(this.handleScroll, 50)
      }
    ];
  }

  /** Check if a ticket event is no longer represented in a session */
  private isPurged(ticket: Ticket): boolean {
    return !this.ticketEvents[ticket.uuid];
  }

  private handleEventClicked(event) {
    const ele = event.target as HTMLDivElement;
    if (ele.tagName == 'IMG') {
      // if we have one, show in our lightbox
      const lightbox = document.querySelector('temba-lightbox') as Lightbox;
      if (lightbox) {
        lightbox.showElement(ele);
      }
    }
  }

  private renderEventContainer(event: ContactEvent) {
    const renderedEvent = html`
      <div
        @click=${this.handleEventClicked}
        class="${this.ticket ? 'active-ticket' : ''} event ${event.type}"
      >
        ${this.renderEvent(event)}
      </div>
      ${this.debug ? html`<pre>${JSON.stringify(event, null, 2)}</pre>` : null}
    `;
    return renderedEvent;
  }

  public render(): TemplateResult {
    return html`
      ${
        this.fetching
          ? html`<temba-loading units="5" size="10"></temba-loading>`
          : html`<div style="height:0em"></div>`
      }
      <div class="events" @scroll=${this.handleScroll}>
        ${this.eventGroups.map((eventGroup: EventGroup, index: number) => {
          const grouping = getEventGroupType(eventGroup.events[0], this.ticket);
          const groupIndex = this.eventGroups.length - index - 1;

          const classes = getClasses({
            grouping: true,
            [grouping]: true,
            expanded: eventGroup.open
          });
          return html`<div class="${classes}">
            ${grouping === 'verbose'
              ? html`<div
                  class="event-count"
                  @click=${this.handleEventGroupShow}
                  data-group-index="${groupIndex}"
                >
                  ${eventGroup.open
                    ? html`<temba-icon
                        @click=${this.handleEventGroupHide}
                        data-group-index="${groupIndex}"
                        name="x"
                        clickable
                      ></temba-icon>`
                    : html`${eventGroup.events.length}
                      ${eventGroup.events.length === 1
                        ? html`event`
                        : html`events`} `}
                </div>`
              : null}

            <div class="items">
              ${eventGroup.events.map((event: ContactEvent) => {
                if (
                  event.type === Events.TICKET_ASSIGNED &&
                  (event as TicketEvent).note
                ) {
                  const noteEvent = { ...event };
                  noteEvent.type = Events.TICKET_NOTE_ADDED;

                  return html`${this.renderEventContainer(
                    noteEvent
                  )}${this.renderEventContainer(event)}`;
                } else {
                  return this.renderEventContainer(event);
                }
              })}
            </div>
          </div>`;
        })}
      </div>

      ${
        this.contact && this.contact.status === 'active'
          ? html`<div class="new-messages-container">
              <div
                @click=${() => {
                  this.scrollToBottom(true);
                }}
                class="new-messages ${getClasses({
                  expanded: this.showMessageAlert
                })}"
              >
                New Messages
              </div>
            </div>`
          : null
      }
      
      </div>
    `;
  }
}
