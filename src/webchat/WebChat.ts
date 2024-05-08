/* eslint-disable @typescript-eslint/no-this-alias */
import { LitElement, TemplateResult, html, css, PropertyValueMap } from 'lit';
import { property } from 'lit/decorators.js';
import { getCookie, setCookie } from '../utils';

interface User {
  avatar?: string;
  email: string;
  name: string;
}

interface Message {
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

enum ChatStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
}

// how long of a window to show time between batches
const BATCH_TIME_WINDOW = 30 * 60 * 1000;
const SCROLL_FETCH_BUFFER = 0.05;
const MIN_FETCH_TIME = 250;

const TIME_FORMAT = { hour: 'numeric', minute: '2-digit' } as any;
const DAY_FORMAT = {
  weekday: undefined,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
} as any;
const VERBOSE_FORMAT = {
  weekday: undefined,
  year: undefined,
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
} as any;

export class WebChat extends LitElement {
  static get styles() {
    return css`
      :host {
        display: flex;
        align-items: center;
        align-self: center;
        --curvature: 0.6em;
        --color-primary: hsla(208, 70%, 55%, 1);
        font-family: 'Roboto', 'Helvetica Neue', sans-serif;
        font-weight: 400;
        --toggle-speed: 80ms;
        position: fixed;
        right: 0;
        bottom: 0;
        z-index: 10000;
      }

      .header {
        background: var(--color-primary);
        height: 3em;
        display: flex;
        align-items: center;
        width: 100%;
        color: rgba(255, 255, 255, 0.8);
        font-size: 0.8em;
      }

      .header slot {
        flex-grow: 1;
        padding: 1em;
        color: rgba(255, 255, 255, 0.9);
        font-size: 1.2em;
        display: block;
      }

      .header .close-button {
        margin: 0.5em;
        color: rgba(255, 255, 255, 0.5);
        cursor: pointer;
      }

      .header .close-button:hover {
        cursor: pointer;
        color: rgba(255, 255, 255, 1);
      }

      .block {
        margin-bottom: 1em;
      }

      .time {
        text-align: center;
        font-size: 0.8em;
        color: #999;
        margin-top: 2em;
        border-top: 1px solid #f8f8f8;
        padding: 1em;
        margin-left: 4em;
        margin-right: 4em;
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
        flex-shrink: 0;
        width: 2em;
        height: 2em;
        overflow: hidden;
        border-radius: 100%;
        box-shadow: rgba(0, 0, 0, 0.1) 0px 3px 7px 0px,
          rgba(0, 0, 0, 0.2) 0px 1px 2px 0px,
          inset 0 0 0 0.15em rgba(0, 0, 0, 0.1);
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
        transition: box-shadow var(--toggle-speed) ease-out;
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
        background: var(--color-primary);
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
        transition: all var(--toggle-speed) ease-out;
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
      }

      .scroll {
        height: 40rem;
        max-height: 60vh;
        overflow: auto;
        -webkit-overflow-scrolling: touch;
        overflow-scrolling: touch;
        padding: 1em 1em 0 1em;
        display: flex;
        flex-direction: column-reverse;
      }

      .messages:before {
        content: '';
        background:     /* Shadow TOP */ radial-gradient(
            farthest-side at 50% 0,
            rgba(0, 0, 0, 0.2),
            rgba(0, 0, 0, 0)
          )
          center top;
        height: 10px;
        display: block;
        position: absolute;
        width: 28rem;
        transition: opacity var(--toggle-speed) ease-out;
      }

      .messages:after {
        content: '';
        background:       /* Shadow BOTTOM */ radial-gradient(
            farthest-side at 50% 100%,
            rgba(0, 0, 0, 0.2),
            rgba(0, 0, 0, 0)
          )
          center bottom;
        height: 10px;
        display: block;
        position: absolute;
        margin-top: -10px;
        width: 28rem;
        margin-right: 5em;
        transition: opacity var(--toggle-speed) ease-out;
      }

      .scroll-at-top .messages:before {
        opacity: 0;
      }

      .scroll-at-bottom .messages:after {
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
        color: var(--color-primary);
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
        color: var(--color-primary);
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

  @property({ type: String })
  channel: string;

  @property({ type: String })
  urn: string;

  @property({ type: Array })
  messageGroups: string[][] = [];

  // is our socket connection established
  @property({ type: String })
  status: ChatStatus = ChatStatus.DISCONNECTED;

  // is the chat widget open
  @property({ type: Boolean })
  open = false;

  @property({ type: Boolean })
  fetching = false;

  @property({ type: Boolean })
  hasPendingText = false;

  @property({ type: Boolean, attribute: false })
  hideTopScroll = true;

  @property({ type: Boolean, attribute: false })
  hideBottomScroll = true;

  @property({ type: Boolean, attribute: false })
  blockHistoryFetching = false;

  @property({ type: String })
  host: string;

  private msgMap = new Map<string, Message>();
  private sock: WebSocket;
  private newMessageCount = 0;
  private oldestMessageDate: Date;
  private fetchRequested: Date;

  public constructor() {
    super();
  }

  private handleReconnect() {
    this.openSocket();
  }

  private sendSockMessage(message: Message) {
    console.log('MO', message);
    this.sock.send(JSON.stringify(message));
  }

  private openSocket(): void {
    if (this.status !== ChatStatus.DISCONNECTED) {
      return;
    }

    this.status = ChatStatus.CONNECTING;
    const webChat = this;
    let url = `wss://localhost.textit.com/connect/${this.channel}/`;
    if (this.urn) {
      url = `${url}?chat_id=${this.urn}`;
    }
    const sock = new WebSocket(url);
    this.sock = sock;
    this.sock.onclose = function (event: CloseEvent) {
      console.log('Socket closed', event);
      webChat.status = ChatStatus.DISCONNECTED;
    };

    this.sock.onopen = function (event: Event) {
      console.log('Socket opened', event);
      webChat.status = ChatStatus.CONNECTED;
      webChat.urn = getCookie('temba-chat-urn');
      const startChat = { type: 'start_chat' };
      if (webChat.urn) {
        startChat['chat_id'] = webChat.urn;
      }
      webChat.sendSockMessage(startChat);
    };

    this.sock.onmessage = function (event: MessageEvent) {
      webChat.status = ChatStatus.CONNECTED;
      const msg = JSON.parse(event.data) as Message;
      console.log('MT', msg);

      if (msg.type === 'chat_started') {
        if (webChat.urn !== msg.chat_id) {
          webChat.messageGroups = [];
        }
        webChat.urn = msg.chat_id;
        setCookie('temba-chat-urn', msg.chat_id);
        webChat.requestUpdate('messageGroups');
      } else if (msg.type === 'chat_resumed') {
        webChat.oldestMessageDate = new Date(msg.time);
        webChat.urn = msg.chat_id;
        webChat.fetchPreviousMessages();
      } else if (msg.type === 'msg_out') {
        webChat.addMessage(msg);
        webChat.requestUpdate('messageGroups');
      } else if (msg.type === 'history') {
        webChat.handleHistoryResponse(msg);
      }
    };
  }

  private isSameGroup(msg1: Message, msg2: Message): boolean {
    if (msg1 && msg2) {
      return (
        msg1.origin === msg2.origin &&
        msg1.user?.name === msg2.user?.name &&
        Math.abs(msg1.timeAsDate.getTime() - msg2.timeAsDate.getTime()) <
          BATCH_TIME_WINDOW
      );
    }
    return false;
  }

  private insertGroups(newGroups: string[][], append = false) {
    for (const newGroup of newGroups.reverse()) {
      // see if our new group belongs to the most recent group
      const group =
        this.messageGroups[append ? this.messageGroups.length - 1 : 0];
      if (group) {
        const lastMsgId = group[group.length - 1];
        const lastMsg = this.msgMap.get(lastMsgId);
        const newMsg = this.msgMap.get(newGroup[0]);
        // if our message belongs to the previous group, in we go
        if (this.isSameGroup(lastMsg, newMsg)) {
          group.push(...newGroup);
        } else {
          // otherwise, just add our entire group as a new one
          this.messageGroups.push(newGroup);
        }
      } else {
        this.messageGroups.push(newGroup);
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
      // lastGroup.splice(0, 0, msgId);
      lastMsg = msg;
    }
    return groups;
  }

  private fetchPreviousMessages() {
    if (!this.blockHistoryFetching) {
      this.blockHistoryFetching = true;
      this.fetching = true;

      const getHistoryMsg = { type: 'get_history' };
      if (this.oldestMessageDate) {
        getHistoryMsg['before'] = this.oldestMessageDate.toISOString();
      }

      this.fetchRequested = new Date();
      this.sendSockMessage(getHistoryMsg);
    }
  }

  private handleHistoryResponse(msg: Message) {
    const elapsed = new Date().getTime() - this.fetchRequested.getTime();
    window.setTimeout(
      () => {
        this.fetching = false;
        // block of historical messages
        const msgs = msg.history.reverse();

        // first add messages to the map
        const newMessages = [];
        for (const m of msgs) {
          if (this.addMessage(m)) {
            newMessages.push(m.msg_id);
          }
        }

        if (newMessages.length === 0) {
          // console.log('no more messages');
          return;
        }

        const groups = this.groupMessages(newMessages);
        this.insertGroups(groups);

        const ele = this.shadowRoot.querySelector('.scroll');
        const prevTop = ele.scrollTop;

        window.setTimeout(() => {
          ele.scrollTop = prevTop;
          this.blockHistoryFetching = false;
        }, 100);
      },
      // if it's the first load don't wait, otherwise wait a minimum amount of time
      this.messageGroups.length === 0
        ? 0
        : Math.max(0, MIN_FETCH_TIME - elapsed)
    );
  }

  public firstUpdated(
    changed: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.firstUpdated(changed);
  }

  private focusInput() {
    const input = this.shadowRoot.querySelector('.input') as any;
    if (input) {
      input.focus();
    }
  }

  public updated(
    changed: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changed);

    if (this.open && changed.has('open') && changed.get('open') !== undefined) {
      const scroll = this.shadowRoot.querySelector('.scroll');
      const hasScroll = scroll.scrollHeight > scroll.clientHeight;
      this.hideBottomScroll = true;
      this.hideTopScroll = !hasScroll;
      this.scrollToBottom();

      if (this.status === ChatStatus.DISCONNECTED) {
        this.openSocket();
      }
    }

    if (changed.has('status')) {
      if (this.status === ChatStatus.CONNECTED) {
        this.focusInput();
      }
    }

    if (changed.has('messageGroups')) {
      // console.log(this.messageGroups);
      // this.scrollToBottom();
    }
  }

  private addMessage(msg: Message): boolean {
    if (msg.time && !msg.timeAsDate) {
      msg.timeAsDate = new Date(msg.time);
    }

    if (
      !this.oldestMessageDate ||
      msg.timeAsDate.getTime() < this.oldestMessageDate.getTime()
    ) {
      this.oldestMessageDate = msg.timeAsDate;
    }

    const isNew = !this.msgMap.has(msg.msg_id);
    this.msgMap.set(msg.msg_id, msg);
    return isNew;

    /* 
    let lastGroup =
      this.messageGroups.length > 0 ? this.messageGroups[this.messageGroups.length - 1] : [];
  
    const lastMsgId = lastGroup.length > 0 ? lastGroup[lastGroup.length - 1] : null;
    const lastMsg = lastMsgId ? this.msgMap.get(lastMsgId) : null;
  
    let isSame = !lastMsg || (lastMsg.origin === msg.origin && lastMsg.user?.name === msg.user?.name);
    if (isSame && lastMsg && msg.timeAsDate.getTime() - lastMsg.timeAsDate.getTime() > BATCH_TIME_WINDOW) {
      isSame = false;
    }
  
    if (!isSame) {
      lastGroup = [];
    }
    if (lastGroup.length === 0) {
      this.messageGroups.push(lastGroup);
    }
  
    this.msgMap.set(msg.msg_id, msg);
    lastGroup.push(msg.msg_id);
    */
  }

  public openChat(): void {
    this.open = true;
  }

  public handleKeyUp(event: any) {
    if (this.hasPendingText && event.key === 'Enter') {
      this.sendPendingMessage();
    }

    this.hasPendingText = event.target.value.length > 0;
  }

  private sendPendingMessage() {
    if (this.status === ChatStatus.CONNECTED) {
      const input = this.shadowRoot.querySelector('.input') as any;
      const text = input.value;
      input.value = '';

      const msg = {
        msg_id: `pending-${this.newMessageCount++}`,
        type: 'send_msg',
        text: text,
        time: new Date().toISOString(),
      };

      this.addMessage(msg);
      this.insertGroups(this.groupMessages([msg.msg_id]).reverse(), true);
      this.sendSockMessage(msg);

      this.hasPendingText = input.value.length > 0;
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
    const incoming = !message.origin;
    const avatar = message.user?.avatar;
    const name = message.user?.name;

    return html` <div
      class="block  ${incoming ? 'incoming' : 'outgoing'} ${idx === 0
        ? 'first'
        : ''}"
      title="${blockTime.toLocaleTimeString(undefined, VERBOSE_FORMAT)}"
    >
      <div class="row">
        ${!incoming
          ? html`
              <div
                class="avatar"
                style="background: center / contain no-repeat url(${avatar})"
              ></div>
            `
          : null}

        <div class="bubble">
          ${!incoming ? html`<div class="name">${name}</div>` : null}
          ${msgIds.map(
            msgId =>
              html`<div class="message">${this.msgMap.get(msgId).text}</div>`
          )}
        </div>
      </div>
      ${timeDisplay}
    </div>`;
  }

  private handleScroll(event: any) {
    const ele = event.target;
    const top = ele.scrollHeight - ele.clientHeight;
    const scroll = Math.round(top + ele.scrollTop);
    const scrollPct = scroll / top;

    this.hideTopScroll = scrollPct <= 0.01;
    this.hideBottomScroll = scrollPct >= 0.99;

    if (this.blockHistoryFetching) {
      return;
    }

    if (scrollPct < SCROLL_FETCH_BUFFER) {
      this.fetchPreviousMessages();
    }
  }

  private handleClickInputPanel(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const input = this.shadowRoot.querySelector('.input') as any;
    input.focus();
  }

  private toggleChat() {
    this.open = !this.open;
  }

  public render(): TemplateResult {
    return html`
      <div
        class="chat ${this.status} ${this.hideTopScroll
          ? 'scroll-at-top'
          : ''} ${this.hideBottomScroll ? 'scroll-at-bottom' : ''} ${this.open
          ? 'open'
          : ''}"
      >
        <div class="header">
          <slot name="header">${this.urn ? this.urn : 'Chat'}</slot>
          <temba-icon
            name="close"
            size="1.3"
            class="close-button"
            @click=${this.toggleChat}
          ></temba-icon>
        </div>
        <div class="messages">
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
        </div>

        ${this.status === ChatStatus.DISCONNECTED
          ? html`<div class="notice">
              <div>This chat is not currently connected.</div>
              <div class="reconnect" @click=${this.handleReconnect}>
                Click here to reconnect
                <div></div>
              </div>
            </div>`
          : null}
        ${this.status === ChatStatus.CONNECTING
          ? html`<div class="notice">
              <div>Connecting</div>
              <temba-icon name="progress_spinner" spin></temba-icon>
            </div>`
          : null}
        ${this.status === ChatStatus.CONNECTED
          ? html` <div
              class="row input-panel ${this.hasPendingText ? 'pending' : ''}"
              @click=${this.handleClickInputPanel}
            >
              <input
                class="input ${this.status === ChatStatus.CONNECTED
                  ? 'active'
                  : 'inactive'}"
                type="text"
                placeholder="Message.."
                ?disabled=${this.status !== ChatStatus.CONNECTED}
                @keydown=${this.handleKeyUp}
              />
              <temba-icon
                tabindex="1"
                class="send-icon"
                name="send"
                size="1"
                clickable
                @click=${this.sendPendingMessage}
              ></temba-icon>
            </div>`
          : null}
      </div>

      <div @click=${this.toggleChat}>
        <div
          class="toggle"
          style="background: center / contain no-repeat url(https://dl-textit.s3.amazonaws.com/orgs/6418/media/5e81/5e814c83-bf33-43ea-b6c1-ee46f8acaf34/avatar.jpg)"
        ></div>
      </div>
    `;
  }
}
