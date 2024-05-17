import { TemplateResult, css, html } from 'lit';
import { RapidElement } from '../RapidElement';
import { property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

const ANIMATION_DURATION = 300;
const STALE_DURATION = 5000;

interface ToastMessage {
  id: number;
  text: string;
  level: 'info' | 'warning' | 'error';
  visible?: boolean;
  time: Date;
  removeTime?: Date;
}

export class Toast extends RapidElement {
  @property({ type: Array })
  messages: ToastMessage[] = [];

  static styles = css`
    :host {
      position: fixed;
      width: 400px;
      z-index: 10000;
      right: 0;
    }

    .message {
      background-color: rgba(50, 50, 50, 0.85);
      background-color: rgba(255, 255, 255, 0.97);
      color: rgba(0, 0, 0, 0.85);
      padding: 0.5em 1em;
      margin: 0.5em;
      border-radius: 0.5em;
      display: flex;
      transition: all ${ANIMATION_DURATION}ms ease-in-out;
      transform: translateY(-100%);
      opacity: 0;
      box-shadow: rgba(0, 0, 0, 0.2) 0px 0px 3em 2px;
      border: 2px solid rgba(0, 0, 0, 0.3);
    }

    .message.visible {
      transform: translateY(0);
      opacity: 1;
    }

    .message.info {
    }

    .message.warning {
      color: rgba(255, 167, 0, 0.9);
    }

    .message.error {
      border-color: var(--color-error);
      color: var(--color-error);
    }

    .message.removing {
      opacity: 0;
      transform: translateY(-100%);
    }

    temba-icon {
      cursor: pointer;
      padding-left: 1em;
      opacity: 0;
      transition: all 200ms ease-in-out;
    }

    .message:hover temba-icon {
      opacity: 1;
    }

    temba-icon:hover {
      transform: scale(1.3) translateX(-0.1em);
    }

    .message .text {
      flex-grow: 1;
    }

    .info {
    }
  `;

  constructor() {
    super();
    /*this.info(
      'This is just an informational message, do with it what you will. But I do think it would be good to have at least one message that wraps.'
    );
    this.warning(
      'This one is a little more serious. Get ready, things might get worse.'
    );
    this.error('Uh oh! Something went wrong. You should probably fix it.');*/
  }

  public checkForStaleMessages() {
    const now = new Date();
    this.messages.forEach((message) => {
      // error messages do not remove themselves
      if (message.level !== 'error') {
        if (now.getTime() - message.time.getTime() > STALE_DURATION) {
          this.removeMessage(message);
        }
      }
    });

    if (this.messages.length === 0 && this.checker) {
      window.clearInterval(this.checker);
      this.checker = 0;
    }
  }

  private checker: number;
  private messageId: number = 0;

  public addMessages(messages: ToastMessage[]) {
    messages.forEach((message) => {
      this.addMessage(message.text, message.level);
    });
  }

  public addMessage(text: string, level: 'info' | 'warning' | 'error') {
    const message: ToastMessage = {
      id: ++this.messageId,
      text,
      level,
      time: new Date()
    };
    this.messages.push(message);

    window.setTimeout(() => {
      message.visible = true;
      this.requestUpdate('messages');
    }, 100);

    this.requestUpdate('messages');

    if (this.checker) {
      window.clearInterval(this.checker);
      this.checker = 0;
    }

    this.checker = window.setInterval(
      this.checkForStaleMessages.bind(this),
      1000
    );
  }

  public info(message: string) {
    this.addMessage(message, 'info');
  }

  public warning(message: string) {
    this.addMessage(message, 'warning');
  }

  public error(message: string) {
    this.addMessage(message, 'error');
  }

  public removeMessage(message: ToastMessage) {
    message.removeTime = new Date();
    window.setTimeout(() => {
      this.messages = this.messages.filter((m) => m !== message);
      this.requestUpdate('messages');
    }, ANIMATION_DURATION);

    this.requestUpdate('messages');
  }

  private handleMessageClicked(e: MouseEvent) {
    const ele = e.target as HTMLElement;
    const id = parseInt(ele.getAttribute('message_id'));
    const message = this.messages.find((m) => m.id === id);
    if (message) {
      this.removeMessage(message);
    }
  }

  public render(): TemplateResult {
    return html`
      ${repeat(
        this.messages,
        (message) => message.id,
        (message) => html`
          <div
            class="message ${message.level} ${message.visible
              ? 'visible'
              : ''} ${message.removeTime ? 'removing' : ''}"
          >
            <div class="text">${message.text}</div>
            <temba-icon
              name="close"
              size="1.3"
              message_id="${message.id}"
              @click=${this.handleMessageClicked}
            ></temba-icon>
          </div>
        `
      )}
    `;
  }
}
