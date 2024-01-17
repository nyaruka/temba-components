/* eslint-disable @typescript-eslint/no-this-alias */
import { LitElement, TemplateResult, html, css, PropertyValueMap } from 'lit';
import { property } from 'lit/decorators.js';

interface Message {
  text: string;
  type: string;
  identifier?: string;
  origin?: string;
}

export class WebChat extends LitElement {
  static get styles() {
    return css`
      :host {
        display: flex-inline;
        align-items: center;
        align-self: center;
      }

      .inactive {
        pointer-events: none;
        opacity: 0.3;
      }

      .active {
      }
    `;
  }

  @property({ type: String })
  channel: string;

  @property({ type: String })
  urn: string;

  @property({ type: Array })
  messages: Message[] = [];

  // is our socket connection established
  @property({ type: Boolean })
  active: boolean;

  // is the chat widget open
  @property({ type: Boolean })
  open: boolean;

  private sock: WebSocket;

  public constructor() {
    super();
  }

  private openSocket(): void {
    const webChat = this;
    let url = `ws://localhost:8070/start?channel=${this.channel}`;
    if (this.urn) {
      url = `${url}&identifier=${this.urn}`;
    }
    this.sock = new WebSocket(url);
    this.sock.onclose = function (event) {
      console.log('socket closed');
      webChat.active = false;
    };
    this.sock.onmessage = function (event) {
      console.log(event.data);
      const msg = JSON.parse(event.data) as Message;
      if (msg.type === 'chat_started') {
        webChat.urn = msg.identifier;
        webChat.active = true;
      }
      if (msg.type === 'msg_out') {
        msg['timestamp'] = new Date().getTime();
        webChat.messages.push(msg);
        webChat.requestUpdate('messages');
      }
    };
  }

  private restoreFromLocal(): void {
    console.log('Restoring from localStorage..');
    const data = JSON.parse(localStorage.getItem('temba-chat') || '{}');
    const urn = 'urn' in data ? data['urn'] : null;
    if (urn && !this.urn) {
      this.urn = urn;
      this.messages = 'messages' in data ? data['messages'] : [];
    }
  }

  private writeToLocal(): void {
    if (this.urn) {
      const data = { urn: this.urn, messages: this.messages, version: 1 };
      localStorage.setItem('temba-chat', JSON.stringify(data));
    }
  }

  public updated(
    changed: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changed);

    if (changed.has('open')) {
      this.openSocket();
    }

    if (changed.has('channel')) {
      // if we don't have an urn set, check for local storage
      if (!this.urn) {
        this.restoreFromLocal();
      }
    }

    if (changed.has('messages')) {
      this.writeToLocal();
    }
  }

  public openChat(): void {
    this.open = true;
  }

  public handleKeyDown(event: any) {
    if (event.key === 'Enter') {
      if (this.active) {
        const input = event.target;
        const text = input.value;
        input.value = '';
        const msg = {
          type: 'msg_in',
          text: text,
          timestamp: new Date().getTime(),
        };
        this.messages.push(msg);
        this.sock.send(JSON.stringify(msg));
        this.requestUpdate('messages');
      }
    }
  }

  public render(): TemplateResult {
    return html`
      ${!this.open
        ? html` <div @click=${this.openChat}>Open Me</div> `
        : html` <div>
            <div>
              ${this.messages
                ? this.messages.map(message => html`<div>${message.text}</div>`)
                : null}
            </div>
            <input
              class="${this.active ? 'active' : 'inactive'}"
              type="text"
              @keydown=${this.handleKeyDown}
            />
          </div>`}
    `;
  }
}
