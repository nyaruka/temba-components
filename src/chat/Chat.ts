import { TemplateResult, html, PropertyValueMap, css } from 'lit';
import { property } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { CustomEventType } from '../interfaces';
import { DEFAULT_AVATAR } from '../webchat/assets';
import { renderAvatar } from '../utils';

const BATCH_TIME_WINDOW = 30 * 60 * 1000;
const SCROLL_FETCH_BUFFER = 0.05;
const MIN_FETCH_TIME = 250;

interface User {
  avatar?: string;
  email: string;
  name: string;
}

export interface Message {
  type: string;
  msg_id?: string;
  text?: string;
  chat_id?: string;
  origin?: string;
  time?: string;
  before?: string;
  history?: Message[];
  timeAsDate?: Date;
  user?: User;
}

const TIME_FORMAT = { hour: 'numeric', minute: '2-digit' } as any;
const DAY_FORMAT = {
  weekday: undefined,
  year: 'numeric',
  month: 'short',
  day: 'numeric'
} as any;
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
      }

      .block {
        margin-bottom: 1em;
      }

      .time {
        text-align: center;
        font-size: 0.8em;
        color: #999;
        margin-top: 2em;
        border-top: 1px solid #e9e9e9;
        padding: 1em;
        margin-left: 1em;
        margin-right: 1em;
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
      }

      .input-panel {
        padding: 1em;
        background: #fff;
      }

      .avatar {
        margin-top: 0.6em;
        margin-right: 0.6em;
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
        padding: 1em;
        padding-bottom: 0.5em;
        background: #fafafa;
        border-radius: var(--curvature);
        max-width: 70%;
      }

      .bubble .name {
        font-size: 0.95em;
        font-weight: 400;
        color: #888;
        margin-bottom: 0.25em;
      }

      .outgoing .bubble {
        border-top-left-radius: 0;
      }

      .incoming .bubble {
        background: var(--color-primary-dark);
        color: white;
        border-top-right-radius: 0;
        text-align: right;
      }

      .message {
        margin-bottom: 0.5em;
        line-height: 1.2em;
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
        background: #fff;
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
        overflow: auto;
        -webkit-overflow-scrolling: touch;
        overflow-scrolling: touch;
        padding: 1em 1em 1em 1em;
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

  private msgMap = new Map<string, Message>();

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
    messages: Message[],
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
          if (this.addMessage(m)) {
            newMessages.push(m.msg_id);
          }
        }

        if (newMessages.length === 0) {
          return;
        }

        const ele = this.shadowRoot.querySelector('.scroll');
        const prevTop = ele.scrollTop;

        this.insertGroups(this.groupMessages(newMessages), append);

        window.setTimeout(() => {
          ele.scrollTop = prevTop;

          this.fireCustomEvent(CustomEventType.FetchComplete);
        }, 100);
      },
      // if it's the first load don't wait, otherwise wait a minimum amount of time
      this.messageGroups.length === 0
        ? 0
        : Math.max(0, MIN_FETCH_TIME - elapsed)
    );
  }

  private addMessage(msg: Message): boolean {
    if (msg.time && !msg.timeAsDate) {
      msg.timeAsDate = new Date(msg.time);
    }

    /* 
    if (
      !this.oldestMessageDate ||
      msg.timeAsDate.getTime() < this.oldestMessageDate.getTime()
    ) {
      this.oldestMessageDate = msg.timeAsDate;
    }*/

    const isNew = !this.msgMap.has(msg.msg_id);
    this.msgMap.set(msg.msg_id, msg);
    return isNew;
  }

  private isSameGroup(msg1: Message, msg2: Message): boolean {
    if (msg1 && msg2) {
      return (
        msg1.type === msg2.type &&
        msg1.origin === msg2.origin &&
        msg1.user?.name === msg2.user?.name &&
        Math.abs(msg1.timeAsDate.getTime() - msg2.timeAsDate.getTime()) <
          BATCH_TIME_WINDOW
      );
    }
    return false;
  }

  private insertGroups(newGroups: string[][], append = false) {
    newGroups.reverse();
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
    const top = ele.scrollHeight - ele.clientHeight;
    const scroll = Math.round(top + ele.scrollTop);
    const scrollPct = scroll / top;

    this.hideTopScroll = scrollPct <= 0.01;
    this.hideBottomScroll = scrollPct >= 0.99;

    if (scrollPct < SCROLL_FETCH_BUFFER) {
      this.fireCustomEvent(CustomEventType.ScrollThreshold);
    }
  }

  private scrollToBottom() {
    const scroll = this.shadowRoot.querySelector('.scroll');
    if (scroll) {
      scroll.scrollTop = scroll.scrollHeight;
      this.hideBottomScroll = true;
    }
  }

  private renderMessageGroup(
    msgIds: string[],
    idx: number,
    groups: string[][]
  ): TemplateResult {
    const today = new Date();
    let prevMsg;
    if (idx > 0) {
      const lastGroup = groups[idx - 1];
      if (lastGroup && lastGroup.length > 0) {
        prevMsg = this.msgMap.get(lastGroup[0]);
      }
    }

    const currentMsg = this.msgMap.get(msgIds[msgIds.length - 1]);
    let timeDisplay = null;
    if (
      prevMsg &&
      !this.isSameGroup(prevMsg, currentMsg) &&
      prevMsg.timeAsDate.getTime() - currentMsg.timeAsDate.getTime() >
        BATCH_TIME_WINDOW
    ) {
      const showDay =
        !prevMsg ||
        prevMsg.timeAsDate.getDate() !== currentMsg.timeAsDate.getDate();
      if (showDay) {
        timeDisplay = html`<div class="time">
          ${prevMsg.timeAsDate.toLocaleDateString(undefined, DAY_FORMAT)}
        </div>`;
      } else {
        if (prevMsg.timeAsDate.getDate() !== today.getDate()) {
          timeDisplay = html`<div class="time">
            ${prevMsg.timeAsDate.toLocaleTimeString(undefined, VERBOSE_FORMAT)}
          </div>`;
        } else {
          timeDisplay = html`<div class="time">
            ${prevMsg.timeAsDate.toLocaleTimeString(undefined, TIME_FORMAT)}
          </div>`;
        }
      }
    }

    const blockTime = new Date(this.msgMap.get(msgIds[msgIds.length - 1]).time);
    const message = this.msgMap.get(msgIds[0]);
    const incoming = message.type === 'msg_in';
    const name = message.user?.name;
    let avatar = message.user?.avatar;

    if (!message.user) {
      avatar = DEFAULT_AVATAR;
    }

    return html` <div
      class="block  ${incoming ? 'incoming' : 'outgoing'} ${idx === 0
        ? 'first'
        : ''}"
      title="${blockTime.toLocaleTimeString(undefined, VERBOSE_FORMAT)}"
    >
      <div class="row">
        ${!incoming
          ? html` <div class="avatar">
              ${renderAvatar({
                name: name,
                user: {
                  avatar: avatar
                }
              })}
            </div>`
          : null}

        <div class="bubble">
          ${!incoming ? html`<div class="name">${name}</div>` : null}
          ${msgIds.map(
            (msgId) =>
              html`<div class="message">${this.msgMap.get(msgId).text}</div>
                <!--div style="font-size:10px">
                  ${this.msgMap
                  .get(msgId)
                  .timeAsDate.toLocaleDateString(undefined, VERBOSE_FORMAT)}
                </div-->`
          )}
        </div>
      </div>
      ${timeDisplay}
    </div>`;
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
          ? this.messageGroups.map(
              (msgGroup, idx, groups) =>
                html`${this.renderMessageGroup(msgGroup, idx, groups)}`
            )
          : null}

        <temba-loading
          class="${!this.fetching ? 'hidden' : ''}"
        ></temba-loading>
      </div>
    </div>`;
  }
}
