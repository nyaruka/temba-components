import { TemplateResult, html, PropertyValueMap, css } from 'lit';
import { property } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { CustomEventType } from '../interfaces';
import { DEFAULT_AVATAR } from '../webchat/assets';
import { hashCode } from '../utils';
import { renderMarkdown } from '../markdown';

const BATCH_TIME_WINDOW = 60 * 60 * 1000;
const SCROLL_FETCH_BUFFER = 0.05;
const MIN_FETCH_TIME = 250;

export enum MessageType {
  Inline = 'inline',
  Error = 'error',
  Collapse = 'collapse',
  Note = 'note',
  MsgIn = 'msg_in',
  MsgOut = 'msg_out'
}

interface User {
  avatar?: string;
  email: string;
  name: string;
}

export interface ChatEvent {
  id?: string;
  type: MessageType;
  text: string;
  date: Date;
  user?: User;
  popup?: TemplateResult;
}

export interface Message extends ChatEvent {
  sendError?: boolean;
  attachments?: string[];
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
        margin-top: 2em;
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
        overflow-y: auto;
        overflow-x: hidden;
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

      .error .bubble {
        border: 1px solid var(--color-error);
        background: white;
        color: #333;
      }

      .error .bubble .name {
        color: #999;
      }

      .error temba-thumbnail {
        --thumb-background: var(--color-error);
        --thumb-icon: white;
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

  private msgMap = new Map<string, ChatEvent>();

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
    messages: ChatEvent[],
    startTime: Date = null,
    append = false
  ) {
    // make sure our messages have ids
    messages.forEach((m) => {
      if (!m.id) {
        m.id = hashCode(m.text) + '_' + m.date.toISOString();
      }
    });

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
            newMessages.push(m.id);
          }
        }

        if (newMessages.length === 0) {
          return;
        }

        const ele = this.shadowRoot.querySelector('.scroll');
        const prevTop = ele.scrollTop;

        const grouped = this.groupMessages(newMessages);
        this.insertGroups(grouped, append);

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

  private addMessage(msg: ChatEvent): boolean {
    const isNew = !this.messageExists(msg);
    this.msgMap.set(msg.id, msg);
    return isNew;
  }

  public messageExists(msg: ChatEvent): boolean {
    return this.msgMap.has(msg.id);
  }

  private isSameGroup(msg1: ChatEvent, msg2: ChatEvent): boolean {
    if (msg1 && msg2) {
      return (
        msg1.type === msg2.type &&
        msg1.user?.name === msg2.user?.name &&
        Math.abs(msg1.date.getTime() - msg2.date.getTime()) < BATCH_TIME_WINDOW
      );
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
    const firstGroup = idx === groups.length - 1;

    let prevMsg: ChatEvent;
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
      (Math.abs(currentMsg.date.getTime() - prevMsg.date.getTime()) >
        BATCH_TIME_WINDOW ||
        idx === groups.length - 1)
    ) {
      if (
        today.getDate() !== prevMsg.date.getDate() ||
        prevMsg.date.getDate() !== currentMsg.date.getDate()
      ) {
        timeDisplay = html`<div class="time ${firstGroup ? 'first' : ''}">
          ${prevMsg.date.toLocaleTimeString(undefined, VERBOSE_FORMAT)}
        </div>`;
      } else {
        timeDisplay = html`<div class="time ${firstGroup ? 'first' : ''}">
          ${prevMsg.date.toLocaleTimeString(undefined, TIME_FORMAT)}
        </div>`;
      }
    }

    const incoming = this.agent
      ? currentMsg.type !== 'msg_in'
      : currentMsg.type === 'msg_in';

    const name = currentMsg.user?.name;
    const email = currentMsg.user?.email;

    const showAvatar =
      ((currentMsg.type === 'note' ||
        currentMsg.type === 'msg_in' ||
        currentMsg.type === 'msg_out') &&
        this.agent) ||
      !incoming;

    return html`
      ${!firstGroup ? timeDisplay : null}
      <div
        class="block  ${incoming ? 'incoming' : 'outgoing'} ${currentMsg.type}"
      >
        <div class="group-messages" style="flex-grow:1">
          ${msgIds.map((msgId, index) => {
            const msg = this.msgMap.get(msgId);
            return html`<div class="row message">
              ${this.renderMessage(msg, index == 0 ? name : null)}
            </div>`;
          })}
        </div>
        ${showAvatar
          ? html`<div class="avatar" style="align-self:flex-end">
              ${email
                ? html`<temba-user email=${email}></temba-user>`
                : name
                ? html`<temba-user fullname=${name}></temba-user>`
                : html`<temba-user system></temba-user>`}
            </div>`
          : null}
      </div>
      ${firstGroup ? timeDisplay : null}
    `;
  }

  private renderMessage(event: ChatEvent, name = null): TemplateResult {
    if (
      event.type === MessageType.Error ||
      event.type === MessageType.Collapse ||
      event.type === MessageType.Inline
    ) {
      return html`<div class="event">${renderMarkdown(event.text)}</div>`;
    }

    const message = event as Message;
    return html`
        <div class="bubble-wrap ${message.sendError ? 'error' : ''}">
        ${
          message.popup
            ? html`<div class="popup">
                ${message.popup}
                <div class="arrow">▼</div>
              </div>`
            : null
        }
          
          ${
            message.text
              ? html`
                  <div class="bubble">
                    ${name ? html`<div class="name">${name}</div>` : null}
                    <div class="message">${message.text}</div>

                    <!--div>${message.date.toLocaleDateString(
                      undefined,
                      VERBOSE_FORMAT
                    )}</div-->
                  </div>
                `
              : null
          }

          <div class="attachments">
            ${(message.attachments || []).map(
              (attachment) =>
                html`<temba-thumbnail
                  attachment="${attachment}"
                ></temba-thumbnail>`
            )}
          </div>
        </div>
      </div>
    `;
  }

  public reset() {
    this.msgMap.clear();
    this.messageGroups = [];
    this.hideBottomScroll = true;
    this.hideTopScroll = true;
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
