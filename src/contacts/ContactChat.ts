import {
  css,
  customElement,
  html,
  property,
  TemplateResult,
} from "lit-element";
import RapidElement from "../RapidElement";
import { Contact, ContactTicket, CustomEventType } from "../interfaces";
import {
  closeTicket,
  ContactEvent,
  ContactGroupsEvent,
  ContactHistoryPage,
  ErrorMessageEvent,
  EventGroup,
  Events,
  fetchContactHistory,
  FlowEvent,
  MAX_CHAT_REFRESH,
  MIN_CHAT_REFRESH,
  MsgEvent,
  ObjectReference,
  SCROLL_THRESHOLD,
  UpdateFieldEvent,
  UpdateResultEvent,
  WebhookEvent,
} from "./helpers";
import {
  getClasses,
  getUrl,
  oxfordFn,
  postForm,
  postUrl,
  throttle,
  timeSince,
} from "../utils";
import TextInput from "../textinput/TextInput";

@customElement("temba-contact-chat")
export default class ContactChat extends RapidElement {
  @property({ type: Object })
  ticket: ContactTicket = null;

  @property({ type: String })
  endpoint: string;

  @property({ type: String })
  contactsEndpoint: string = "/api/v2/contacts.json";

  @property({ type: Array })
  eventGroups: EventGroup[] = [];

  @property({ type: Boolean })
  fetching: boolean = false;

  @property({ type: String })
  currentChat: string = "";

  @property({ type: Boolean })
  refreshing: boolean = false;

  @property({ type: Boolean })
  complete: boolean = false;

  @property({ type: Boolean })
  showDetails: boolean = false;

  @property({ type: Boolean })
  debug: boolean = false;

  @property({ attribute: false, type: Object })
  mostRecentEvent: ContactEvent;

  lastHeight: number = undefined;
  lastRefreshAdded: number;
  refreshTimeout: any = null;
  nextBefore: number;
  nextAfter: number;
  empty = false;

  static get styles() {
    return css`
      :host {
        --event-padding: 0.5em 1em;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1),
          0 1px 2px 0 rgba(0, 0, 0, 0.06);

        height: 100%;
        border-radius: 0.5rem;
        
        flex-grow: 1;
        width: 100%;
        display: block;
        background: #f2f2f2;
        overflow:hidden;
      }


      .chat-wrapper {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #fff;
        
      }

      .events {
        padding: 1em;
        flex-grow: 1;
        overflow-y: scroll;
        margin-bottom: 1;
        display: flex;
        flex-direction: column;
        // min-width:80%
      }

      .grouping {
        color #fff;
        padding:2em;
        margin: 0 -1em;
        padding-bottom: 1em;
      }


      .grouping.verbose {
        background: #f9f9f9;
        max-height: 1px;
        border-top: 1px solid #f9f9f9;
        padding-top: 0;
        padding-bottom: 0;
        margin-top: 0;
        margin-bottom: 0;
      }

      .grouping.verbose > .event, .grouping.verbose > pre {
        max-height: 0px;
        padding-top: 0;
        padding-bottom: 0;
        margin-top: 0;
        margin-bottom: 0;        
        opacity: 0;
      }

      .event-count {
        position: relative;
        top: -1.2em;
        font-size: .8em;
        text-align: center;
        border: 2px solid #f9f9f9;
        background: #fff;
        margin: auto;
        display: table;
        padding: 3px 10px;
        font-weight: 400;
        color: #777;
        border-radius: 6px;
        cursor: pointer;
        transition: all 200ms ease-in-out;
        transform: scale(.9);
        min-width: 0%;
      }

      .event-count:hover {
        padding: 3px 10px;
        min-width: 50%;
        background: #f9f9f9;
        color: #333;
        transform: scale(1);
      }

      .expanded .event-count {
        display: none;
      }

      .grouping.flows {
        
        margin: 2em 1em;

        // padding-top: 0.5em;

        border: 1px solid #f2f2f2;
        border-radius: 6px;
        padding: 0.5em 1em;
      }

      .grouping.flows .event {
        margin: 0;
        padding: 0;
      }

      pre {
        white-space: pre-wrap;
        word-wrap: break-word; 
      }

      .grouping.verbose.expanded {
        background: #f9f9f9;
        max-height: 1000px;
        border-top: 1px solid #f1f1f1;
        padding:2em;
        margin: 0 -1em;
        padding-bottom: 1em;
        box-shadow: inset 0px 11px 8px -15px #CCC, inset 0px -11px 8px -15px #CCC; 
        transition: all 200ms ease-in-out;
      }

      .grouping.verbose.expanded .event, .grouping.verbose.expanded pre {
        max-height: 500px;
        margin-bottom: 1em;
        opacity: 1;
        transition: all 200ms ease-in-out;
      }

      .grouping.messages {
        display: flex;
        flex-direction: column;
      }

      .event {
        margin-bottom: 1em;
        border-radius: 6px;
      }

      .msg {
        padding: var(--event-padding);
        border-radius: 8px;
        border: 1px solid rgba(100, 100, 100, 0.1);
        max-width: 300px;
      }

      .event.msg_received .msg {
        background: rgba(200, 200, 200, 0.1);        
      }

      .event.msg_created,
      .event.broadcast_created {
        align-self: flex-end;
      }

      .event.msg_created .msg,
      .event.broadcast_created .msg {
        background: rgb(231, 243, 255);
      }

      .webhook_called {
        fill: #e68628;
      }

      .webhook_called .failed {
        fill: var(--color-error);
        color: var(--color-error);
      }

      .contact_field_changed,
      .run_result_changed {
        fill: rgba(1, 193, 175, 1);
      }

      .contact_groups_changed .added {
        fill: #309c42;
      }
      .contact_groups_changed .removed {
        fill: var(--color-error);
      }

      .event.error .description, .event.failure .description {
        color: var(--color-error);
      }

      .info {
        border: 1px solid rgba(100, 100, 100, 0.2);
        background: rgba(10, 10, 10, 0.02);
      }

      .flow_exited,
      .flow_entered {
        align-self: center;
        max-width: 80%;
        fill: rgba(223, 65, 159, 1);
        display: flex;
        flex-direction: row;
      }

      .event {
        display: flex;
      }

      .event .description {
        flex-grow: 1;
      }

      .details {
        --icon-color: rgba(0, 0, 0, 0.4);
        font-size: 75%;
        color: rgba(0, 0, 0, 0.4);
        padding-top: 0.3em;
        padding-right: 3px;
        display: flex;
      }

      .time {
        --icon-color: rgba(0, 0, 0, 0.4);
        font-size: 75%;
        color: rgba(0, 0, 0, 0.4);
        padding: 0.3em 3px;
      }

      .event.msg_created .time,
      .event.broadcast_created .time {
        text-align: right;
      }

      .chatbox {
        padding: 1em;
        background: #f2f2f2;
        border-top: 3px solid #e1e1e1;
      }

      temba-icon {
        margin-right: 0.75em;
      }

      temba-textinput {
        --textarea-height: 75px;
      }

      .attn {
        display: inline-block;
        font-weight: 400;
      }

      a {
        color: var(--color-link-primary);
      }

      a:hover {
        text-decoration: underline;
        color: var(--color-link-primary-hover);
      }

      temba-loading {
        align-self: center;
        margin-top: .025em;
        position: absolute;
        z-index: 1000;
      }

      #send-button {
        margin-top: 1em;
        margin-right: 2px;
        --button-y: 2px;
      }


      .toolbar {
        position: relative;
        width: 2em;
        background: #fff;
        transition: all 600ms ease-in;
        z-index: 10;
        box-shadow: -7px 0px 7px 1px rgba(0, 0, 0, 0.05);
        flex-shrink: 0;
        border-top-right-radius: 0.5em;
        border-bottom-right-radius: 0.5em;
        padding: .5em 0;
        
      }

      .toolbar temba-icon {
        display: block;
        width: 1em;
        margin: 0 auto;
        fill: rgb(90,90,90);
      }

      .toolbar.closed {
        box-shadow: -1px 0px 1px 1px rgba(0, 0, 0, .01);
      }

      .toolbar:hover {
        // background: #d2d2d2;
        // cursor: pointer;
      }

      temba-contact-details {
        // margin-right: -2em;
        // padding-right: 3em;
        // padding-top: 1em;
        // padding-left: 1em;
        flex-basis: 16em;
        flex-grow: 0;
        flex-shrink: 0;
        transition: margin 600ms cubic-bezier(0.68, -0.55, 0.265, 1.05);
        z-index: 5;
        // width: 18em;
        // margin-top:6px;
        // border-top-right-radius: 0.5em;
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

      #close-button, #open-button {
        margin-top: 1em;
      }

      #details-button {
        margin-top: .25em;
        transform: rotate(180deg);
      }
    `;
  }

  getEventGroupType = (event: ContactEvent) => {
    if (!event) {
      return "messages";
    }
    switch (event.type) {
      case Events.FLOW_ENTERED:
      case Events.FLOW_EXITED:
        return "flows";
      case Events.BROADCAST_CREATED:
      case Events.MESSAGE_CREATED:
      case Events.MESSAGE_RECEIVED:
        return "messages";
    }
    return "verbose";
  };

  constructor() {
    super();
  }

  private getEventGroups(events: ContactEvent[]): EventGroup[] {
    const grouped: EventGroup[] = [];
    let eventGroup: EventGroup = undefined;
    for (const event of events) {
      const currentEventGroupType = this.getEventGroupType(event);
      // see if we need a new event group
      if (!eventGroup || eventGroup.type !== currentEventGroupType) {
        // we have a new type, save our last group
        if (eventGroup) {
          grouped.push(eventGroup);
        }
        eventGroup = {
          open: false,
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

  private getLastEventTime(): number {
    const mostRecentGroup = this.eventGroups[this.eventGroups.length - 1];
    if (mostRecentGroup) {
      const mostRecentEvent =
        mostRecentGroup.events[mostRecentGroup.events.length - 1];
      return new Date(mostRecentEvent.created_on).getTime();
    }
    return 0;
  }

  public refresh(): void {
    this.scheduleRefresh(500);
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

  private updateMostRecent(newEvent: ContactEvent) {
    if (
      !this.mostRecentEvent ||
      this.mostRecentEvent.type !== newEvent.type ||
      this.mostRecentEvent.created_on !== newEvent.created_on
    ) {
      this.mostRecentEvent = newEvent;
    }
  }

  private reset() {
    this.endpoint = null;
    this.eventGroups = [];
    this.fetching = false;
    this.complete = false;
    this.nextBefore = null;
    this.nextAfter = null;
  }

  public updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    // fire an event if we get a new event
    if (changedProperties.has("mostRecentEvent")) {
      this.fireCustomEvent(CustomEventType.Refreshed);
    }

    // if we don't have an endpoint infer one
    if (changedProperties.has("ticket")) {
      if (this.ticket == null) {
        this.reset();
      } else {
        const endpoint = `/contact/history/${this.ticket.contact.uuid}/?_format=json`;
        if (this.endpoint !== endpoint) {
          this.reset();
          this.endpoint = endpoint;
        }
      }
    }

    if (
      changedProperties.has("refreshing") &&
      this.refreshing &&
      this.endpoint
    ) {
      const after = (this.getLastEventTime() - 1) * 1000;
      let forceOpen = false;

      fetchContactHistory(false, this.endpoint, null, after)
        .then((results: ContactHistoryPage) => {
          // if (lastEndpoint !== this.endpoint) {
          // return;
          // }

          if (results.events && results.events.length > 0) {
            this.updateMostRecent(results.events[0]);
          }

          let fetchedEvents = results.events.reverse();

          // dedupe any events we get from the server
          // TODO: perhaps make this a little less crazy
          fetchedEvents = fetchedEvents.filter((item) => {
            const found = !!this.eventGroups.find(
              (g) =>
                !!g.events.find(
                  (exists) =>
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
        .catch((error) => {
          this.refreshing = false;
          this.scheduleRefresh();
        });
    }

    if (changedProperties.has("fetching") && this.fetching) {
      const events = this.getDiv(".events");
      this.lastHeight = events.scrollHeight;

      if (!this.nextBefore) {
        this.nextBefore = new Date().getTime() * 1000 - 1000;
      }

      fetchContactHistory(
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

    if (changedProperties.has("refreshing") && !this.refreshing) {
      if (this.lastRefreshAdded > 0) {
        const events = this.getDiv(".events");

        // if we are near the bottom, push us to the bottom to show new stuff
        const distanceFromBottom =
          events.scrollHeight - events.scrollTop - this.lastHeight;
        if (distanceFromBottom < 150) {
          events.scrollTo({ top: events.scrollHeight, behavior: "smooth" });
        }
      }
    }

    if (changedProperties.has("fetching") && !this.fetching) {
      const events = this.getDiv(".events");
      if (events.scrollHeight > this.lastHeight) {
        events.scrollTop =
          events.scrollTop + events.scrollHeight - this.lastHeight;
      }

      // scroll to the bottom if it's our first fetch
      if (this.lastHeight === 0) {
        events.scrollTop = events.scrollHeight;
      }
    }

    if (changedProperties.has("endpoint") && this.endpoint) {
      this.fetching = true;
      this.empty = true;
    }
  }

  public renderMsgEvent(event: MsgEvent): TemplateResult {
    return html`
      ${event.type === Events.MESSAGE_RECEIVED
        ? html`
            <div>
              <div class="msg">${event.msg.text}</div>
              <div class="time">${timeSince(new Date(event.created_on))}</div>
            </div>
          `
        : html`
            <div>
              <div class="msg">${event.msg.text}</div>

              <div class="time">
                ${event.recipient_count > 1
                  ? html`<temba-icon
                        size="1"
                        name="megaphone"
                        style="display:inline-block;"
                      ></temba-icon>
                      ${event.recipient_count} contacts • `
                  : null}
                ${timeSince(new Date(event.created_on))}
              </div>
            </div>
          `}
    `;
  }

  public renderFlowEvent(event: FlowEvent): TemplateResult {
    const verb = event.type === Events.FLOW_ENTERED ? "Started" : "Completed";
    const icon = event.type === Events.FLOW_ENTERED ? "flow" : "check";
    return html`
      <temba-icon name="${icon}"></temba-icon>
      <div class="description">
        ${verb}
        <a target="_" href="/flow/editor/${event.flow.uuid}/"
          >${event.flow.name}</a
        >
      </div>
    `;
  }

  public renderResultEvent(event: UpdateResultEvent): TemplateResult {
    return html`
      <temba-icon name="flow"></temba-icon>
      <div class="description">
        Updated
        <div class="attn">${event.name}</div>
        to
        <div class="attn">${event.value}</div>
      </div>
    `;
  }

  public renderUpdateEvent(event: UpdateFieldEvent): TemplateResult {
    return html`
      <temba-icon name="contact"></temba-icon>
      <div class="description">
        Updated
        <div class="attn">${event.field.name}</div>
        to
        <div class="attn">${event.value.text}</div>
      </div>
    `;
  }

  public renderErrorMessage(event: ErrorMessageEvent): TemplateResult {
    return html`
      <temba-icon
        name="alert-triangle"
        style="fill:var(--color-error)"
      ></temba-icon>
      <div class="description">
        ${event.text}
        ${event.type === Events.FAILURE
          ? html`<div>Run ended prematurely, check the flow design.</div>`
          : null}
      </div>
    `;
  }

  public renderWebhookEvent(event: WebhookEvent): TemplateResult {
    return html`
      <div
        class="${event.status === "success" ? "" : "failed"}"
        style="display: flex"
      >
        <temba-icon name="external-link"></temba-icon>
        <div class="description">
          ${event.status === "success"
            ? html`Successfully called ${event.url}`
            : html`Failed to call ${event.url}`}
        </div>
      </div>
    `;
  }

  public renderContactGroupsEvent(event: ContactGroupsEvent): TemplateResult {
    const groups = event.groups_added || event.groups_removed;
    const added = !!event.groups_added;
    return html`
      <temba-icon
        name="users"
        class="${getClasses({ added: added, removed: !added })}"
      ></temba-icon>
      <div class="description">
        ${added ? "Added to" : "Removed from"}
        ${oxfordFn(
          groups,
          (group: ObjectReference) =>
            html`<a target="_" href="/contact/filter/${group.uuid}"
              >${group.name}</a
            >`
        )}
        ${event.type === Events.FAILURE
          ? html`<div>Run ended prematurely, check the flow design.</div>`
          : null}
      </div>
    `;
  }

  public renderEvent(event: ContactEvent): TemplateResult {
    switch (event.type) {
      case Events.MESSAGE_CREATED:
      case Events.MESSAGE_RECEIVED:
      case Events.BROADCAST_CREATED:
        return this.renderMsgEvent(event as MsgEvent);

      case Events.FLOW_ENTERED:
      case Events.FLOW_EXITED:
        return this.renderFlowEvent(event as FlowEvent);

      case Events.RUN_RESULT_CHANGED:
        return this.renderResultEvent(event as UpdateResultEvent);
      case Events.CONTACT_FIELD_CHANGED:
        return this.renderUpdateEvent(event as UpdateFieldEvent);

      case Events.ERROR:
      case Events.FAILURE:
        return this.renderErrorMessage(event as ErrorMessageEvent);
      case Events.CONTACT_GROUPS_CHANGED:
        return this.renderContactGroupsEvent(event as ContactGroupsEvent);
      case Events.WEBHOOK_CALLED:
        return this.renderWebhookEvent(event as WebhookEvent);
    }

    return html`<temba-icon
        name="alert-triangle"
        style="fill:var(--color-error)"
      ></temba-icon>
      <div class="description">render missing: ${event.type}</div>`;
  }

  private handleEventGroupClick(event: MouseEvent) {
    const grouping = event.currentTarget as HTMLDivElement;
    if (grouping.classList.contains("verbose")) {
      const groupIndex = parseInt(grouping.getAttribute("data-group-index"));
      const eventGroup = this.eventGroups[
        this.eventGroups.length - groupIndex - 1
      ];
      eventGroup.open = true;
      this.requestUpdate("eventGroups");
    }
  }

  private handleEventScroll(event: MouseEvent) {
    const events = this.getDiv(".events");
    if (events.scrollTop <= SCROLL_THRESHOLD) {
      if (this.eventGroups.length > 0 && !this.fetching && !this.complete) {
        this.fetching = true;
      }
    }
  }

  private handleChatChange(event: Event) {
    event.stopPropagation();
    event.preventDefault();

    const chat = event.currentTarget as TextInput;
    this.currentChat = chat.value;

    if (this.currentChat === "__refresh") {
      this.refreshing = true;
      this.currentChat = "";
    }

    if (this.currentChat === "__debug") {
      this.debug = true;
      this.currentChat = "";
    }

    if (this.currentChat === "__clear") {
      this.debug = false;
      this.currentChat = "";
    }
  }

  private handleClose(event: MouseEvent) {
    postForm(`/ticket/update/${this.ticket.uuid}/?_format=json`, {
      status: "C",
    })
      .then((response) => {
        this.fireCustomEvent(CustomEventType.ContentChanged, {
          ticket: { uuid: this.ticket.uuid, status: "C" },
        });
      })
      .catch((response: any) => {
        console.error(response.errors);
      });
  }

  private handleOpen(event: MouseEvent) {
    postForm(`/ticket/update/${this.ticket.uuid}/?_format=json`, {
      status: "O",
    })
      .then((response) => {
        this.fireCustomEvent(CustomEventType.ContentChanged, {
          ticket: { uuid: this.ticket.uuid, status: "O" },
        });
      })
      .catch((response: any) => {
        console.error(response.errors);
      });
  }

  private refreshEvents() {
    setTimeout(() => {
      const events = this.getDiv(".events");
      events.scrollTop = events.scrollHeight;
      this.refreshing = true;
    }, 500);
  }

  private handleSend(event: MouseEvent) {
    postUrl(`/api/v2/broadcasts.json`, {
      contacts: [this.ticket.contact.uuid],
      text: this.currentChat,
    })
      .then((response) => {
        this.currentChat = "";
        if (this.ticket.status === "C") {
          // if we are closed, reopen us
          postForm(`/ticket/update/${this.ticket.uuid}/?_format=json`, {
            status: "O",
          }).then(() => {
            this.ticket.status = "O";
            this.fireCustomEvent(CustomEventType.ContentChanged, {
              ticket: { uuid: this.ticket.uuid, status: "O" },
              focus: true,
            });
            this.requestUpdate("ticket");
            this.scheduleRefresh(500);
          });
        } else {
          this.scheduleRefresh(500);
        }
      })
      .catch(() => {
        // error message dialog?
      })
      .finally(() => {
        // refocus our chatbox
        const chatbox = this.shadowRoot.querySelector(
          "temba-textinput"
        ) as TextInput;

        chatbox.click();
      });
  }

  private handleDetailSlider(): void {
    this.showDetails = !this.showDetails;
  }

  public render(): TemplateResult {
    return html`
      <div style="display: flex; height: 100%;">
        <div style="flex-grow: 1; margin-right: 0em;">
          <div class="chat-wrapper">
            <div class="events" @scroll=${throttle(this.handleEventScroll, 50)}>
              ${this.fetching
                ? html`<temba-loading units="5" size="10"></temba-loading>`
                : html`<div style="height:2em"></div>`}
              ${this.eventGroups.map(
                (eventGroup: EventGroup, index: number) => {
                  const grouping = this.getEventGroupType(eventGroup.events[0]);
                  const groupIndex = this.eventGroups.length - index - 1;

                  const classes = getClasses({
                    grouping: true,
                    [grouping]: true,
                    expanded: eventGroup.open,
                  });

                  return html`<div
                    @click=${this.handleEventGroupClick}
                    data-group-index="${groupIndex}"
                    class="${classes}"
                  >
                    ${grouping === "verbose"
                      ? html`<div class="event-count">
                          ${eventGroup.events.length}
                          ${eventGroup.events.length === 1
                            ? html`event`
                            : html`events`}
                        </div>`
                      : null}
                    ${eventGroup.events.map((event: ContactEvent) => {
                      return html`
                        <div class="event ${event.type}">
                          ${this.renderEvent(event)}
                        </div>
                        ${this.debug
                          ? html`<pre>${JSON.stringify(event, null, 2)}</pre>`
                          : null}
                      `;
                    })}
                  </div>`;
                }
              )}
            </div>
            ${this.ticket
              ? html` <div class="chatbox">
                  <temba-textinput
                    textarea
                    @change=${this.handleChatChange}
                    .value=${this.currentChat}
                  ></temba-textinput>

                  <div
                    style="display:flex; align-items: flex-end; flex-direction: column"
                  >
                    <temba-button
                      id="send-button"
                      name="${this.ticket && this.ticket.status === "C"
                        ? "Send and Reopen"
                        : "Send"}"
                      ?disabled=${this.currentChat.length === 0 ? true : false}
                      @click=${this.handleSend}
                    ></temba-button>
                  </div>
                </div>`
              : null}
          </div>
        </div>
        ${this.ticket
          ? html`<temba-contact-details
              style="z-index: 10"
              class="${this.showDetails ? "" : "hidden"}"
              .ticket="${this.ticket}"
              .visible=${this.showDetails}
              endpoint="${this.contactsEndpoint}?uuid=${this.ticket.contact
                .uuid}"
            ></temba-contact-details>`
          : null}

        <div class="toolbar ${this.showDetails ? "" : "closed"}">
          ${this.ticket
            ? html`
                <temba-icon
                  id="details-button"
                  name="${this.showDetails ? "chevrons-left" : "sidebar"}"
                  @click="${this.handleDetailSlider}"
                  clickable
                ></temba-icon>

                ${this.ticket.status !== "C"
                  ? html`<temba-icon
                      id="close-button"
                      name="check"
                      @click="${this.handleClose}"
                      clickable
                    ></temba-icon>`
                  : html`<temba-icon
                      id="open-button"
                      name="inbox"
                      @click="${this.handleOpen}"
                      clickable
                    ></temba-icon>`}
              `
            : null}
        </div>
      </div>
    `;
  }
}
