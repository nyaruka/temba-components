import {
  css,
  customElement,
  html,
  property,
  TemplateResult,
} from "lit-element";
import RapidElement from "../RapidElement";
import ContactDetails from "../contacts/ContactDetails";
import VectorIcon from "../vectoricon/VectorIcon";
import { Contact } from "../interfaces";
import {
  ContactEvent,
  ContactGroupsEvent,
  ContactHistoryPage,
  ErrorMessageEvent,
  Events,
  fetchContactHistory,
  FlowEvent,
  MsgEvent,
  ObjectReference,
  UpdateFieldEvent,
  UpdateResultEvent,
} from "./helpers";
import { oxfordFn, oxfordNamed } from "../utils";

@customElement("temba-contact-chat")
export default class ContactChat extends RapidElement {
  @property({ type: Object })
  contact: Contact;

  @property({ type: String })
  endpoint: string;

  @property({ type: Array })
  events: ContactEvent[][] = [];

  debug: boolean = false;

  static get styles() {
    return css`
      :host {
        --event-padding: 0.5em 1em;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1),
          0 1px 2px 0 rgba(0, 0, 0, 0.06);

        height: 100%;
        border-radius: 0.5rem;
        background-color: #fff;
        flex-grow: 1;
        width: 100%;
        display: block;
        overflow: hidden;
      }

      temba-contact-details {
        padding-right: 1em;
        padding-top: 1em;
        padding-left: 1em;
        flex-basis: 200px;
        flex-grow: 0;
        flex-shrink: 0;
      }

      .chat-wrapper {
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      .events {
        padding: 1em;
        flex-grow: 1;
        overflow-y: scroll;
        margin-bottom: 1;
        display: flex;
        flex-direction: column;
      }

      .grouping {
        color #fff;
        padding:2em;
        margin: 0 -1em;
        padding-bottom: 1em;
      }

      .grouping.verbose {
        background: #f9f9f9;
        max-height: 2px;
        border-top: 1px solid #f1f1f1;
        padding-top: 0;
        padding-bottom: 0;
        margin-top: 0;
        margin-bottom: 0;
        transition: all 200ms ease-in-out;

      }

      .grouping.verbose .event {
        background: #f9f9f9;
        max-height: 0px;
        padding-top: 0;
        padding-bottom: 0;
        margin-top: 0;
        margin-bottom: 0;
        opacity: 0;
        transition: all 200ms ease-in-out;
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

      .grouping.verbose.expanded {
        background: #f9f9f9;
        max-height: 1000px;
        border-top: 1px solid #f1f1f1;
        padding:2em;
        margin: 0 -1em;
        padding-bottom: 1em;
        box-shadow: inset 0px 11px 8px -15px #CCC, inset 0px -11px 8px -15px #CCC; 

      }

      .grouping.verbose.expanded .event {
        background: #f9f9f9;
        max-height: 500px;
        margin-bottom: 1em;
        border-radius: 6px;
        opacity: 1;
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

      .contact_field_changed,
      .run_result_changed {
        // border: 1px solid rgba(100, 100, 100, 0.2);
        // padding: 1em;
        fill: rgba(1, 193, 175, 1);
      }

      .contact_groups_changed {
        fill: #309c42;
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
        // color: rgba(223, 65, 159, 1);
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
        font-size: 75%;
        color: rgba(0, 0, 0, 0.4);
        --icon-color: rgba(0, 0, 0, 0.4);
        padding-top: 0.3em;
        padding-right: 3px;
        display: flex;
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

    `;
  }

  nextBefore: number;
  nextAfter: number;

  getEventGrouping = (event: ContactEvent) => {
    switch (event.type) {
      case Events.BROADCAST_CREATED:
      case Events.MESSAGE_CREATED:
      case Events.MESSAGE_RECEIVED:
        return "messages";
    }
    return "verbose";
  };

  public updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    // if we don't have an endpoint infer one
    if (changedProperties.has("contact")) {
      this.events = [];
      this.endpoint = `/contact/history/${this.contact.uuid}/?_format=json`;
    }

    if (changedProperties.has("endpoint")) {
      fetchContactHistory(this.endpoint, new Date().getTime() * 1000).then(
        (results: ContactHistoryPage) => {
          const fetchedEvents = results.events.reverse();
          const scrollToEvent = fetchedEvents[fetchedEvents.length - 1];

          const grouped: ContactEvent[][] = [];

          let eventGroup: ContactEvent[] = [];
          let lastEventGroup: string = null;

          // rework our last group, new events might fit there
          if (this.events.length > 0) {
            eventGroup = this.events.splice(this.events.length, 1)[0];
            lastEventGroup = this.getEventGrouping(
              eventGroup[eventGroup.length - 1]
            );
          }

          for (const event of fetchedEvents) {
            const currentEventGroup = this.getEventGrouping(event);

            /* console.log(
              "match",
              currentEventGroup,
              lastEventGroup,
              currentEventGroup === lastEventGroup
            );*/

            if (
              eventGroup.length === 0 ||
              currentEventGroup === lastEventGroup
            ) {
              eventGroup.push(event);
              // console.log(currentEventGroup, lastEventGroup, "adding");
            } else {
              grouped.push(eventGroup);
              eventGroup = [event];
              // console.log(currentEventGroup, lastEventGroup, "reset");
            }
            lastEventGroup = currentEventGroup;
          }

          this.events = [...grouped, ...this.events];
          this.nextBefore = results.next_before;
          this.nextAfter = results.next_after;

          // console.log(scrollToEvent);
        }
      );
    }
  }

  public renderMsgEvent(event: MsgEvent): TemplateResult {
    return html`
      ${event.type === Events.MESSAGE_RECEIVED
        ? html` <div class="msg">${event.msg.text}</div> `
        : html`
            <div>
              <div class="msg">${event.msg.text}</div>
              ${event.recipient_count > 1
                ? html`<div class="details">
                    <temba-icon size="1.15" name="bullhorn"></temba-icon>
                    Sent to ${event.recipient_count} contacts
                  </div>`
                : null}
            </div>
          `}
    `;
  }

  public renderFlowEvent(event: FlowEvent): TemplateResult {
    const verb = event.type === Events.FLOW_ENTERED ? "Started" : "Completed";
    const icon = event.type === Events.FLOW_ENTERED ? "flow" : "checkmark";
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
      <temba-icon name="bars"></temba-icon>
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
      <temba-icon name="vcard"></temba-icon>
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
      <temba-icon name="warning"></temba-icon>
      <div class="description">
        ${event.text}
        ${event.type === Events.FAILURE
          ? html`<div>Run ended prematurely, check the flow design.</div>`
          : null}
      </div>
    `;
  }

  public renderContactGroupsEvent(event: ContactGroupsEvent): TemplateResult {
    return html`
      <temba-icon name="users-2"></temba-icon>
      <div class="description">
        Added to
        ${oxfordFn(
          event.groups_added,
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
    }

    return html`<temba-icon name="power"></temba-icon>
      <div class="description">
        ${event.type} ${JSON.stringify(event, null, 2)}
      </div>`;
  }

  private handleEventGroupClick(event: MouseEvent) {
    const grouping = event.currentTarget as HTMLDivElement;
    if (!grouping.classList.contains("expanded")) {
      grouping.classList.add("expanded");
    }
  }

  public render(): TemplateResult {
    return html`
      <div style="display: flex; height: 100%">
        <div style="flex-grow: 2; margin-right: 0em; min-width:400px">
          <div class="chat-wrapper">
            <div class="events">
              ${this.events.map((eventGroup: ContactEvent[]) => {
                const grouping = this.getEventGrouping(eventGroup[0]);
                return html`<div
                  @click=${this.handleEventGroupClick}
                  class="grouping ${grouping}"
                >
                  ${grouping === "verbose"
                    ? html`<div class="event-count">
                        ${eventGroup.length}
                        ${eventGroup.length === 1 ? html`event` : html`events`}
                      </div>`
                    : null}
                  ${eventGroup.map((event: ContactEvent) => {
                    return html`<div class="event ${event.type}">
                      ${this.renderEvent(event)}
                      ${this.debug ? JSON.stringify(event, null, 1) : null}
                    </div>`;
                  })}
                </div>`;
              })}
            </div>

            <div class="chatbox">
              <temba-textinput textarea></temba-textinput>
            </div>
          </div>
        </div>
        <temba-contact-details .contact=${this.contact}></temba-contact-details>
      </div>
    `;
  }
}
