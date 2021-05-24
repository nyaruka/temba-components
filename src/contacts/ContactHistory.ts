import { css, property } from 'lit-element';
import { html, TemplateResult } from 'lit-html';
import { CustomEventType, Ticket } from '../interfaces';
import { RapidElement } from '../RapidElement';
import { getAssets, getClasses, postJSON, throttle } from '../utils';
import ResizeObserver from 'resize-observer-polyfill';
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
  getEventStyles,
  LabelsAddedEvent,
  MsgEvent,
  NameChangedEvent,
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
  renderResultEvent,
  renderTicketClosed,
  renderTicketOpened,
  renderUpdateEvent,
  renderWebhookEvent,
  TicketEvent,
  UpdateFieldEvent,
  UpdateResultEvent,
  URNsChangedEvent,
  WebhookEvent,
} from './events';
import {
  fetchContactHistory,
  MAX_CHAT_REFRESH,
  MIN_CHAT_REFRESH,
  SCROLL_THRESHOLD,
} from './helpers';

export class ContactHistory extends RapidElement {
  public httpComplete: Promise<void | ContactHistoryPage>;

  private getStickyId = (event: ContactEvent) => {
    if (event.type === Events.TICKET_OPENED) {
      const ticket = this.getTicketForEvent(event as TicketEvent);
      if (ticket && ticket.status === 'open') {
        return ticket.uuid;
      }
    }
  };

  private getTicketForEvent(event: TicketEvent) {
    return this.getTicket((event as TicketEvent).ticket.uuid);
  }

  private getTicket(uuid: string) {
    return (this.tickets || []).find(ticket => ticket.uuid === uuid);
  }

  static get styles() {
    return css`
      ${getEventStyles()}

      :host {
        --transition-speed: 250ms;
        --event-padding: 0.5em 1em;
        padding: 1em;
        flex-grow: 1;
        overflow-y: scroll;
        overflow-x: hidden;
        display: flex;
        flex-direction: column;
        align-items: stretch;
      }

      temba-loading {
        align-self: center;
        margin-top: 0.025em;
        position: absolute;
        z-index: 250;
      }

      .sticky-bin {
        display: flex;
        flex-direction: column;
        position: fixed;
        margin: -1em;
        z-index: 1;
        border-top-left-radius: var(--curvature);
        overflow: hidden;

        background: rgba(240, 240, 240, 0.95);
        box-shadow: 0px 3px 3px 0px rgba(0, 0, 0, 0.15);
      }

      .sticky-bin temba-icon {
        margin-right: 0.75em;
      }

      .sticky-bin temba-icon[name='check'] {
        margin-right: 0;
      }

      .sticky {
        display: flex;
        margin: 1em -2em;
        padding: 1em 2em;
        background: rgba(240, 240, 240, 0.8);
      }

      .sticky.pinned {
        visibility: hidden;
      }

      .sticky-bin .event {
        margin: 0;
        padding: 1em 2em;
        border-radius: 0px;
        border-bottom: 1px solid rgba(220, 220, 220, 1);
      }

      .sticky .event {
        margin-bottom: 0;
      }

      .sticky .attn,
      .sticky-bin .attn {
        color: var(--color-text);
      }
    `;
  }

  @property({ type: String })
  uuid: string;

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

  @property({ attribute: false, type: Object })
  mostRecentEvent: ContactEvent;

  @property({ type: String })
  ticket: string = null;

  @property({ type: String })
  endDate: string = null;

  @property({ type: Array })
  tickets: Ticket[] = null;

  @property({ type: Object })
  currentTicket: Ticket = null;

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

    const stickyBin = this.getDiv('.sticky-bin');
    const resizer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const eventContainer = entry.contentRect;
        stickyBin.style.width =
          eventContainer.width + eventContainer.left + 14 + 'px';
      }
    });
    resizer.observe(this);
  }

  public updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    // fire an event when our current ticket changes
    if (changedProperties.has('currentTicket')) {
      this.fireCustomEvent(CustomEventType.ContextChanged, {
        context: this.currentTicket,
      });
    }

    // fire an event if we get a new event
    if (changedProperties.has('mostRecentEvent')) {
      this.fireCustomEvent(CustomEventType.Refreshed);
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
      this.endpoint
    ) {
      const after = (this.getLastEventTime() - 1) * 1000;
      let forceOpen = false;

      fetchContactHistory(false, this.endpoint, null, after)
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

          let fetchedEvents = results.events.reverse();

          // dedupe any events we get from the server
          // TODO: perhaps make this a little less crazy
          fetchedEvents = fetchedEvents.filter(item => {
            const found = !!this.eventGroups.find(
              g =>
                !!g.events.find(
                  exists =>
                    exists.created_on === item.created_on &&
                    exists.type === item.type
                )
            );

            return !found;
          });

          this.lastRefreshAdded = fetchedEvents.length;

          // reflow our most recent event group in case it merges with our new groups
          const previousGroups = [...this.eventGroups];

          if (this.eventGroups.length > 0) {
            const sliced = previousGroups.splice(
              previousGroups.length - 1,
              1
            )[0];

            forceOpen = sliced.open;
            fetchedEvents.splice(0, 0, ...sliced.events);
          }

          const grouped = this.getEventGroups(fetchedEvents);
          if (grouped.length) {
            if (forceOpen) {
              grouped[grouped.length - 1].open = forceOpen;
            }

            this.eventGroups = [...previousGroups, ...grouped];
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
      const events = this.shadowRoot.host;
      this.lastHeight = events.scrollHeight;
      if (!this.nextBefore) {
        this.nextBefore = new Date().getTime() * 1000 - 1000;
      }

      this.httpComplete = fetchContactHistory(
        this.empty,
        this.endpoint,
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
        const fetchedEvents = results.events.reverse();

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
        const events = this.shadowRoot.host;

        // if we are near the bottom, push us to the bottom to show new stuff
        const distanceFromBottom =
          events.scrollHeight - events.scrollTop - this.lastHeight;
        if (distanceFromBottom < 150) {
          events.scrollTo({ top: events.scrollHeight, behavior: 'smooth' });
        }
      }
    }

    if (changedProperties.has('fetching') && !this.fetching) {
      const events = this.shadowRoot.host;

      if (events.scrollHeight > this.lastHeight) {
        const scrollTop =
          events.scrollTop + events.scrollHeight - this.lastHeight;
        events.scrollTop = scrollTop;
      }

      // scroll to the bottom if it's our first fetch
      if (!this.lastHeight) {
        events.scrollTop = events.scrollHeight;
      }
    }

    if (changedProperties.has('endpoint') && this.endpoint) {
      this.fetching = true;
      this.empty = true;
    }

    // when our tickets change, make sure we don't have any manual pins
    if (changedProperties.has('tickets')) {
      const stickyBin = this.getDiv('.sticky-bin');

      const closedTickets = (this.tickets || []).filter(
        ticket => ticket && ticket.status === 'closed'
      );

      for (const closed of closedTickets) {
        const child = stickyBin.querySelector(
          `[data-sticky-id="${closed.uuid}"]`
        );
        if (child) {
          stickyBin.removeChild(child);
        }
      }
      if (!this.currentTicket) {
        this.updateCurrentTicket();
      }
    }
  }

  private updateCurrentTicket() {
    const openTickets = (this.tickets || []).filter(
      ticket => ticket && ticket.status === 'open'
    );
    if (openTickets.length > 0) {
      this.currentTicket = openTickets[openTickets.length - 1];
    }
  }

  private refreshTickets() {
    let url = `/api/v2/tickets.json?contact=${this.uuid}`;
    if (this.ticket) {
      url = `${url}&ticket=${this.ticket}`;
    }

    getAssets(url).then((tickets: Ticket[]) => {
      this.tickets = tickets.reverse();
    });
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
          closing: false,
          events: [event],
          type: currentEventGroupType,
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
    // clear out our sticky bin which we manipulated manually
    const stickyBin = this.getDiv('.sticky-bin');
    while (stickyBin.childElementCount > 0) {
      stickyBin.removeChild(stickyBin.firstElementChild);
    }

    this.currentTicket = null;
    this.endpoint = null;
    this.tickets = null;
    this.ticketEvents = {};
    this.eventGroups = [];
    this.fetching = false;
    this.complete = false;
    this.nextBefore = null;
    this.nextAfter = null;
  }

  private handleEventGroupShow(event: MouseEvent) {
    const grouping = event.currentTarget as HTMLDivElement;
    const groupIndex = parseInt(grouping.getAttribute('data-group-index'));
    const eventGroup = this.eventGroups[
      this.eventGroups.length - groupIndex - 1
    ];
    eventGroup.open = true;
    this.requestUpdate('eventGroups');
  }

  private handleEventGroupHide(event: MouseEvent) {
    const grouping = event.currentTarget as HTMLDivElement;
    const groupIndex = parseInt(grouping.getAttribute('data-group-index'));
    const eventGroup = this.eventGroups[
      this.eventGroups.length - groupIndex - 1
    ];

    // mark us as closing
    eventGroup.closing = true;
    this.requestUpdate('eventGroups');

    // after our animation, close it up for real
    setTimeout(() => {
      eventGroup.closing = false;
      eventGroup.open = false;
      this.requestUpdate('eventGroups');
    }, 300);
  }

  private handleScroll() {
    const events = this.shadowRoot.host;

    // check if any of our sticky elements are off the screen
    const stickies = this.shadowRoot.querySelectorAll('.sticky');
    const stickyBin = this.getDiv('.sticky-bin');

    stickies.forEach((sticky: HTMLDivElement) => {
      const scrollBoundary = this.scrollTop + stickyBin.clientHeight + 136;

      if (!sticky.classList.contains('pinned')) {
        const eventElement = sticky.firstElementChild as HTMLDivElement;

        if (scrollBoundary > sticky.offsetTop) {
          sticky.style.height = eventElement.clientHeight + 'px';
          sticky.classList.add('pinned');
          (sticky as any).eventElement = eventElement;
          stickyBin.appendChild(eventElement);
          const uuid = eventElement.getAttribute('data-sticky-id');
          const ticket = this.getTicket(uuid);
          if (ticket) {
            if (
              !this.currentTicket ||
              this.currentTicket.uuid !== ticket.uuid
            ) {
              this.currentTicket = ticket;
            }
          }
        }
      } else {
        const eventElement = (sticky as any).eventElement;
        if (scrollBoundary < sticky.offsetTop + sticky.offsetHeight) {
          sticky.appendChild(eventElement);
          sticky.classList.remove('pinned');

          const uuid = eventElement.getAttribute('data-sticky-id');

          let previousTicket: Ticket = null;
          for (const ticket of this.tickets) {
            if (ticket.uuid === uuid) {
              break;
            }
            previousTicket = ticket;
          }

          if (
            previousTicket &&
            (!this.currentTicket ||
              this.currentTicket.uuid !== previousTicket.uuid)
          ) {
            if (previousTicket.status === 'open') {
              this.currentTicket = previousTicket;
            } else {
              this.currentTicket = null;
            }
          }
        }
      }
    });

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

  public renderEvent(event: ContactEvent): TemplateResult {
    switch (event.type) {
      case Events.IVR_CREATED:
      case Events.MESSAGE_CREATED:
      case Events.MESSAGE_RECEIVED:
      case Events.BROADCAST_CREATED:
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
        const ticketOpened = event as TicketEvent;
        const activeTicket =
          !this.ticket || ticketOpened.ticket.uuid === this.ticket;

        let closeHandler = null;
        const ticket = this.getTicketForEvent(ticketOpened);
        if (activeTicket && ticket && ticket.status === 'open') {
          closeHandler = this.handleClose;
        }

        return renderTicketOpened(ticketOpened, closeHandler, activeTicket);
      }

      case Events.TICKET_CLOSED: {
        const ticketClosed = event as TicketEvent;
        const active = !this.ticket || ticketClosed.ticket.uuid === this.ticket;
        return renderTicketClosed(ticketClosed, active);
      }
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
    }

    return html`<temba-icon
        name="alert-triangle"
        style="fill:var(--color-error)"
      ></temba-icon>
      <div class="description">${event.type}</div>`;
  }

  private handleClose(uuid: string) {
    this.httpComplete = postJSON(`/api/v2/tickets.json?uuid=${uuid}`, {
      status: 'closed',
    })
      .then(() => {
        this.refreshTickets();
        this.refresh();
        this.fireCustomEvent(CustomEventType.ContentChanged, {
          ticket: { uuid, status: 'C' },
        });
        this.updateCurrentTicket();
      })
      .catch((response: any) => {
        console.error(response);
      });
  }

  public getEventHandlers() {
    return [
      {
        event: 'scroll',
        method: throttle(this.handleScroll, 50),
      },
    ];
  }

  /** Check if a ticket event is no longer represented in a session */
  private isPurged(ticket: Ticket): boolean {
    return !this.ticketEvents[ticket.uuid];
  }

  public render(): TemplateResult {
    // render our older tickets as faux-events
    const unfetchedTickets =
      this.eventGroups.length > 0 && this.tickets
        ? this.tickets.map((ticket: Ticket) => {
            if (ticket && ticket.status === 'open') {
              const opened = new Date(ticket.opened_on).getTime() * 1000;
              if (opened < this.nextBefore || this.isPurged(ticket)) {
                const ticketOpenedEvent = {
                  type: Events.TICKET_OPENED,
                  ticket: {
                    uuid: ticket.uuid,
                    subject: ticket.subject,
                    body: ticket.body,
                    ticketer: ticket.ticketer,
                  },
                  // eslint-disable-next-line @typescript-eslint/camelcase
                  created_on: ticket.opened_on,
                };

                const renderedEvent = renderTicketOpened(
                  ticketOpenedEvent,
                  this.handleClose,
                  true
                );
                return html`<div class="event ${Events.TICKET_OPENED}">
                  ${renderedEvent}
                </div>`;
              }
            }
          })
        : null;

    return html`
      ${this.fetching
        ? html`<temba-loading units="5" size="10"></temba-loading>`
        : html`<div style="height:2em"></div>`}
      <div class="sticky-bin">${unfetchedTickets}</div>
      ${this.tickets
        ? this.eventGroups.map((eventGroup: EventGroup, index: number) => {
            const grouping = getEventGroupType(
              eventGroup.events[0],
              this.ticket
            );
            const groupIndex = this.eventGroups.length - index - 1;

            const classes = getClasses({
              grouping: true,
              [grouping]: true,
              expanded: eventGroup.open,
              closing: eventGroup.closing,
            });

            return html`<div class="${classes}">
              ${grouping === 'verbose'
                ? html`<div
                    class="event-count"
                    @click=${this.handleEventGroupShow}
                    data-group-index="${groupIndex}"
                  >
                    ${eventGroup.events.length}
                    ${eventGroup.events.length === 1
                      ? html`event`
                      : html`events`}
                  </div>`
                : null}
              ${grouping === 'verbose'
                ? html`
                    <temba-icon
                      @click=${this.handleEventGroupHide}
                      data-group-index="${groupIndex}"
                      class="grouping-close-button"
                      name="x"
                      clickable
                    ></temba-icon>
                  `
                : null}
              ${eventGroup.events.map((event: ContactEvent) => {
                const stickyId = this.getStickyId(event);
                const isSticky = !!stickyId;
                const renderedEvent = html`
                  <div
                    class="event ${event.type} ${isSticky ? 'has-sticky' : ''}"
                    data-sticky-id="${stickyId}"
                  >
                    ${this.renderEvent(event)}
                  </div>
                  ${this.debug
                    ? html`<pre>${JSON.stringify(event, null, 2)}</pre>`
                    : null}
                `;

                if (stickyId) {
                  return html`<div class="sticky">${renderedEvent}</div>`;
                }

                return renderedEvent;
              })}
            </div>`;
          })
        : null}
    `;
  }
}
