import { __decorate } from "tslib";
/* eslint-disable @typescript-eslint/no-this-alias */
import { css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { CustomEventType } from '../interfaces';
import { fetchResults, getUrl, oxford, oxfordFn, postJSON, postUrl } from '../utils';
import { ContactStoreElement } from './ContactStoreElement';
import { MessageType } from '../display/Chat';
import { getUserDisplay } from '../webchat';
import { DEFAULT_AVATAR } from '../webchat/assets';
/*
export const SCROLL_THRESHOLD = 100;
export const SIMULATED_WEB_SLOWNESS = 0;
export const MAX_CHAT_REFRESH = 10000;
export const MIN_CHAT_REFRESH = 500;
export const BODY_SNIPPET_LENGTH = 250;
*/
export var Events;
(function (Events) {
    Events["MESSAGE_CREATED"] = "msg_created";
    Events["MESSAGE_RECEIVED"] = "msg_received";
    Events["BROADCAST_CREATED"] = "broadcast_created";
    Events["IVR_CREATED"] = "ivr_created";
    Events["FLOW_ENTERED"] = "flow_entered";
    Events["FLOW_EXITED"] = "flow_exited";
    Events["RUN_RESULT_CHANGED"] = "run_result_changed";
    Events["CONTACT_FIELD_CHANGED"] = "contact_field_changed";
    Events["CONTACT_GROUPS_CHANGED"] = "contact_groups_changed";
    Events["CONTACT_NAME_CHANGED"] = "contact_name_changed";
    Events["CONTACT_URNS_CHANGED"] = "contact_urns_changed";
    Events["CAMPAIGN_FIRED"] = "campaign_fired";
    Events["CHANNEL_EVENT"] = "channel_event";
    Events["CONTACT_LANGUAGE_CHANGED"] = "contact_language_changed";
    Events["WEBHOOK_CALLED"] = "webhook_called";
    Events["AIRTIME_TRANSFERRED"] = "airtime_transferred";
    Events["CALL_STARTED"] = "call_started";
    Events["EMAIL_SENT"] = "email_sent";
    Events["INPUT_LABELS_ADDED"] = "input_labels_added";
    Events["NOTE_CREATED"] = "note_created";
    Events["TICKET_ASSIGNED"] = "ticket_assigned";
    Events["TICKET_NOTE_ADDED"] = "ticket_note_added";
    Events["TICKET_CLOSED"] = "ticket_closed";
    Events["TICKET_OPENED"] = "ticket_opened";
    Events["TICKET_REOPENED"] = "ticket_reopened";
    Events["TICKET_TOPIC_CHANGED"] = "ticket_topic_changed";
    Events["OPTIN_REQUESTED"] = "optin_requested";
    Events["ERROR"] = "error";
    Events["FAILURE"] = "failure";
})(Events || (Events = {}));
const renderInfoList = (singular, plural, items) => {
    if (items.length === 1) {
        return `${singular} **${items[0].name}**`;
    }
    else {
        const list = items.map((item) => `**${item.name}**`);
        if (list.length === 2) {
            return `${plural} ${list.join(' and ')}`;
        }
        else {
            const last = list.pop();
            return `${plural} ${list.join(', ')}, and ${last}`;
        }
    }
};
const toTitleCase = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
const renderChannelEvent = (event) => {
    var _a, _b;
    if (event.event.type === 'mt_miss') {
        return 'Missed outgoing call';
    }
    else if (event.event.type === 'mo_miss') {
        return 'Missed incoming call';
    }
    else if (event.event.type === 'new_conversation') {
        return 'Started conversation';
    }
    else if (event.channel_event_type === 'welcome_message') {
        return 'Welcome Message Sent';
    }
    else if (event.event.type === 'referral') {
        return 'Referred';
    }
    else if (event.event.type === 'follow') {
        return 'Followed';
    }
    else if (event.event.type === 'stop_contact') {
        return 'Stopped';
    }
    else if (event.event.type === 'mt_call') {
        return 'Outgoing Phone Call';
    }
    else if (event.event.type == 'mo_call') {
        return 'Incoming Phone call';
    }
    else if (event.event.type == 'optin') {
        return `Opted in to **${(_a = event.event.optin) === null || _a === void 0 ? void 0 : _a.name}**`;
    }
    else if (event.event.type == 'optout') {
        return `Opted out of **${(_b = event.event.optin) === null || _b === void 0 ? void 0 : _b.name}**`;
    }
};
const renderFlowEvent = (event) => {
    let verb = 'Interrupted';
    if (event.status !== 'I') {
        if (event.type === Events.FLOW_ENTERED) {
            verb = 'Started';
        }
        else {
            verb = 'Completed';
        }
    }
    return `${verb} [**${event.flow.name}**](/flow/editor/${event.flow.uuid}/)`;
};
const renderResultEvent = (event) => {
    if (!event.name.startsWith('_') && event.value) {
        return `Updated flow result **${event.name}** to **${event.value}**`;
    }
};
const renderUpdateEvent = (event) => {
    return event.value
        ? `Updated **${event.field.name}** to **${event.value.text}**`
        : `Cleared **${event.field.name}**`;
};
const renderNameChanged = (event) => {
    return `Updated **Contact Name** to **${event.name}**`;
};
const renderContactURNsChanged = (event) => {
    return `Updated **URNs** to ${oxfordFn(event.urns, (urn) => `**${urn.split(':')[1].split('?')[0]}**`)}`;
};
const renderEmailSent = (event) => {
    return `Email sent to **${oxford(event.to, 'and')}** with subject **${event.subject}**`;
};
const renderLabelsAdded = (event) => {
    return `Applied ${renderInfoList('label', 'labels', event.labels)}`;
};
export const renderTicketAction = (event, action) => {
    if (event.created_by) {
        return `**${getUserDisplay(event.created_by)}** ${action} a **[ticket](/ticket/all/closed/${event.ticket.uuid}/)**`;
    }
    return `A **[ticket](/ticket/all/closed/${event.ticket.uuid}/)** was **${action}**`;
};
export const renderTicketAssigned = (event) => {
    return event.assignee
        ? event.assignee.id === event.created_by.id
            ? `**${getDisplayName(event.created_by)}** took this ticket`
            : `${getDisplayName(event.created_by)} assigned this ticket to **${getDisplayName(event.assignee)}**`
        : `**${getDisplayName(event.created_by)}** unassigned this ticket`;
};
export const renderContactGroupsEvent = (event) => {
    const groupsEvent = event;
    if (groupsEvent.groups_added) {
        return renderInfoList('Added to group', 'Added to groups', groupsEvent.groups_added);
    }
    else if (groupsEvent.groups_removed) {
        return renderInfoList('Removed from group', 'Removed from groups', groupsEvent.groups_removed);
    }
};
export const renderCampaignFiredEvent = (event) => {
    return `Campaign ${event.campaign.name}
      ${event.fired_result === 'S' ? 'skipped' : 'triggered'}
      ${event.campaign_event.offset_display}
      ${event.campaign_event.relative_to.name}`;
};
export const renderTicketOpened = (event) => {
    return `${event.ticket.topic.name} ticket was opened`;
};
export const renderErrorMessage = (event) => {
    return `${event.text} ${event.type === Events.FAILURE
        ? `Run ended prematurely, check the flow design`
        : null}`;
};
export const renderWebhookEvent = (event) => {
    return event.status === 'success'
        ? `Successfully called ${event.url}`
        : `Failed to call ${event.url}`;
};
export const renderAirtimeTransferredEvent = (event) => {
    if (parseFloat(event.actual_amount) === 0) {
        return `Airtime transfer failed`;
    }
    return `Transferred **${event.actual_amount}** ${event.currency} of airtime`;
};
export const renderCallStartedEvent = () => {
    return `Call Started`;
};
export const renderContactLanguageChangedEvent = (event) => {
    return `Language updated to **${event.language}**`;
};
export const renderOptinRequested = (event) => {
    return `Requested opt-in for ${event.optin.name}`;
};
export class ContactChat extends ContactStoreElement {
    static get styles() {
        return css `
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
        background: #f9f9f9;
      }

      temba-contact-history {
        border-bottom: 1px solid #f6f6f6;
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }

      .compose {
        background: #fff;
        display: flex;
        flex-direction: column;
        --textarea-min-height: 8em;
        --textarea-height: 0.5em;
        --widget-box-shadow-focused: none;
        --compose-curvature: 0px;
        overflow: hidden;
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
        border-top-right-radius: 0;
        border-top-left-radius: 0;
        --temba-tabs-options-padding: 0.5em 0.5em 0 0.5em;
        --temba-tabs-border-left: none;
        --temba-tabs-border-right: none;
        --temba-tabs-border-bottom: none;
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
        --color-chat-out: var(--color-message)
        );
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
    constructor() {
        super();
        this.contactsEndpoint = '/api/v2/contacts.json';
        this.currentNote = '';
        this.showDetails = true;
        this.currentTicket = null;
        this.currentContact = null;
        this.agent = '';
        this.blockFetching = false;
        this.showInterrupt = false;
        this.avatar = DEFAULT_AVATAR;
        this.ticket = null;
        this.lastEventTime = null;
        this.newestEventTime = null;
        this.refreshId = null;
        this.polling = false;
    }
    firstUpdated(changed) {
        super.firstUpdated(changed);
    }
    connectedCallback() {
        super.connectedCallback();
        this.chat = this.shadowRoot.querySelector('temba-chat');
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        if (this.refreshId) {
            clearInterval(this.refreshId);
        }
    }
    updated(changedProperties) {
        super.updated(changedProperties);
        // if we don't have an endpoint infer one
        if (changedProperties.has('data') ||
            changedProperties.has('currentContact')) {
            // unschedule any previous refreshes
            if (this.refreshId) {
                clearTimeout(this.refreshId);
                this.refreshId = null;
            }
            this.currentContact = this.data;
        }
        if (changedProperties.has('currentContact')) {
            this.chat = this.shadowRoot.querySelector('temba-chat');
            this.reset();
            this.fetchPreviousMessages();
        }
    }
    reset() {
        if (this.chat) {
            this.chat.reset();
        }
        this.blockFetching = false;
        this.ticket = null;
        this.lastEventTime = null;
        this.newestEventTime = null;
        this.refreshId = null;
        this.polling = false;
        this.errorMessage = null;
        const compose = this.shadowRoot.querySelector('temba-compose');
        if (compose) {
            compose.reset();
        }
    }
    handleInterrupt() {
        this.fireCustomEvent(CustomEventType.Interrupt, {
            contact: this.currentContact
        });
    }
    handleRetry() {
        const compose = this.shadowRoot.querySelector('temba-compose');
        compose.triggerSend();
    }
    handleSend(evt) {
        this.errorMessage = null;
        const composeEle = evt.currentTarget;
        const compose = evt.detail.langValues['und'];
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
        postJSON(`/api/v2/messages.json`, payload)
            .then((response) => {
            if (response.status < 400) {
                this.checkForNewMessages();
                composeEle.reset();
                this.fireCustomEvent(CustomEventType.MessageSent, { msg: payload });
            }
            else {
                this.errorMessage = genericError;
            }
        })
            .catch(() => {
            this.errorMessage = genericError;
        });
    }
    getEndpoint() {
        if (this.contact) {
            return `/contact/history/${this.contact}/?_format=json`;
        }
        return null;
    }
    scheduleRefresh() {
        // knock five seconds off the newest event time so we are
        // a little more aggressive about refreshing short term
        let window = new Date().getTime() - this.newestEventTime / 1000 - 5000;
        if (this.refreshId) {
            clearTimeout(this.refreshId);
            this.refreshId = null;
        }
        // wait no longer than 15 seconds
        window = Math.min(window, 15000);
        // wait at least 2 seconds
        window = Math.max(window, 2000);
        this.refreshId = setTimeout(() => {
            this.checkForNewMessages();
        }, window);
    }
    getEventMessage(event) {
        let message = null;
        switch (event.type) {
            case Events.ERROR:
            case Events.FAILURE:
                message = {
                    type: MessageType.Inline,
                    text: `Error during flow: ${toTitleCase(event.text)}`
                };
                break;
            case Events.TICKET_OPENED:
                message = {
                    type: MessageType.Inline,
                    text: renderTicketAction(event, 'opened')
                };
                break;
            case Events.TICKET_ASSIGNED:
                message = {
                    type: MessageType.Inline,
                    text: renderTicketAssigned(event)
                };
                break;
            case Events.TICKET_REOPENED:
                message = {
                    type: MessageType.Inline,
                    text: renderTicketAction(event, 'reopened')
                };
                break;
            case Events.TICKET_CLOSED:
                message = {
                    type: MessageType.Inline,
                    text: renderTicketAction(event, 'closed')
                };
                break;
            case Events.TICKET_TOPIC_CHANGED:
                message = {
                    type: MessageType.Inline,
                    text: `Topic changed to **${event.topic.name}**`
                };
                break;
            case Events.FLOW_ENTERED:
            case Events.FLOW_EXITED:
                message = {
                    type: MessageType.Inline,
                    text: renderFlowEvent(event)
                };
                break;
            case Events.RUN_RESULT_CHANGED:
                message = {
                    type: MessageType.Inline,
                    text: renderResultEvent(event)
                };
                break;
            case Events.CONTACT_FIELD_CHANGED:
                message = {
                    type: MessageType.Inline,
                    text: renderUpdateEvent(event)
                };
                break;
            case Events.CONTACT_NAME_CHANGED:
                message = {
                    type: MessageType.Inline,
                    text: renderNameChanged(event)
                };
                break;
            case Events.CONTACT_URNS_CHANGED:
                message = {
                    type: MessageType.Inline,
                    text: renderContactURNsChanged(event)
                };
                break;
            case Events.EMAIL_SENT:
                message = {
                    type: MessageType.Inline,
                    text: renderEmailSent(event)
                };
                break;
            case Events.INPUT_LABELS_ADDED:
                message = {
                    type: MessageType.Inline,
                    text: renderLabelsAdded(event)
                };
                break;
            case Events.CONTACT_GROUPS_CHANGED:
                message = {
                    type: MessageType.Inline,
                    text: renderContactGroupsEvent(event)
                };
                break;
            case Events.WEBHOOK_CALLED:
                message = {
                    type: MessageType.Inline,
                    text: renderWebhookEvent(event)
                };
                break;
            case Events.AIRTIME_TRANSFERRED:
                message = {
                    type: MessageType.Inline,
                    text: renderAirtimeTransferredEvent(event)
                };
                break;
            case Events.CALL_STARTED:
                message = {
                    type: MessageType.Inline,
                    text: renderCallStartedEvent()
                };
                break;
            case Events.CAMPAIGN_FIRED:
                message = {
                    type: MessageType.Inline,
                    text: renderCampaignFiredEvent(event)
                };
                break;
            case Events.CHANNEL_EVENT:
                message = {
                    type: MessageType.Inline,
                    text: renderChannelEvent(event)
                };
                break;
            case Events.CONTACT_LANGUAGE_CHANGED:
                message = {
                    type: MessageType.Inline,
                    text: renderContactLanguageChangedEvent(event)
                };
                break;
            case Events.OPTIN_REQUESTED:
                message = {
                    type: MessageType.Inline,
                    text: renderOptinRequested(event)
                };
                break;
        }
        if (message && event.created_on) {
            message.date = new Date(event.created_on);
        }
        else {
            console.error('Unknown event type', event);
        }
        return message;
    }
    getUserForEvent(event) {
        let user = null;
        if (event.type === 'msg_received') {
            user = {
                name: this.currentContact.name
            };
        }
        else if (event.created_by) {
            user = {
                email: event.created_by.email,
                name: `${event.created_by.first_name} ${event.created_by.last_name}`.trim(),
                avatar: event.created_by.avatar
            };
        }
        return user;
    }
    createMessages(page) {
        if (page.events) {
            let messages = [];
            page.events.forEach((event) => {
                const ts = new Date(event.created_on).getTime() * 1000;
                if (ts > this.newestEventTime) {
                    this.newestEventTime = ts;
                }
                if (event.type === 'ticket_note_added') {
                    const ticketEvent = event;
                    messages.push({
                        type: MessageType.Note,
                        id: event.created_on + event.type,
                        user: this.getUserForEvent(ticketEvent),
                        date: new Date(ticketEvent.created_on),
                        text: ticketEvent.note
                    });
                }
                else if (event.type === 'ticket_opened') {
                    // ticket open events can have a note attached
                    const ticketEvent = event;
                    messages.push({
                        type: MessageType.Note,
                        id: event.created_on + event.type + '_note',
                        user: this.getUserForEvent(ticketEvent),
                        date: new Date(ticketEvent.created_on),
                        text: ticketEvent.note
                    });
                    // but the opening of the ticket is a normal event
                    messages.push(this.getEventMessage(event));
                }
                else if (event.type === 'msg_created' ||
                    event.type === 'msg_received' ||
                    event.type === 'broadcast_created') {
                    const msgEvent = event;
                    messages.push({
                        type: msgEvent.type === 'msg_received' ? 'msg_in' : 'msg_out',
                        id: msgEvent.msg.id + '',
                        user: this.getUserForEvent(msgEvent),
                        date: new Date(msgEvent.created_on),
                        attachments: msgEvent.msg.attachments,
                        text: msgEvent.msg.text,
                        sendError: msgEvent.status === 'E' || msgEvent.status === 'F',
                        popup: html `<div
              style="display: flex; flex-direction: row; align-items:center; justify-content: space-between;font-size:0.9em;line-height:1em;min-width:10em"
            >
              <div style="justify-content:left;text-align:left">
                <temba-date
                  value=${msgEvent.created_on}
                  display="duration"
                ></temba-date>

                ${msgEvent.optin
                            ? html `<div style="font-size:0.9em;color:#aaa">
                      ${msgEvent.optin.name}
                    </div>`
                            : null}
                ${msgEvent.failed_reason_display
                            ? html `
                      <div
                        style="margin-top:0.2em;margin-right: 0.5em;min-width:10em;max-width:15em;color:var(--color-error);font-size:0.9em"
                      >
                        ${msgEvent.failed_reason_display}
                      </div>
                    `
                            : null}
              </div>
              ${msgEvent.logs_url
                            ? html `<a style="margin-left:0.5em" href="${msgEvent.logs_url}"
                    ><temba-icon name="log"></temba-icon
                  ></a>`
                            : null}
            </div> `
                    });
                }
                else {
                    messages.push(this.getEventMessage(event));
                }
            });
            // remove any messages we don't recognize
            messages = messages.filter((msg) => !!msg);
            return messages;
        }
        return [];
    }
    checkForNewMessages() {
        var _a;
        // we are already working on it
        if (this.polling) {
            return;
        }
        const chat = this.chat;
        const contactChat = this;
        if (this.currentContact && this.newestEventTime) {
            this.polling = true;
            const endpoint = this.getEndpoint();
            if (!endpoint) {
                return;
            }
            const fetchContact = this.currentContact.uuid;
            fetchContactHistory(false, endpoint, (_a = this.currentTicket) === null || _a === void 0 ? void 0 : _a.uuid, null, this.newestEventTime).then((page) => {
                if (fetchContact === this.currentContact.uuid) {
                    this.lastEventTime = page.next_before;
                    const messages = this.createMessages(page);
                    if (messages.length === 0) {
                        contactChat.blockFetching = true;
                    }
                    messages.reverse();
                    chat.addMessages(messages, null, true);
                }
                this.polling = false;
                this.scheduleRefresh();
            });
        }
    }
    fetchPreviousMessages() {
        var _a;
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
            fetchContactHistory(false, endpoint, (_a = this.currentTicket) === null || _a === void 0 ? void 0 : _a.uuid, this.lastEventTime).then((page) => {
                this.lastEventTime = page.next_before;
                const messages = this.createMessages(page);
                messages.reverse();
                if (messages.length === 0) {
                    contactChat.blockFetching = true;
                }
                chat.addMessages(messages);
                this.scheduleRefresh();
            });
        }
    }
    fetchComplete() {
        if (this.chat) {
            this.chat.fetching = false;
        }
    }
    getTembaCompose() {
        if (this.currentTicket) {
            if (this.currentContact && this.currentContact.status !== 'active') {
                //no chatbox for archived, blocked, or stopped contacts
                return null;
            }
            else {
                if (!this.currentTicket.closed_on) {
                    //chatbox for active contacts with an open ticket
                    return this.getCompose();
                }
                else {
                    return null;
                }
            }
        }
        if (this.currentContact && this.currentContact.status !== 'active') {
            //no chatbox for archived, blocked, or stopped contacts
            return null;
        }
        else {
            //chatbox for active contacts
            return this.getCompose();
        }
    }
    getCompose() {
        return html `<div class="border"></div>
      <div class="compose">
        <temba-compose
          attachments
          counter
          autogrow
          shortcuts
          ?embeddedTabs=${!this.currentTicket}
          @temba-submitted=${this.handleSend.bind(this)}
        >
        </temba-compose>
        ${this.errorMessage
            ? html ` <div class="error-gutter">
              <div class="error-message">${this.errorMessage}</div>
              <temba-button
                name="Retry"
                @click=${this.handleRetry}
              ></temba-button>
            </div>`
            : null}
      </div>`;
    }
    handleAssignmentChanged(evt) {
        const users = evt.currentTarget;
        const assignee = users.values[0];
        this.assignTicket(assignee ? assignee.email : null);
        users.blur();
    }
    handleTopicChanged(evt) {
        const select = evt.target;
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
                .catch((response) => {
                console.error(response);
            });
        }
    }
    assignTicket(email) {
        // if its already assigned to use, it's a noop
        if ((this.currentTicket.assignee &&
            this.currentTicket.assignee.email === email) ||
            (this.currentTicket.assignee === null && email === null)) {
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
            .catch((response) => {
            console.error(response);
        });
        return true;
    }
    refreshTicket() {
        if (this.currentTicket) {
            fetchResults(`/api/v2/tickets.json?uuid=${this.currentTicket.uuid}`).then((values) => {
                this.store.resolveUsers(values, ['assignee']).then(() => {
                    if (values.length > 0) {
                        this.fireCustomEvent(CustomEventType.TicketUpdated, {
                            ticket: values[0],
                            previous: this.currentTicket
                        });
                        this.currentTicket = values[0];
                    }
                });
            });
        }
    }
    handleReopen() {
        const uuid = this.currentTicket.uuid;
        postJSON(`/api/v2/ticket_actions.json`, {
            tickets: [uuid],
            action: 'reopen'
        })
            .then(() => {
            this.refreshTicket();
        })
            .catch((response) => {
            console.error(response);
        });
    }
    handleClose() {
        const uuid = this.currentTicket.uuid;
        postJSON(`/api/v2/ticket_actions.json`, {
            tickets: [uuid],
            action: 'close'
        })
            .then(() => {
            this.refreshTicket();
        })
            .catch((response) => {
            console.error(response);
        });
    }
    render() {
        const inFlow = this.currentContact && this.currentContact.flow;
        const inTicket = this.currentTicket;
        const ticketClosed = this.currentTicket && this.currentTicket.closed_on;
        return html `<div class="chat-wrapper">
      ${this.currentContact
            ? html `<temba-chat
              @temba-scroll-threshold=${this.fetchPreviousMessages}
              @temba-fetch-complete=${this.fetchComplete}
              avatar=${this.avatar}
              agent
            >
              ${inFlow
                ? html `
                    <div slot="footer" style="text-align:center;">
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
                    ? html `<temba-button
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
            ${inTicket
                ? html `<div class="in-ticket-wrapper">
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
                      ?disabled=${ticketClosed}
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
                    ? html `
                          <temba-button
                            name="Reopen"
                            @click=${this.handleReopen}
                          ></temba-button>
                        `
                    : html `
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
__decorate([
    property({ type: String, attribute: 'ticket' })
], ContactChat.prototype, "ticketUUID", void 0);
__decorate([
    property({ type: String })
], ContactChat.prototype, "contactsEndpoint", void 0);
__decorate([
    property({ type: String })
], ContactChat.prototype, "currentNote", void 0);
__decorate([
    property({ type: Boolean })
], ContactChat.prototype, "showDetails", void 0);
__decorate([
    property({ type: Object })
], ContactChat.prototype, "currentTicket", void 0);
__decorate([
    property({ type: Object })
], ContactChat.prototype, "currentContact", void 0);
__decorate([
    property({ type: String })
], ContactChat.prototype, "agent", void 0);
__decorate([
    property({ type: Boolean })
], ContactChat.prototype, "blockFetching", void 0);
__decorate([
    property({ type: Boolean })
], ContactChat.prototype, "showInterrupt", void 0);
__decorate([
    property({ type: String })
], ContactChat.prototype, "avatar", void 0);
__decorate([
    property({ type: String })
], ContactChat.prototype, "errorMessage", void 0);
export const closeTicket = (uuid) => {
    const formData = new FormData();
    formData.append('status', 'C');
    return postUrl(`/ticket/update/${uuid}/?_format=json`, formData);
};
export const fetchContact = (endpoint) => {
    return new Promise((resolve, reject) => {
        fetchResults(endpoint).then((contacts) => {
            if (contacts && contacts.length === 1) {
                resolve(contacts[0]);
            }
            else {
                reject('No contact found');
            }
        });
    });
};
export const fetchContactHistory = (reset, endpoint, ticket, before = undefined, after = undefined) => {
    if (reset) {
        pendingRequests.forEach((controller) => {
            controller.abort();
        });
        pendingRequests = [];
    }
    return new Promise((resolve) => {
        const controller = new AbortController();
        pendingRequests.push(controller);
        let url = endpoint;
        if (before) {
            url += `&before=${before}`;
        }
        if (after) {
            url += `&after=${after}`;
        }
        if (ticket) {
            url += `&ticket=${ticket}`;
        }
        const store = document.querySelector('temba-store');
        getUrl(url, controller)
            .then((response) => {
            // on success, remove our abort controller
            pendingRequests = pendingRequests.filter((controller) => {
                return response.controller === controller;
            });
            const page = response.json;
            store.resolveUsers(page.events, ['created_by']).then(() => {
                resolve(page);
            });
        })
            .catch(() => {
            // canceled
        });
    });
};
export const getDisplayName = (user) => {
    if (!user) {
        return 'Somebody';
    }
    if (user.name) {
        return user.name;
    }
    if (user.first_name && user.last_name) {
        return `${user.first_name} ${user.last_name}`;
    }
    if (user.first_name) {
        return user.first_name;
    }
    return user.email;
};
export let pendingRequests = [];
//# sourceMappingURL=ContactChat.js.map