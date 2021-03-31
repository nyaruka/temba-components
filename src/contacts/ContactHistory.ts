import { css, property } from 'lit-element';
import { html, TemplateResult } from 'lit-html';
import { CustomEventType } from '../interfaces';
import { RapidElement } from '../RapidElement';
import { getClasses, throttle } from '../utils';
import { ContactChat } from './ContactChat';
import {
  getEventGroupType,
  getEventStyles,
  renderContactGroupsEvent,
  renderContactURNsChanged,
  renderEmailSent,
  renderErrorMessage,
  renderFlowEvent,
  renderLabelsAdded,
  renderMsgEvent,
  renderNameChanged,
  renderResultEvent,
  renderTicketOpened,
  renderUpdateEvent,
  renderWebhookEvent,
} from './events';
import {
  ContactEvent,
  ContactGroupsEvent,
  ContactHistoryPage,
  EmailSentEvent,
  ErrorMessageEvent,
  EventGroup,
  Events,
  fetchContactHistory,
  FlowEvent,
  LabelsAddedEvent,
  MAX_CHAT_REFRESH,
  MIN_CHAT_REFRESH,
  MsgEvent,
  NameChangedEvent,
  SCROLL_THRESHOLD,
  TicketOpenedEvent,
  UpdateFieldEvent,
  UpdateResultEvent,
  URNsChangedEvent,
  WebhookEvent,
} from './helpers';

export class ContactHistory extends RapidElement {
  public httpComplete: Promise<void | ContactHistoryPage>;

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
      }

      temba-loading {
        align-self: center;
        margin-top: 0.025em;
        position: absolute;
        z-index: 1000;
      }
    `;
  }

  @property({ type: String })
  uuid: string;

  @property({ type: Array })
  eventGroups: EventGroup[] = [];

  @property({ type: Boolean })
  refreshing: boolean = false;

  @property({ type: Boolean })
  fetching: boolean = false;

  @property({ type: Boolean })
  complete: boolean = false;

  @property({ type: String })
  endpoint: string;

  @property({ type: Boolean })
  debug: boolean = false;

  @property({ attribute: false, type: Object })
  mostRecentEvent: ContactEvent;

  nextBefore: number;
  nextAfter: number;
  lastHeight: number = 0;
  lastRefreshAdded: number;
  refreshTimeout: any = null;
  empty = false;

  public updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

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
          this.endpoint = endpoint;
        }
      }
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
        .catch(error => {
          this.refreshing = false;
          this.scheduleRefresh();
        });
    }

    if (changedProperties.has('fetching') && this.fetching) {
      const events = this.shadowRoot.host;

      // console.log("fetching, saving last height", events.scrollHeight);
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
        // console.log('Scrolling to', scrollTop);

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
  }

  public refresh(): void {
    this.scheduleRefresh(500);
  }

  private getEventGroups(events: ContactEvent[]): EventGroup[] {
    const grouped: EventGroup[] = [];
    let eventGroup: EventGroup = undefined;
    for (const event of events) {
      const currentEventGroupType = getEventGroupType(event);
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

  private scheduleRefresh(wait: number = -1) {
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

  private handleEventScroll(event: MouseEvent) {
    const events = this.shadowRoot.host;
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

      case Events.TICKET_OPENED:
        return renderTicketOpened(event as TicketOpenedEvent);

      case Events.ERROR:
      case Events.FAILURE:
        return renderErrorMessage(event as ErrorMessageEvent);
      case Events.CONTACT_GROUPS_CHANGED:
        return renderContactGroupsEvent(event as ContactGroupsEvent);
      case Events.WEBHOOK_CALLED:
        return renderWebhookEvent(event as WebhookEvent);
    }

    return html`<temba-icon
        name="alert-triangle"
        style="fill:var(--color-error)"
      ></temba-icon>
      <div class="description">render missing: ${event.type}</div>`;
  }

  public getEventHandlers() {
    return [
      {
        event: 'scroll',
        method: throttle(this.handleEventScroll, 50),
      },
    ];
  }

  // @scroll=${throttle(this.handleEventScroll, 50)}
  public render(): TemplateResult {
    return html`
      ${this.fetching
        ? html`<temba-loading units="5" size="10"></temba-loading>`
        : html`<div style="height:2em"></div>`}
      ${this.eventGroups.map((eventGroup: EventGroup, index: number) => {
        const grouping = getEventGroupType(eventGroup.events[0]);
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
                ${eventGroup.events.length === 1 ? html`event` : html`events`}
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
            return html`
              <div class="event ${event.type}">${this.renderEvent(event)}</div>
              ${this.debug
                ? html`<pre>${JSON.stringify(event, null, 2)}</pre>`
                : null}
            `;
          })}
        </div>`;
      })}
    `;
  }
}
