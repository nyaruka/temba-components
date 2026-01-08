import { html, TemplateResult } from 'lit-html';
import { RapidElement } from '../RapidElement';
import { FloatingWindow } from '../layout/FloatingWindow';
import { FloatingTab } from '../display/FloatingTab';
import { css, PropertyValueMap } from 'lit';
import { property } from 'lit/decorators.js';
import { postJSON } from '../utils';

interface Contact {
  uuid: string;
  name?: string;
  urns: string[];
  fields?: { [key: string]: any };
  groups?: any[];
  language?: string;
  status?: string;
  created_on?: string;
}

interface Session {
  environment: any;
  runs: any[];
  status: string;
  trigger: any;
  wait?: any;
}

interface Message {
  uuid: string;
  text?: string;
  urn: string;
  attachments?: string[];
  quick_replies?: any[];
}

interface Event {
  type: string;
  created_on: string;
  msg?: Message;
  [key: string]: any;
}

interface RunContext {
  session: Session;
  events: Event[];
  context?: any;
  contact?: Contact;
}

export class Simulator extends RapidElement {
  static get styles() {
    return css`
      .phone-simulator {
        padding-left: 467px;
        padding-top: 30px;
        padding-bottom: 30px;
        position: relative;
        display: flex;
        align-items: flex-start;
      }

      .option-pane {
        margin-top: 30px;
        margin-left: 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 6px;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(10px);
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      }
      .option-btn {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 12px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        color: white;
      }
      .option-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: scale(1.05);
      }
      .option-btn:active {
        transform: scale(0.95);
      }
      .option-btn.active {
        background: var(--color-secondary-dark);
        color: white;
      }
      .option-btn.active:hover {
        background: var(--color-secondary-dark);
      }
      .phone-frame {
        width: 300px;
        border-radius: 40px;
        border: 8px solid #1f2937;
        box-shadow: 0 0px 30px rgba(0, 0, 0, 0.4);
        background: #000;
        position: relative;
        overflow: hidden;
        z-index: 2;
      }

      .context-explorer {
        width: 420px;
        height: 520px;
        border-top-left-radius: 16px;
        border-bottom-left-radius: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        position: absolute;
        left: 332px;
        top: 70px;
        z-index: 1;
        font-size: 13px;
        color: #374151;
        transition: left 0.3s ease-out, opacity 0.3s ease-out;
        opacity: 0;
        pointer-events: none;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(10px);
        display: flex;
        flex-direction: column;
        padding: 12px;
      }

      .context-gutter {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 6px;

        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 4px;
        margin-right: 32px;
        margin-top: 8px;
        flex-shrink: 0;
      }

      .context-gutter-btn {
        width: 14px;
        height: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border-radius: 6px;
        transition: background 0.2s ease;
        color: rgba(255, 255, 255, 0.6);
        padding: 4px;
      }

      .context-gutter-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.9);
      }

      .context-gutter-btn.active {
        color: #c084fc;
      }

      .context-gutter-spacer {
        flex: 1;
      }

      .context-explorer-scroll {
        scrollbar-color: rgba(255, 255, 255, 0.3) #4a4a4a;
        scrollbar-width: thin;
        height: 100%;
        overflow-y: scroll;
        padding-right: 10px;
        margin-right: 30px;
        flex-grow: 1;
      }

      .context-explorer-bleed {
        height: 100%;
        width: 0px;
      }

      .context-explorer-scroll::-webkit-scrollbar {
        width: 18px;
      }

      .context-explorer-scroll::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 4px;
      }

      .context-explorer-scroll::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 4px;
      }

      .context-explorer-scroll::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.5);
      }

      .context-explorer.open {
        left: 60px;
        opacity: 1;
        pointer-events: auto;
      }

      .context-item {
        display: flex;
        align-items: flex-start;
        padding: 2px 4px;
        cursor: pointer;
        user-select: none;
      }

      .context-item:hover {
        background: rgba(0, 0, 0, 0.05);
      }

      .context-item-expandable {
        display: flex;
        align-items: center;
      }

      .context-expand-icon {
        width: 16px;
        display: inline-block;
        text-align: center;
        flex-shrink: 0;
        transition: transform 0.2s ease;
        color: #ffffff;
      }

      .context-expand-icon.expanded {
        transform: rotate(90deg);
      }

      .context-key {
        color: #ffffff;
        flex-shrink: 0;
        margin-right: 8px;
        display: flex;
      }

      .context-key.has-value {
        color: #e8b5e8;
      }

      .context-value {
        color: #aaa;
        flex: 1;
        text-align: right;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .context-children {
        margin-left: 16px;
      }

      .context-copy-icon {
        opacity: 0;
        margin-left: 4px;
        transition: opacity 0.2s ease;
        cursor: pointer;
        color: #ccc;
      }

      .context-item:hover .context-copy-icon {
        opacity: 1;
      }

      .context-toast {
        position: absolute;
        bottom: 60px;
        left: 50%;
        transform: translateX(-50%);
        background: #666;
        color: white;
        padding: 12px 12px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        font-size: 13px;
        z-index: 10;
        animation: slideInUp 0.3s ease-out;
      }

      .context-toast .expression {
        color: #e8b5e8;
        font-weight: 600;
      }

      @keyframes slideInUp {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }

      .phone-top {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        z-index: 10;
        cursor: grab;
      }
      .phone-notch {
        background: transparent;
        height: 50px;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 20px;
      }
      .phone-notch::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 100%;
        background: linear-gradient(
          to bottom,
          rgba(0, 0, 0, 0.3) 0%,
          rgba(0, 0, 0, 0.2) 50%,
          transparent 100%
        );
        z-index: -1;
      }
      .dynamic-island {
        top: 10px;
        left: 50%;

        width: 120px;
        height: 30px;
        background: #000;
        border-radius: 20px;
        z-index: 1;
      }
      .phone-notch .time {
        color: #000;
        font-size: 14px;
        font-weight: 600;
      }
      .phone-notch .status-icons {
        display: flex;
        gap: 4px;
        align-items: center;
      }
      .phone-notch .status-icons span {
        color: #000;
        font-size: 14px;
      }
      .phone-header {
        background: transparent;
        padding: 10px 15px;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        cursor: move;
        user-select: none;
        border-bottom: none;
        pointer-events: all;
      }

      .phone-screen {
        background: white;
        padding: 15px;
        padding-top: 75px;
        padding-bottom: 60px;
        height: 470px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
        scrollbar-width: thin;
      }

      .phone-screen::-webkit-scrollbar {
        width: 8px;
      }

      .phone-screen::-webkit-scrollbar-track {
        background: transparent;
      }

      .phone-screen::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
      }

      .phone-screen::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.3);
      }

      @keyframes messageAppear {
        0% {
          opacity: 0;
          transform: scale(0.8);
        }
        70% {
          opacity: 1;
          transform: scale(1.05);
        }
        100% {
          opacity: 1;
          transform: scale(1);
        }
      }

      .message {
        padding: 10px 14px;
        margin-bottom: 8px;
        border-radius: 18px;
        max-width: 70%;
        font-size: 13px;
        line-height: 1.2;
      }
      .message.animated {
        animation: messageAppear 0.3s ease-out forwards;
        opacity: 0;
      }
      .message.incoming {
        background: #e5e5ea;
        color: #000;
        margin-right: auto;
        border-bottom-left-radius: 4px;
      }
      .message.outgoing {
        background: #007aff;
        color: white;
        margin-left: auto;
        text-align: left;
        border-bottom-right-radius: 4px;
      }
      .event-info {
        text-align: center;
        font-size: 11px;
        color: #8e8e93;
        margin: 4px 0;
        padding: 0 10px;
        line-height: 1.3;
      }
      .event-info.animated {
        animation: messageAppear 0.2s ease-out forwards;
        opacity: 0;
      }
      .message-input {
        background: linear-gradient(
          to top,
          rgba(0, 0, 0, 0.1) 0%,
          rgba(0, 0, 0, 0.05) 70%,
          transparent 100%
        );
        padding: 8px 16px;
        border-top: none;
        display: flex;
        align-items: center;
        gap: 8px;
        position: absolute;
        bottom: 0px;
        left: 0px;
        right: 0px;
        z-index: 10;
      }
      .message-input input {
        flex: 1;
        border: 1px solid #c6c6c8;
        border-radius: 20px;
        padding: 8px 15px;
        font-size: 15px;
        margin-bottom: 5px;
        background: white;
        border: none;
        outline: none;
      }
      .message-input input::placeholder {
        color: #8e8e93;
      }
    `;
  }

  @property({ type: String })
  flow = '';

  @property({ type: String })
  endpoint = '';

  @property({ type: Array })
  private events: Event[] = [];

  private previousEventCount = 0;

  @property({ type: Object })
  private session: Session | null = null;

  @property({ type: Object })
  private context: any = null;

  @property({ type: Object })
  private contact: Contact = {
    uuid: 'fb3787ab-2eda-48a0-a2bc-e2ddadec1286',
    urns: ['tel:+12065551212'],
    fields: {},
    groups: [],
    language: 'eng',
    status: 'active',
    created_on: new Date().toISOString()
  };

  @property({ type: Boolean })
  private sprinting = false;

  @property({ type: String })
  private inputValue = '';

  @property({ type: Boolean })
  private following = false;

  @property({ type: Boolean })
  private contextExplorerOpen = false;

  @property({ type: Object })
  private expandedPaths: Set<string> = new Set();

  @property({ type: String })
  private copiedExpression = '';

  @property({ type: String })
  private toastMessage = '';

  @property({ type: Boolean })
  private showAllKeys = true;

  protected updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);
    if (changes.has('flow') && this.flow) {
      this.endpoint = `/flow/simulate/${this.flow}/`;
    }
  }

  private handleShow() {
    const phoneWindow = this.shadowRoot.getElementById(
      'phone-window'
    ) as FloatingWindow;
    phoneWindow.show();

    // start the simulation if we haven't already
    if (this.events.length === 0) {
      this.startFlow();
    }
  }

  private async startFlow() {
    const now = new Date().toISOString();

    // set created_on to simulation start time
    this.contact = { ...this.contact, created_on: now };

    const body = {
      contact: this.contact,
      trigger: {
        type: 'manual',
        triggered_on: now,
        flow: { uuid: this.flow, name: 'New Chat' },
        params: {}
      }
    };

    try {
      const response = await postJSON(this.endpoint, body);
      this.updateRunContext(response.json as RunContext);
    } catch (error) {
      console.error('Failed to start simulation:', error);
      this.events = [
        ...this.events,
        {
          type: 'error',
          created_on: now,
          text: 'Failed to start simulation'
        } as any
      ];
    }
  }

  private updateRunContext(runContext: RunContext, msgInEvt?: Event) {
    if (msgInEvt) {
      this.events = [...this.events, msgInEvt];
    }

    if (runContext.session) {
      this.session = runContext.session;

      // update our contact with the latest from the session
      if (runContext.contact) {
        this.contact = runContext.contact;
      }
    }

    // store the context from the response
    if (runContext.context) {
      this.context = runContext.context;
    }

    if (runContext.events && runContext.events.length > 0) {
      this.events = [...this.events, ...runContext.events];
    }

    this.sprinting = false;
    this.requestUpdate();
    this.scrollToBottom();
  }

  private scrollToBottom() {
    // wait for render, then scroll to bottom
    setTimeout(() => {
      const screen = this.shadowRoot?.querySelector('.phone-screen');
      if (screen) {
        screen.scrollTop = screen.scrollHeight;
      }
      // update previous count after animation completes
      this.previousEventCount = this.events.length;

      // return focus to input
      const input = this.shadowRoot?.querySelector(
        '.message-input input'
      ) as HTMLInputElement;
      if (input) {
        input.focus();
      }
    }, 50);
  }

  private handleClose() {
    const phoneWindow = this.shadowRoot.getElementById(
      'phone-window'
    ) as FloatingWindow;
    phoneWindow.hide();

    const phoneTab = this.shadowRoot.getElementById('phone-tab') as FloatingTab;
    phoneTab.hidden = false;
  }

  private handleReset() {
    // reset simulation state
    this.events = [];
    this.session = null;
    this.context = null;
    this.inputValue = '';
    this.sprinting = false;
    this.previousEventCount = 0;

    // reset contact to initial state
    this.contact = {
      uuid: 'fb3787ab-2eda-48a0-a2bc-e2ddadec1286',
      urns: ['tel:+12065551212'],
      fields: {},
      groups: [],
      language: 'eng',
      status: 'active',
      created_on: new Date().toISOString()
    };

    // restart the flow
    this.startFlow();
  }

  private handleToggleFollow() {
    this.following = !this.following;
  }

  private handleToggleContextExplorer() {
    this.contextExplorerOpen = !this.contextExplorerOpen;

    // if opening the context explorer, ensure it's not off-screen
    if (this.contextExplorerOpen) {
      requestAnimationFrame(() => {
        const phoneWindow = this.shadowRoot?.getElementById(
          'phone-window'
        ) as FloatingWindow;
        if (phoneWindow) {
          const padding = 20;
          const contextExplorerLeft = 60; // from CSS .context-explorer.open
          const minWindowLeft = padding - contextExplorerLeft;

          if (phoneWindow.left < minWindowLeft) {
            phoneWindow.left = minWindowLeft;
          }
        }
      });
    }
  }

  private togglePath(path: string) {
    if (this.expandedPaths.has(path)) {
      this.expandedPaths.delete(path);
    } else {
      this.expandedPaths.add(path);
    }
    this.requestUpdate();
  }

  private isExpandable(value: any): boolean {
    if (value === null || typeof value !== 'object') {
      return false;
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    // check if object has keys other than __default__
    const keys = Object.keys(value).filter((key) => key !== '__default__');
    return keys.length > 0;
  }

  private renderContextValue(value: any): TemplateResult | string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean')
      return html`<span class="context-value">${value}</span>`;
    if (typeof value === 'number')
      return html`<span class="context-value">${value}</span>`;
    if (typeof value === 'string')
      return html`<span class="context-value">${value}</span>`;
    if (Array.isArray(value))
      return html`<span class="context-value">[${value.length}]</span>`;
    return '';
  }

  private buildExpression(path: string): string {
    return `@${path}`;
  }

  private async handleCopyExpression(
    path: string,
    event: Event
  ): Promise<void> {
    event.stopPropagation();
    const expression = this.buildExpression(path);
    try {
      await navigator.clipboard.writeText(expression);
      this.copiedExpression = expression;
      // clear the toast after 2 seconds
      setTimeout(() => {
        this.copiedExpression = '';
      }, 2000);
    } catch (err) {
      console.error('Failed to copy expression:', err);
    }
  }

  private handleToggleShowAllKeys() {
    this.showAllKeys = !this.showAllKeys;
    this.toastMessage = this.showAllKeys
      ? 'Showing all keys'
      : 'Filtering out keys without values';
    // clear the toast after 2 seconds
    setTimeout(() => {
      this.toastMessage = '';
    }, 2000);
  }

  private renderContextTree(
    obj: any,
    path: string = ''
  ): TemplateResult | TemplateResult[] {
    if (!obj || typeof obj !== 'object') {
      return html``;
    }

    let entries = Array.isArray(obj)
      ? obj.map((v, i) => [String(i), v])
      : Object.entries(obj).filter(([key]) => key !== '__default__');

    // filter out keys without values if showAllKeys is false
    if (!this.showAllKeys) {
      entries = entries.filter(([, value]) => {
        // keep if expandable (has children)
        if (this.isExpandable(value)) return true;
        // keep if it has a displayable value (not null/undefined)
        if (value === null || value === undefined) return false;
        // keep primitives with values
        return (
          typeof value === 'boolean' ||
          typeof value === 'number' ||
          typeof value === 'string' ||
          Array.isArray(value)
        );
      });
    }

    return html`${entries.map(([key, value]) => {
      const currentPath = path ? `${path}.${key}` : key;
      const isExpanded = this.expandedPaths.has(currentPath);
      const expandable = this.isExpandable(value);

      // check if this object has a __default__ value
      let displayValue = value;

      if (
        expandable &&
        !Array.isArray(value) &&
        value !== null &&
        typeof value === 'object' &&
        '__default__' in value
      ) {
        displayValue = value.__default__;
      }

      return html`
        <div>
          <div
            class="context-item ${expandable ? 'context-item-expandable' : ''}"
            @click=${() => expandable && this.togglePath(currentPath)}
          >
            ${expandable
              ? html`<span
                  class="context-expand-icon ${isExpanded ? 'expanded' : ''}"
                  >›</span
                >`
              : html`<span class="context-expand-icon"></span>`}
            <span class="context-key ${expandable ? 'has-value' : ''}"
              >${key}
              <temba-icon
                class="context-copy-icon"
                name="copy"
                size="0.9"
                @click=${(e: Event) =>
                  this.handleCopyExpression(currentPath, e)}
              ></temba-icon>
            </span>
            ${!isExpanded ? this.renderContextValue(displayValue) : html``}
          </div>
          ${isExpanded
            ? html`<div class="context-children">
                ${this.renderContextTree(value, currentPath)}
              </div>`
            : html``}
        </div>
      `;
    })}`;
  }

  private async resume(text: string) {
    if (!text || !this.session) {
      return;
    }

    this.sprinting = true;
    this.inputValue = '';

    const now = new Date().toISOString();
    const msgInEvt: Event = {
      uuid: crypto.randomUUID(),
      type: 'msg_received',
      created_on: now,
      msg: {
        uuid: crypto.randomUUID(),
        text,
        urn: this.contact.urns[0],
        attachments: []
      }
    };

    // show user's message immediately
    this.events = [...this.events, msgInEvt];
    this.requestUpdate();
    this.scrollToBottom();

    const body = {
      session: this.session,
      contact: this.contact,
      resume: {
        type: 'msg',
        event: msgInEvt,
        resumed_on: now
      }
    };

    try {
      const response = await postJSON(this.endpoint, body);

      // add a small delay before showing the reply to simulate typing
      await new Promise((resolve) => setTimeout(resolve, 400));

      // pass null for msgInEvt since we already added it
      this.updateRunContext(response.json as RunContext, null);
    } catch (error) {
      console.error('Failed to resume simulation:', error);
      this.events = [
        ...this.events,
        {
          type: 'error',
          created_on: now,
          text: 'Failed to send message'
        } as any
      ];
      this.sprinting = false;
    }
  }

  private handleKeyUp(evt: KeyboardEvent) {
    if (evt.key === 'Enter') {
      const input = evt.target as HTMLInputElement;
      const text = input.value.trim();
      if (text) {
        this.resume(text);
      }
    }
  }

  private handleInput(evt: Event) {
    const input = evt.target as HTMLInputElement;
    this.inputValue = input.value;
  }

  private getEventDescription(event: Event): string | null {
    switch (event.type) {
      case 'contact_groups_changed': {
        const groups = (event as any).groups_added || [];
        const removedGroups = (event as any).groups_removed || [];
        if (groups.length > 0) {
          const groupNames = groups.map((g: any) => `"${g.name}"`).join(', ');
          return `Added to ${groupNames}`;
        }
        if (removedGroups.length > 0) {
          const groupNames = removedGroups
            .map((g: any) => `"${g.name}"`)
            .join(', ');
          return `Removed from ${groupNames}`;
        }
        break;
      }
      case 'contact_field_changed': {
        const field = (event as any).field;
        const value = (event as any).value;
        const valueText = value ? value.text || value : '';
        if (field) {
          if (valueText) {
            return `Set contact "${field.name}" to "${valueText}"`;
          } else {
            return `Cleared contact "${field.name}"`;
          }
        }
        break;
      }
      case 'contact_language_changed':
        return `Set preferred language to "${(event as any).language}"`;
      case 'contact_name_changed':
        return `Set contact name to "${(event as any).name}"`;
      case 'contact_status_changed':
        return `Set status to "${(event as any).status}"`;
      case 'contact_urns_changed':
        return `Added a URN for the contact`;
      case 'input_labels_added': {
        const labels = (event as any).labels || [];
        if (labels.length > 0) {
          const labelNames = labels.map((l: any) => `"${l.name}"`).join(', ');
          return `Message labeled with ${labelNames}`;
        }
        break;
      }
      case 'run_result_changed':
        return `Set result "${(event as any).name}" to "${
          (event as any).value
        }"`;
      case 'run_started':
      case 'flow_entered': {
        const flow = (event as any).flow;
        if (flow) {
          return `Entered flow "${flow.name}"`;
        }
        break;
      }
      case 'run_ended': {
        const flow = (event as any).flow;
        if (flow) {
          return `Exited flow "${flow.name}"`;
        }
        break;
      }
      case 'msg_wait':
        return `Waiting for reply`;
      case 'email_created':
      case 'email_sent': {
        const recipients = (event as any).to || (event as any).addresses || [];
        const subject = (event as any).subject;
        const recipientList = recipients
          .map((r: string) => `"${r}"`)
          .join(', ');
        return `Sent email to ${recipientList} with subject "${subject}"`;
      }
      case 'broadcast_created': {
        const translations = (event as any).translations;
        const baseLanguage = (event as any).base_language;
        if (translations && translations[baseLanguage]) {
          return `Sent broadcast: "${translations[baseLanguage].text}"`;
        }
        return `Sent broadcast`;
      }
      case 'session_triggered': {
        const flow = (event as any).flow;
        if (flow) {
          return `Started somebody else in "${flow.name}"`;
        }
        break;
      }
      case 'ticket_opened': {
        const ticket = (event as any).ticket;
        if (ticket && ticket.topic) {
          return `Ticket opened with topic "${ticket.topic.name}"`;
        }
        return `Ticket opened`;
      }
      case 'resthook_called':
        return `Triggered flow event "${(event as any).resthook}"`;
      case 'webhook_called':
        return `Called ${(event as any).url}`;
      case 'service_called': {
        const service = (event as any).service;
        if (service === 'classifier') {
          return `Called classifier`;
        }
        return `Called ${service}`;
      }
      case 'airtime_transferred': {
        const amount = (event as any).actual_amount;
        const currency = (event as any).currency;
        const recipient = (event as any).recipient;
        if (amount && currency && recipient) {
          return `Transferred ${amount} ${currency} to ${recipient}`;
        }
        break;
      }
      case 'info':
        return (event as any).text;
      case 'warning':
        return `⚠️ ${(event as any).text}`;
    }
    return null;
  }

  private renderMessages(): TemplateResult {
    if (this.events.length === 0) {
      return html`
        <div class="message incoming">👋 Welcome! Starting simulation...</div>
      `;
    }

    return html`
      ${this.events.map((event, index) => {
        // only animate messages that are new (beyond previous count)
        const isNew = index >= this.previousEventCount;
        const animatedClass = isNew ? 'animated' : '';
        // stagger animations for new messages
        const animationDelay = isNew
          ? `${(index - this.previousEventCount) * 0.2}s`
          : '0s';

        if (event.type === 'msg_received' && event.msg) {
          return html`
            <div
              class="message outgoing ${animatedClass}"
              style="animation-delay: ${animationDelay}"
            >
              ${event.msg.text}
            </div>
          `;
        } else if (event.type === 'msg_created' && event.msg) {
          return html`
            <div
              class="message incoming ${animatedClass}"
              style="animation-delay: ${animationDelay}"
            >
              ${event.msg.text}
            </div>
          `;
        } else if (event.type === 'error') {
          return html`
            <div
              class="message incoming ${animatedClass}"
              style="background: #ff4444; color: white; animation-delay: ${animationDelay}"
            >
              ⚠️ ${(event as any).text || 'An error occurred'}
            </div>
          `;
        } else {
          // check if this is an event we should display
          const description = this.getEventDescription(event);
          if (description) {
            return html`
              <div
                class="event-info ${animatedClass}"
                style="animation-delay: ${animationDelay}"
              >
                ${description}
              </div>
            `;
          }
        }
        return html``;
      })}
    `;
  }

  protected render(): TemplateResult {
    return html`
      <temba-floating-window
        id="phone-window"
        width="849"
        leftBoundaryMargin="467"
        bottomBoundaryMargin="30"
        topBoundaryMargin="30"
        height="720"
        top="60"
        chromeless
      >
        <div class="phone-simulator">
          <div
            class="context-explorer ${this.contextExplorerOpen ? 'open' : ''}"
          >
            <div class="context-explorer-scroll">
              ${this.context
                ? this.renderContextTree(this.context)
                : html`<div
                    style="color: #9ca3af; padding: 8px; text-align: center;"
                  >
                    No context available
                  </div>`}
            </div>
            <div class="context-gutter">
              <div
                class="context-gutter-btn ${this.showAllKeys ? '' : 'active'}"
                @click=${this.handleToggleShowAllKeys}
                title="${this.showAllKeys
                  ? 'Show keys with values only'
                  : 'Show all keys'}"
              >
                <temba-icon
                  name="${this.showAllKeys ? 'filter' : 'filter'}"
                  size="1"
                ></temba-icon>
              </div>
              <div class="context-gutter-spacer"></div>
              <div
                class="context-gutter-btn"
                @click=${this.handleToggleContextExplorer}
                title="Close"
              >
                <temba-icon name="x" size="1"></temba-icon>
              </div>
            </div>
            ${this.copiedExpression
              ? html`<div class="context-toast">
                  Copied
                  <span class="expression">${this.copiedExpression}</span>
                  to the clipboard
                </div>`
              : this.toastMessage
              ? html`<div class="context-toast">${this.toastMessage}</div>`
              : html``}
          </div>

          <div class="phone-frame">
            <div class="phone-top drag-handle">
              <div class="phone-notch">
                <div class="dynamic-island"></div>
              </div>
            </div>
            <div class="phone-screen">${this.renderMessages()}</div>
            <div class="message-input">
              <input
                type="text"
                placeholder="Enter Message"
                .value=${this.inputValue}
                @input=${this.handleInput}
                @keyup=${this.handleKeyUp}
                ?disabled=${this.sprinting}
              />
            </div>
          </div>
          <div class="option-pane">
            <button class="option-btn" @click=${this.handleClose} title="Close">
              <temba-icon name="x" size="1.5"></temba-icon>
            </button>
            <button
              class="option-btn ${this.contextExplorerOpen ? 'active' : ''}"
              @click=${this.handleToggleContextExplorer}
              title="Context Explorer"
            >
              <temba-icon name="expressions" size="1.5"></temba-icon>
            </button>

            <!--button
              class="option-btn ${this.following ? 'active' : ''}"
              @click=${this.handleToggleFollow}
              title="${this.following ? 'Following' : 'Follow'}"
            >
              <temba-icon name="follow" size="1.5"></temba-icon>
            </button-->

            <button class="option-btn" @click=${this.handleReset} title="Reset">
              <temba-icon name="delete" size="1.5"></temba-icon>
            </button>
          </div>
        </div>
      </temba-floating-window>

      <temba-floating-tab
        id="phone-tab"
        icon="simulator"
        label="Phone Simulator"
        color="#10b981"
        @temba-button-clicked=${this.handleShow}
      ></temba-floating-tab>
    `;
  }
}
