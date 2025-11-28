import { TemplateResult, html, PropertyValueMap, css } from 'lit';
import { property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { RapidElement } from '../RapidElement';
import { CustomEventType } from '../interfaces';
import { DEFAULT_AVATAR } from '../webchat/assets';

const BATCH_TIME_WINDOW = 60 * 60 * 1000;
const SCROLL_FETCH_BUFFER = 200; // pixels from top
const MIN_FETCH_TIME = 250;

const getUnsendableReasonMessage = (reason: string): string => {
  switch (reason) {
    case 'no_route':
      return 'No channel available to send message';
    case 'contact_blocked':
      return 'Contact has been blocked';
    case 'contact_stopped':
      return 'Contact has been stopped';
    case 'contact_archived':
      return 'Contact is archived';
    case 'org_suspended':
      return 'Workspace is suspended';
    case 'looping':
      return 'Message loop detected';
    default:
      return 'Unable to send message';
  }
};

const getStatusReasonMessage = (reason: string): string => {
  switch (reason) {
    case 'error_limit':
      return 'Error limit reached';
    case 'too_old':
      return 'Message is too old to send';
    case 'channel_removed':
      return 'Channel was removed';
    default:
      return 'Message failed to send';
  }
};

const getMessageLogURL = (event: MsgEvent, showDays: number): string | null => {
  if (showDays > 0 && event.msg.channel) {
    const cutoff = new Date(Date.now() - showDays * 24 * 60 * 60 * 1000);
    if (event.created_on >= cutoff) {
      return `/channels/channel/logs/${event.msg.channel}/msg/${event.uuid}/`;
    }
  }
  return null;
};

export enum MessageType {
  Inline = 'inline',
  Error = 'error',
  Collapse = 'collapse',
  Note = 'note'
}

export interface ObjectReference {
  uuid: string;
  name: string;
}

interface User extends ObjectReference {
  avatar?: string;
  email: string;
}

export interface Msg {
  text: string;
  channel: ObjectReference;
  quick_replies: string[];
  urn: string;
  direction: string;
  type: string;
  attachments: string[];
  unsendable_reason?:
    | 'no_route'
    | 'contact_blocked'
    | 'contact_stopped'
    | 'contact_archived'
    | 'org_suspended'
    | 'looping';
}

export interface ContactEvent {
  uuid: string;
  type: string;
  created_on: Date;
  _user?: User;
  _rendered?: { html: TemplateResult; type: MessageType };
}

export interface MsgEvent extends ContactEvent {
  msg: Msg;
  optin?: ObjectReference;
  _status?: {
    created_on: string;
    status: 'wired' | 'sent' | 'delivered' | 'read' | 'errored' | 'failed';
    reason: 'error_limit' | 'too_old' | 'channel_removed';
  };
  _deleted?: {
    created_on: string;
    by_contact: boolean;
    user: { name: string; uuid: string };
  };
}

const TIME_FORMAT = { hour: 'numeric', minute: '2-digit' } as any;
const VERBOSE_FORMAT = {
  weekday: undefined,
  year: undefined,
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
} as any;

export class Chat extends RapidElement {
  static get styles() {
    return css`
      :host {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        position: relative;
        z-index: 1;
      }

      slot[name='header'] {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        display: block;
      }

      slot[name='footer'] {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        display: block;
      }

      .block {
        margin-bottom: 1em;
        display: flex;
        flex-direction: row;
      }

      .block.outgoing {
        flex-direction: row-reverse;
      }

      .block.collapse {
        margin: 0;
        align-items: center;
        display: flex;
        flex-direction: column;
        margin-bottom: 0.5em;
      }

      .block.collapse .messsage {
        transform: scaleY(0);
        margin: 0;
        padding: 0;
        line-height: 0;
      }

      .time {
        text-align: center;
        font-size: 0.8em;
        color: #999;
        margin-bottom: 2em;
        margin-top: 1em;
        border-top: 1px solid #e9e9e9;
        padding: 1em;
        margin-left: 10%;
        margin-right: 10%;
      }

      .time.first {
        border-top: none;
        margin-top: 0;
        border-bottom: 1px solid #e9e9e9;
        margin-bottom: 2em;
      }

      .first .time {
        margin-top: 0;
        border-top: none;
        padding-top: 0;
      }

      .row {
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        margin-bottom: 0.25em;
      }

      .input-panel {
        padding: 1em;
        background: #fff;
      }

      temba-user {
        margin-right: 0.6em;
        margin-left: 0.6em;
        width: 2em;
        align-self: flex-end;
      }

      .toggle {
        flex-shrink: 0;
        width: 4em;
        height: 4em;
        overflow: hidden;
        border-radius: 100%;
        box-shadow: rgba(0, 0, 0, 0.1) 0px 0px 1em 0.7em,
          rgba(0, 0, 0, 0.2) 0px 1px 2px 0px,
          inset 0 0 0 0.25em rgba(0, 0, 0, 0.1);
        cursor: pointer;
        transition: box-shadow var(--toggle-speed, 200ms) ease-out;
        position: absolute;
        bottom: 1em;
        right: 1em;
      }

      .toggle:hover {
        box-shadow: rgba(0, 0, 0, 0.1) 0px 0px 1em 0.7em,
          rgba(0, 0, 0, 0.4) 0px 1px 2px 0px,
          inset 0 0 0 0.25em rgba(0, 0, 0, 0.2);
      }

      .incoming .row {
        flex-direction: row-reverse;
        margin-left: 1em;
      }

      .bubble {
        padding: 0.75em;
        padding-bottom: 0.25em;
        background: var(--color-chat-in, #f1f1f1);
        border-radius: var(--curvature);
        border: var(--chat-border-in, none);
      }

      .bubble .name {
        font-size: 0.95em;
        font-weight: 400;
        color: rgba(0, 0, 0, 0.4);
        margin-bottom: 0.25em;
      }

      .outgoing .latest .bubble {
        border-bottom-left-radius: 0;
      }

      .incoming .bubble-wrap {
        align-items: flex-end;
      }

      .incoming .bubble {
        background: var(--color-chat-out, #3c92dd);
        border: var(--chat-border-out, none);
        color: white;
      }

      .incoming .latest .bubble {
        border-bottom-right-radius: 0;
      }

      .incoming .bubble .name {
        color: rgba(255, 255, 255, 0.7);
      }

      .note .bubble {
        background: #fffac3;
        color: rgba(0, 0, 0, 0.7);
      }

      .note .bubble .name {
        color: rgba(0, 0, 0, 0.5);
      }

      .failed .bubble,
      .error .bubble {
        border: 1px solid var(--color-error);
        background: #ffe6e6;
        color: #ad4747ff;
      }

      .error .bubble .name,
      .failed .bubble .name {
        color: #ad47479a;
      }

      .message {
        margin-bottom: 0.5em;
        line-height: 1.2em;
        word-break: break-word;
      }

      .chat {
        width: 28rem;
        border-radius: var(--curvature);
        overflow: hidden;
        box-shadow: rgba(0, 0, 0, 0.1) 0px 3px 7px 0px,
          rgba(0, 0, 0, 0.2) 0px 1px 2px 0px, rgba(0, 0, 0, 0.1) 5em 5em 5em 5em;
        position: absolute;
        bottom: 3em;
        right: 1em;
        transition: all var(--toggle-speed, 200ms) ease-out;
        transform: scale(0.9);
        pointer-events: none;
        opacity: 0;
      }

      .chat.open {
        bottom: 6em;
        opacity: 1;
        transform: scale(1);
        pointer-events: initial;
      }

      .messages {
        position: relative;
        flex-grow: 1;
        overflow: hidden;
      }

      .scroll {
        position: absolute;
        top: 0;
        bottom: 0;
        right: 0;
        left: 0;
        overflow-y: auto;
        overflow-x: hidden;
        -webkit-overflow-scrolling: touch;
        overflow-scrolling: touch;
        padding: 1em 1em 1em 1em;
        padding-bottom: 2.5em;
        display: flex;
        flex-direction: column-reverse;
      }

      .messages:before {
        content: '';
        background: radial-gradient(
            farthest-side at 50% 0,
            rgba(0, 0, 0, 0.2),
            rgba(0, 0, 0, 0)
          )
          center top;
        height: 10px;
        display: block;
        position: absolute;
        width: 100%;
        transition: opacity var(--toggle-speed, 200ms) ease-out;
        z-index: 1;
      }

      .messages:after {
        content: '';
        background: radial-gradient(
            farthest-side at 50% 100%,
            rgba(0, 0, 0, 0.2),
            rgba(0, 0, 0, 0)
          )
          center bottom;
        height: 10px;
        display: block;
        position: absolute;
        bottom: 0;
        margin-top: -10px;
        width: 100%;
        margin-right: 5em;
        transition: opacity var(--toggle-speed, 200ms) ease-out;
        z-index: 1;
      }

      .bubble-wrap {
        position: relative;
        max-width: 70%;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        margin-top: -1em;
        padding-top: 1em;
      }

      .scroll-at-top.messages:before {
        opacity: 0;
      }

      .scroll-at-bottom.messages:after {
        opacity: 0;
      }

      .input {
        border: none;
        flex-grow: 1;
        color: #333;
        font-size: 1em;
      }

      .input:focus {
        outline: none;
      }

      input::placeholder {
        opacity: 0.3;
      }

      .input.inactive {
        // pointer-events: none;
        // opacity: 0.3;
      }

      .active {
      }

      .send-icon {
        color: #eee;
        pointer-events: none;
        transform: rotate(-45deg);
        transition: transform 0.2s ease-out;
      }

      .pending .send-icon {
        color: var(--color-primary-dark);
        pointer-events: initial;
        transform: rotate(0deg);
      }

      .notice {
        padding: 1em;
        background: #f8f8f8;
        color: #666;
        text-align: center;
        cursor: pointer;
      }

      .connecting .notice {
        display: flex;
        justify-content: center;
      }

      .connecting .notice temba-icon {
        margin-left: 0.5em;
      }

      .reconnect {
        color: var(--color-primary-dark);
        text-decoration: underline;
        font-size: 0.9em;
      }

      .input:disabled {
        background: transparent !important;
      }

      temba-loading {
        justify-content: center;
        margin: 0.5em auto;
        margin-bottom: 2em;
      }

      temba-loading.hidden {
        display: none;
      }

      .inline {
      }

      .event {
        flex-grow: 1;
        align-self: center;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .event p {
        margin: 0;
        padding: 0;
      }

      .collapse {
      }

      a {
        color: var(--color-primary-dark);
      }

      .attachments {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        align-self: flex-start;
      }

      .incoming .attachments {
        align-self: flex-end;
      }

      temba-thumbnail {
        margin: 0.4em;
        border-radius: var(--curvature);
      }

      .failed temba-thumbnail,
      .error temba-thumbnail {
        --thumb-background: #ffe6e6;
        --thumb-border: var(--color-error);
        border: 1px solid var(--color-error);
        color: #ad4747a8;
      }

      .outgoing .popup {
        justify-content: left;
      }

      .incoming .popup {
        justify-content: right;
      }

      .popup {
        display: flex;
        position: absolute;
        background: #fff;
        margin: 0;
        padding: 0.5em 1em;
        border-radius: var(--curvature);
        box-shadow: rgba(0, 0, 0, 0.05) 0px 3px 7px 0px,
          rgba(0, 0, 0, 0.2) 0px 1px 2px 0px;
        border: 1px solid #f3f3f3;
        opacity: 0;
        transform: scale(0.7);
        transition: opacity 0.2s ease-out, transform 0.2s ease-out;
        z-index: 2;
      }

      .popup .arrow {
        z-index: 1;
        text-shadow: 0px 3px 3px rgba(0, 0, 0, 0.1);
        position: absolute;
        justify-content: center;
        text-align: center;
        font-size: 1.3em;
        transform: translateY(0.7em) scale(1);
        color: #fff;
        bottom: 0;
      }

      .bubble-wrap:hover .popup {
        transform: translateY(-120%);
        opacity: 1;
        transition-delay: 1s;
      }

      .new-message-notification {
        position: absolute;
        bottom: 1em;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: var(--color-primary-dark, #3c92dd);
        color: white;
        padding: 0.75em 1.5em;
        border-radius: var(--curvature);
        box-shadow: rgba(0, 0, 0, 0.2) 0px 3px 7px 0px,
          rgba(0, 0, 0, 0.3) 0px 1px 2px 0px;
        cursor: pointer;
        opacity: 0;
        transition: all 0.3s ease-out;
        z-index: 100;
        font-weight: 500;
        pointer-events: none;
      }

      .new-message-notification.visible {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
        pointer-events: auto;
      }

      .new-message-notification:hover {
        background: var(--color-primary-darker, #2b7ac4);
        box-shadow: rgba(0, 0, 0, 0.3) 0px 4px 10px 0px,
          rgba(0, 0, 0, 0.4) 0px 2px 4px 0px;
      }
    `;
  }

  @property({ type: Array })
  messageGroups: string[][] = [];

  @property({ type: Boolean })
  fetching = false;

  @property({ type: Boolean, attribute: false })
  hideTopScroll = true;

  @property({ type: Boolean, attribute: false })
  hideBottomScroll = true;

  @property({ type: String, attribute: 'avatar' })
  defaultAvatar = DEFAULT_AVATAR;

  @property({ type: Boolean })
  agent = false;

  @property({ type: Boolean, attribute: false })
  endOfHistory = false;

  @property({ type: Object, attribute: false })
  oldestEventDate: Date = null;

  @property({ type: Boolean, attribute: false })
  showNewMessageNotification = false;

  @property({ type: Number })
  showMessageLogsDays = 7;

  @property({ type: Boolean })
  hasFooter = false;

  private msgMap = new Map<string, ContactEvent>();
  private metadataCache = new Map<string, ContactEvent>();

  public firstUpdated(
    changed: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.firstUpdated(changed);
    const scroll = this.shadowRoot.querySelector('.scroll');
    const hasScroll = scroll.scrollHeight > scroll.clientHeight;
    this.hideBottomScroll = true;
    this.hideTopScroll = !hasScroll;
  }

  public addMessages(
    messages: ContactEvent[],
    startTime: Date = null,
    append = false
  ) {
    if (!startTime) {
      startTime = new Date();
    }

    const elapsed = new Date().getTime() - startTime.getTime();
    window.setTimeout(
      () => {
        this.fetching = false;
        // first add messages to the map
        const newMessages = [];
        for (const m of messages) {
          // filter out metadata events - they aren't rendered but cached for later reference
          if (m.type === 'msg_deleted' || m.type === 'msg_status_changed') {
            const msgUuid = (m as any).msg_uuid;
            if (msgUuid) {
              this.metadataCache.set(msgUuid, m);
            }
            continue;
          }

          if (this.addMessage(m)) {
            newMessages.push(m.uuid);
          }
        }

        if (newMessages.length === 0) {
          return;
        }

        const ele = this.shadowRoot.querySelector('.scroll');
        const prevTop = ele.scrollTop;
        const prevScrollHeight = ele.scrollHeight;
        const scrollableHeight = ele.scrollHeight - ele.clientHeight;
        const isScrolledAway =
          scrollableHeight > 0 && Math.abs(ele.scrollTop) > 50;

        const grouped = this.groupMessages(newMessages);
        this.insertGroups(grouped, append);

        // show notification if new messages are appended and user is scrolled away from bottom
        if (append && isScrolledAway && newMessages.length > 0) {
          this.showNewMessageNotification = true;
        }

        window.setTimeout(() => {
          // when appending (new messages at bottom), adjust scroll to maintain visible content
          // with column-reverse, new content at bottom increases scrollHeight
          if (append && isScrolledAway) {
            const heightDiff = ele.scrollHeight - prevScrollHeight;
            ele.scrollTop = prevTop - heightDiff;
          } else {
            ele.scrollTop = prevTop;
          }

          this.fireCustomEvent(CustomEventType.FetchComplete);
        }, 100);
      },
      // if it's the first load don't wait, otherwise wait a minimum amount of time
      this.messageGroups.length === 0
        ? 0
        : Math.max(0, MIN_FETCH_TIME - elapsed)
    );
  }

  private addMessage(msg: ContactEvent): boolean {
    const isNew = !this.messageExists(msg);
    this.msgMap.set(msg.uuid, msg);
    return isNew;
  }

  public messageExists(msg: ContactEvent): boolean {
    return this.msgMap.has(msg.uuid);
  }

  private isSameGroup(msg1: ContactEvent, msg2: ContactEvent): boolean {
    if (msg1 && msg2) {
      const sameGroup =
        msg1.type === msg2.type &&
        msg1._user?.name === msg2._user?.name &&
        Math.abs(msg1.created_on.getTime() - msg2.created_on.getTime()) <
          BATCH_TIME_WINDOW;
      return sameGroup;
    }

    return false;
  }

  private insertGroups(newGroups: string[][], append = false) {
    if (!append) {
      newGroups.reverse();
    }

    for (const newGroup of newGroups) {
      // see if our new group belongs to the most recent group
      const group =
        this.messageGroups[append ? 0 : this.messageGroups.length - 1];

      if (group) {
        const lastMsgId = group[group.length - 1];
        const lastMsg = this.msgMap.get(lastMsgId);
        const newMsg = this.msgMap.get(newGroup[0]);
        // if our message belongs to the previous group, in we go
        if (this.isSameGroup(lastMsg, newMsg)) {
          group.push(...newGroup);
        } else {
          // otherwise, just add our entire group as a new one
          if (append) {
            this.messageGroups.splice(0, 0, newGroup);
          } else {
            this.messageGroups.push(newGroup);
          }
        }
      } else {
        if (append) {
          this.messageGroups.splice(0, 0, newGroup);
        } else {
          this.messageGroups.push(newGroup);
        }
      }
    }

    this.requestUpdate('messageGroups');
  }

  private groupMessages(msgIds: string[]): string[][] {
    // group our messages by origin and user
    const groups = [];
    let lastGroup = [];
    let lastMsg = null;
    for (const msgId of msgIds) {
      const msg = this.msgMap.get(msgId);
      if (!this.isSameGroup(msg, lastMsg)) {
        lastGroup = [];
        groups.push(lastGroup);
      }
      lastGroup.push(msgId);
      lastMsg = msg;
    }
    return groups;
  }

  private handleScroll(event: any) {
    const ele = event.target;
    const scrollableHeight = ele.scrollHeight - ele.clientHeight;

    if (scrollableHeight <= 0) {
      return;
    }

    // with column-reverse, scrollTop behavior depends on the browser
    // check if scrollTop is negative (some browsers) or positive (others)
    const absScrollTop = Math.abs(ele.scrollTop);

    // when scrolling up to older messages, absScrollTop increases
    // trigger when we're close to the maximum scroll (oldest messages)
    const shouldFetch = absScrollTop >= scrollableHeight - SCROLL_FETCH_BUFFER;

    this.hideTopScroll = absScrollTop >= scrollableHeight - 1;
    this.hideBottomScroll = absScrollTop <= 1;

    // hide notification when scrolled to bottom
    if (absScrollTop <= 10) {
      this.showNewMessageNotification = false;
    }

    if (shouldFetch) {
      this.fireCustomEvent(CustomEventType.ScrollThreshold);
    }
  }

  private scrollToBottom() {
    const scroll = this.shadowRoot.querySelector('.scroll');
    if (scroll) {
      scroll.scrollTop = 0;
      this.hideBottomScroll = true;
      this.showNewMessageNotification = false;
    }
  }

  private handleNewMessageClick() {
    this.scrollToBottom();
  }

  private renderMessageGroup(
    msgIds: string[],
    idx: number,
    groups: string[][]
  ): TemplateResult {
    const today = new Date();
    const firstGroup = idx === groups.length - 1;

    let prevMsg: ContactEvent;
    if (idx > 0) {
      const lastGroup = groups[idx - 1];
      if (lastGroup && lastGroup.length > 0) {
        prevMsg = this.msgMap.get(lastGroup[0]);
      }
    }

    const mostRecentId = msgIds[msgIds.length - 1];
    const currentMsg = this.msgMap.get(mostRecentId);

    let timeDisplay = null;
    if (
      prevMsg &&
      !this.isSameGroup(prevMsg, currentMsg) &&
      (Math.abs(
        currentMsg.created_on.getTime() - prevMsg.created_on.getTime()
      ) > BATCH_TIME_WINDOW ||
        idx === groups.length - 1)
    ) {
      if (
        today.getDate() !== prevMsg.created_on.getDate() ||
        prevMsg.created_on.getDate() !== currentMsg.created_on.getDate()
      ) {
        timeDisplay = html`<div class="time ${firstGroup ? 'first' : ''}">
          ${prevMsg.created_on.toLocaleTimeString(undefined, VERBOSE_FORMAT)}
        </div>`;
      } else {
        timeDisplay = html`<div class="time ${firstGroup ? 'first' : ''}">
          ${prevMsg.created_on.toLocaleTimeString(undefined, TIME_FORMAT)}
        </div>`;
      }
    }

    const incoming = this.agent
      ? currentMsg.type !== 'msg_received'
      : currentMsg.type === 'msg_received';

    const name = currentMsg._user?.name;

    const showAvatar =
      ((currentMsg.type === 'msg_received' ||
        currentMsg.type === 'msg_created') &&
        this.agent) ||
      !incoming;

    const isSystem = !currentMsg._user?.uuid;

    return html`
      ${timeDisplay}
      <div class="block  ${incoming ? 'incoming' : 'outgoing'}">
        <div class="group-messages" style="flex-grow:1">
          ${repeat(
            msgIds,
            (msgId) => msgId,
            (msgId, index) => {
              const msg = this.msgMap.get(msgId);
              const msgEvent = msg as MsgEvent;
              const statusClass = (msg as any)._status
                ? (msg as any)._status.status
                : '';
              const hasError =
                msgEvent.msg?.unsendable_reason ||
                (msgEvent._status?.reason &&
                  (statusClass === 'failed' || statusClass === 'errored'));
              const unsendableClass = hasError ? 'error' : '';
              return html`<div
                class="row message ${statusClass} ${unsendableClass}"
              >
                ${this.renderMessage(msg, index == 0 ? name : null)}
              </div>`;
            }
          )}
        </div>
        ${showAvatar
          ? html`<div class="avatar" style="align-self:flex-end">
              <temba-user
                uuid=${currentMsg._user?.uuid}
                name=${name}
                avatar=${currentMsg._user?.avatar}
                ?system=${isSystem}
              >
              </temba-user>
            </div>`
          : null}
      </div>
    `;
  }

  private renderMessage(event: ContactEvent, name = null): TemplateResult {
    if (event._rendered) {
      return html`<div class="event">${event._rendered.html}</div>`;
    }

    const message = event as MsgEvent;
    const unsendableReason = message.msg?.unsendable_reason;
    const statusReason = message._status?.reason;
    const errorMessage = unsendableReason
      ? getUnsendableReasonMessage(unsendableReason)
      : statusReason
      ? getStatusReasonMessage(statusReason)
      : null;

    const logsURL = getMessageLogURL(message, this.showMessageLogsDays);

    return html`
      <div class="bubble-wrap">
        <div class="popup" style="white-space: nowrap;">
          ${errorMessage
            ? html`<div style="color: var(--color-error); margin-right: 1em;">
                ${errorMessage}
              </div>`
            : null}
          <temba-date
            value="${message.created_on.toISOString()}"
            display="relative"
          ></temba-date>
          ${logsURL
            ? html`<a
                style="margin-left: 1em; color: var(--color-primary-dark);"
                href="${logsURL}"
                target="_blank"
                rel="noopener noreferrer"
                ><temba-icon name="log"></temba-icon
              ></a>`
            : null}

          <div class="arrow">▼</div>
        </div>
        ${message.msg.text
          ? html`<div class="bubble">
              ${name ? html`<div class="name">${name}</div>` : null}
              <div class="message message-text">${message.msg.text}</div>
            </div>`
          : null}

        <div class="attachments">
          ${(message.msg.attachments || []).map(
            (attachment) =>
              html`<temba-thumbnail
                attachment="${attachment}"
              ></temba-thumbnail>`
          )}
        </div>
      </div>
    `;
  }

  public reset() {
    this.msgMap.clear();
    this.messageGroups = [];
    this.hideBottomScroll = true;
    this.hideTopScroll = true;
    this.endOfHistory = false;
    this.oldestEventDate = null;
  }

  public setEndOfHistory(oldestDate: Date) {
    this.endOfHistory = true;
    this.oldestEventDate = oldestDate;
  }

  public render(): TemplateResult {
    return html` <div
      class="
        messages 
        ${this.hideBottomScroll ? 'scroll-at-bottom' : ''}
        ${this.hideTopScroll ? 'scroll-at-top' : ''}"
    >
      <div class="scroll" @scroll=${this.handleScroll}>
        ${this.messageGroups
          ? repeat(
              this.messageGroups,
              (msgGroup) => msgGroup.join(','),
              (msgGroup, idx) =>
                html`${this.renderMessageGroup(
                  msgGroup,
                  idx,
                  this.messageGroups
                )}`
            )
          : null}

        <temba-loading
          class="${!this.fetching ? 'hidden' : ''}"
        ></temba-loading>

        ${this.endOfHistory && this.oldestEventDate
          ? html`<div class="time first">
              ${this.oldestEventDate.toLocaleTimeString(
                undefined,
                VERBOSE_FORMAT
              )}
            </div>`
          : null}
      </div>
      ${!this.hasFooter
        ? html`<div
            class="new-message-notification ${this.showNewMessageNotification
              ? 'visible'
              : ''}"
            @click=${this.handleNewMessageClick}
          >
            New Messages
          </div>`
        : null}
      <slot class="header" name="header"></slot>
      <slot class="footer" name="footer"></slot>
    </div>`;
  }
}
