import { html, TemplateResult } from 'lit-html';
import { RapidElement } from '../RapidElement';
import { FloatingWindow } from '../layout/FloatingWindow';
import { FloatingTab } from '../display/FloatingTab';
import { css, PropertyValueMap } from 'lit';
import { property } from 'lit/decorators.js';
import { postJSON, fromCookie } from '../utils';
import { getStore } from '../store/Store';

// test attachment URLs
const TEST_IMAGES = [
  'https://s3.amazonaws.com/floweditor-assets.temba.io/simulator/sim_image_a.jpg',
  'https://s3.amazonaws.com/floweditor-assets.temba.io/simulator/sim_image_b.jpg',
  'https://s3.amazonaws.com/floweditor-assets.temba.io/simulator/sim_image_c.jpg',
  'https://s3.amazonaws.com/floweditor-assets.temba.io/simulator/sim_image_d.jpg'
];

const TEST_VIDEOS = [
  'https://s3.amazonaws.com/floweditor-assets.temba.io/simulator/sim_video_a.mp4'
];

const TEST_AUDIO = [
  'https://s3.amazonaws.com/floweditor-assets.temba.io/simulator/sim_audio_a.mp3'
];

const TEST_LOCATIONS = [
  'geo:47.6062,-122.3321', // Seattle
  'geo:-0.1807,-78.4678', // Quito
  'geo:-2.9001,-79.0059', // Cuenca
  'geo:-1.9536,30.0606' // Kigali
];

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

interface SimulatorSize {
  phoneWidth: number;
  phoneHeight: number;
  phoneTotalHeight: number;
  phoneScreenHeight: number;
  contextWidth: number;
  contextHeight: number;
  contextOffset: number;
  optionPaneWidth: number;
  optionPaneGap: number;
  windowPadding: number;
  cutoutHeight: number;
  cutoutPadding: number;
  cutoutFontSize: number;
  cutoutIslandWidth: number;
  cutoutIslandHeight: number;
  cutoutIslandTop: number;
}

const SIMULATOR_SIZES: Record<string, SimulatorSize> = {
  small: {
    phoneWidth: 270,
    phoneHeight: 576,
    phoneTotalHeight: 576,
    phoneScreenHeight: 376,
    contextWidth: 336,
    contextHeight: 416,
    contextOffset: 48,
    optionPaneWidth: 44,
    optionPaneGap: 10,
    windowPadding: 24,
    cutoutHeight: 32,
    cutoutPadding: 12,
    cutoutFontSize: 10,
    cutoutIslandWidth: 80,
    cutoutIslandHeight: 20,
    cutoutIslandTop: 6
  },
  medium: {
    phoneWidth: 300,
    phoneHeight: 720,
    phoneTotalHeight: 720,
    phoneScreenHeight: 470,
    contextWidth: 420,
    contextHeight: 520,
    contextOffset: 60,
    optionPaneWidth: 44,
    optionPaneGap: 12,
    windowPadding: 30,
    cutoutHeight: 40,
    cutoutPadding: 16,
    cutoutFontSize: 12,
    cutoutIslandWidth: 100,
    cutoutIslandHeight: 24,
    cutoutIslandTop: 8
  },
  large: {
    phoneWidth: 360,
    phoneHeight: 864,
    phoneTotalHeight: 864,
    phoneScreenHeight: 564,
    contextWidth: 504,
    contextHeight: 624,
    contextOffset: 72,
    optionPaneWidth: 44,
    optionPaneGap: 14,
    windowPadding: 36,
    cutoutHeight: 50,
    cutoutPadding: 20,
    cutoutFontSize: 14,
    cutoutIslandWidth: 120,
    cutoutIslandHeight: 30,
    cutoutIslandTop: 10
  }
};

export class Simulator extends RapidElement {
  static get styles() {
    return css`
      :host {
        /* size-specific dimensions are set dynamically via inline styles */
        --phone-width: 300px;
        --phone-total-height: 720px;
        --context-width: 420px;
        --context-offset: 60px;
        --option-pane-width: 44px;
        --option-pane-gap: 12px;
        --window-padding: 30px;
        --phone-screen-height: 470px;
        --context-height: 520px;
        --context-closed-left: 332px;
      }

      .phone-simulator {
        padding-left: calc(var(--context-width) + var(--context-offset));
        padding-top: var(--window-padding);
        padding-bottom: var(--window-padding);
        position: relative;
        display: flex;
        align-items: flex-start;
      }

      .option-pane {
        margin-top: var(--window-padding);
        margin-left: var(--option-pane-gap);
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 6px;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(10px);
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        pointer-events: all;
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
        width: var(--phone-width);
        border-radius: 40px;
        border: 6px solid #1f2937;
        box-shadow: 0 0px 30px rgba(0, 0, 0, 0.4);
        background: #000;
        position: relative;
        overflow: hidden;
        z-index: 2;
      }

      .context-explorer {
        width: var(--context-width);
        height: var(--context-height);
        border-top-left-radius: 16px;
        border-bottom-left-radius: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        position: absolute;
        left: var(--context-closed-left);
        top: calc(var(--window-padding) + 40px);
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
        left: var(--context-offset);
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
        height: var(--cutout-height);
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 var(--cutout-padding);
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
        top: var(--cutout-island-top);
        left: 50%;

        width: var(--cutout-island-width);
        height: var(--cutout-island-height);
        background: #000;
        border-radius: calc(var(--cutout-island-height) / 1.5);
        z-index: 1;
      }
      .phone-notch .time {
        color: #000;
        font-size: var(--cutout-font-size);
        font-weight: 600;
      }
      .phone-notch .status-icons {
        display: flex;
        gap: 4px;
        align-items: center;
      }
      .phone-notch .status-icons span {
        color: #000;
        font-size: var(--cutout-font-size);
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
        padding-top: calc(var(--cutout-height) + 10px);
        padding-bottom: 60px;
        height: var(--phone-screen-height);
        overflow-y: scroll;
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
      .attachment-wrapper {
        max-width: 70%;
        margin-bottom: 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .attachment-wrapper.incoming {
        margin-right: auto;
        align-items: flex-start;
      }
      .attachment-wrapper.outgoing {
        margin-left: auto;
        align-items: flex-end;
      }
      .attachment-wrapper.animated {
        animation: messageAppear 0.3s ease-out forwards;
        opacity: 0;
      }
      .attachment {
        border-radius: 12px;
        overflow: hidden;
        max-width: 100%;
      }
      .attachment img {
        max-width: 100%;
        display: block;
        border-radius: 12px;
      }
      .attachment video {
        max-width: 100%;
        display: block;
        border-radius: 12px;
      }
      .attachment-audio {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px;
        background: white;
        border: 1px solid #e5e5ea;
        border-radius: 12px;
        min-width: 160px;
      }
      .attachment-wrapper.outgoing .attachment-audio {
        background: white;
        border: none;
      }
      .attachment-audio audio {
        flex: 1;
        max-height: 30px;
      }
      .attachment-location {
        border-radius: 12px;
        overflow: hidden;
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
        padding: 8px 12px;
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
      .attachment-button {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: #fff;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        flex-shrink: 0;
        margin-bottom: 5px;
        transition: all 0.2s ease;
        color: #000;
      }
      .attachment-button:hover {
        background: #f8f8f8ff;
        transform: scale(1.05);
      }
      .attachment-button:active {
        transform: scale(0.95);
      }
      .attachment-menu {
        position: absolute;
        bottom: 55px;
        left: 12px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        opacity: 0;
        pointer-events: none;
        transform: translateY(10px);
        transition: opacity 0.2s ease, transform 0.2s ease;
        z-index: 20;
      }
      .attachment-menu.open {
        opacity: 1;
        pointer-events: all;
        transform: translateY(0);
      }
      .attachment-menu-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.2s ease;
        white-space: nowrap;
        font-size: 14px;
        color: #1f2937;
      }
      .attachment-menu-item:hover {
        background: #f3f4f6;
      }
      .attachment-menu-item temba-icon {
        color: #007aff;
      }
      .quick-replies {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 8px;
        margin-top: 4px;
        margin-bottom: 8px;
      }
      .quick-reply-btn {
        background: white;
        color: #007aff;
        border: 1px solid #007aff;
        border-radius: 18px;
        padding: 4px 8px;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
      }
      .quick-reply-btn:hover {
        background: #007aff;
        color: white;
        cursor: pointer;
      }
      .quick-reply-btn:active {
        transform: scale(0.95);
      }
      .quick-reply-btn.animated {
        animation: messageAppear 0.3s ease-out forwards;
        opacity: 0;
      }
    `;
  }

  @property({ type: String })
  flow = '';

  @property({ type: String })
  endpoint = '';

  @fromCookie('simulator-size', 'small')
  size: 'small' | 'medium' | 'large';

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

  @fromCookie('simulator-context-open', false)
  private contextExplorerOpen: boolean;

  @property({ type: Object })
  private expandedPaths: Set<string> = new Set();

  @property({ type: String })
  private copiedExpression = '';

  @property({ type: String })
  private toastMessage = '';

  @property({ type: Boolean })
  private showAllKeys = true;

  private previousWindowWidth = 0;

  @property({ type: Array })
  private currentQuickReplies: any[] = [];

  @property({ type: Boolean })
  private isVisible = false;

  @property({ type: Boolean })
  private attachmentMenuOpen = false;

  private boundClickOutsideHandler: ((event: MouseEvent) => void) | null = null;

  // attachment cycling indices - initialized randomly
  private imageIndex = Math.floor(Math.random() * TEST_IMAGES.length);
  private videoIndex = Math.floor(Math.random() * TEST_VIDEOS.length);
  private audioIndex = Math.floor(Math.random() * TEST_AUDIO.length);
  private locationIndex = Math.floor(Math.random() * TEST_LOCATIONS.length);

  private get sizeConfig(): SimulatorSize {
    return SIMULATOR_SIZES[this.size] || SIMULATOR_SIZES.medium;
  }

  private get windowWidth(): number {
    const config = this.sizeConfig;
    return (
      config.contextWidth +
      config.phoneWidth +
      config.optionPaneWidth +
      config.optionPaneGap +
      config.contextOffset
    );
  }

  private get leftBoundaryMargin(): number {
    const config = this.sizeConfig;
    return config.contextWidth + config.contextOffset;
  }

  private get contextClosedLeft(): number {
    const config = this.sizeConfig;
    return config.contextWidth + config.contextOffset - config.phoneWidth;
  }

  protected updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);
    if (changes.has('flow') && this.flow) {
      this.endpoint = `/flow/simulate/${this.flow}/`;
    }

    // handle attachment menu click outside listener
    if (changes.has('attachmentMenuOpen')) {
      if (this.attachmentMenuOpen) {
        // create bound handler if it doesn't exist
        if (!this.boundClickOutsideHandler) {
          this.boundClickOutsideHandler =
            this.handleClickOutsideAttachmentMenu.bind(this);
        }
        // add listener when menu opens
        setTimeout(() => {
          document.addEventListener('click', this.boundClickOutsideHandler);
        }, 0);
      } else {
        // remove listener when menu closes
        if (this.boundClickOutsideHandler) {
          document.removeEventListener('click', this.boundClickOutsideHandler);
        }
      }
    }

    // update floating window boundaries when size changes
    if (changes.has('size')) {
      requestAnimationFrame(() => {
        const phoneWindow = this.shadowRoot?.getElementById(
          'phone-window'
        ) as FloatingWindow;
        if (phoneWindow) {
          // use the stored previous width since phoneWindow.width has already been updated
          const oldWidth = this.previousWindowWidth || phoneWindow.width;
          const oldRight = phoneWindow.left + oldWidth;

          const config = this.sizeConfig;
          const newWidth = this.windowWidth;

          // store current width for next size change
          this.previousWindowWidth = newWidth;

          // update dimensions and boundaries
          phoneWindow.width = newWidth;
          phoneWindow.leftBoundaryMargin = this.leftBoundaryMargin;
          phoneWindow.topBoundaryMargin = config.windowPadding;
          phoneWindow.bottomBoundaryMargin = config.windowPadding;

          // keep right edge in same position by adjusting left
          let newLeft = oldRight - newWidth;

          // apply same boundary logic as FloatingWindow.handleMouseMove
          const padding = 20;
          const minLeft = padding - this.leftBoundaryMargin;
          const maxLeft =
            window.innerWidth -
            newWidth -
            padding +
            phoneWindow.rightBoundaryMargin;

          // clamp to boundaries
          newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));

          phoneWindow.left = newLeft;

          // adjust vertical position if needed
          const windowElement = phoneWindow.shadowRoot?.querySelector(
            '.window'
          ) as HTMLElement;
          const currentHeight =
            windowElement?.offsetHeight || config.phoneTotalHeight;
          const maxTop = Math.max(
            padding - config.windowPadding,
            window.innerHeight - currentHeight - padding + config.windowPadding
          );

          phoneWindow.top = Math.max(
            padding - config.windowPadding,
            Math.min(phoneWindow.top, maxTop)
          );
        }
      });
    } else {
      // store initial width when first rendered
      if (!this.previousWindowWidth) {
        this.previousWindowWidth = this.windowWidth;
      }
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    // clean up event listener when component is removed
    if (this.boundClickOutsideHandler) {
      document.removeEventListener('click', this.boundClickOutsideHandler);
    }
  }

  private handleShow() {
    const phoneWindow = this.shadowRoot.getElementById(
      'phone-window'
    ) as FloatingWindow;
    phoneWindow.show();
    this.isVisible = true;
    getStore().getState().setSimulatorActive(true);

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

      // extract quick replies from the most recent sprint
      this.currentQuickReplies = [];
      for (const event of runContext.events) {
        if (event.type === 'msg_created' && event.msg?.quick_replies) {
          this.currentQuickReplies = event.msg.quick_replies;
        }
      }
    }

    this.sprinting = false;
    this.requestUpdate();
    this.scrollToBottom();
    this.updateActivity();
  }

  private updateActivity() {
    if (!this.session) {
      return;
    }

    const pathCounts: { [key: string]: number } = {};
    const nodeCounts: { [nodeUUID: string]: number } = {};

    // iterate through all runs to get path segment counts
    for (const run of this.session.runs) {
      if (run.path) {
        for (let i = 0; i < run.path.length - 1; i++) {
          const step = run.path[i];
          const nextStep = run.path[i + 1];
          if (step.exit_uuid && nextStep.node_uuid) {
            const key = step.exit_uuid + ':' + nextStep.node_uuid;
            pathCounts[key] = (pathCounts[key] || 0) + 1;
          }
        }
      }

      // set node counts on the last step of any active/waiting runs
      if (run.status === 'active' || run.status === 'waiting') {
        if (run.path && run.path.length > 0) {
          const finalStep = run.path[run.path.length - 1];
          if (finalStep && finalStep.node_uuid) {
            nodeCounts[finalStep.node_uuid] =
              (nodeCounts[finalStep.node_uuid] || 0) + 1;
          }
        }
      }
    }

    // Update activity in the store
    getStore().getState().updateActivity({
      segments: pathCounts,
      nodes: nodeCounts
    });
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
    this.isVisible = false;
    getStore().getState().setSimulatorActive(false);

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
    this.currentQuickReplies = [];

    // Clear activity data
    getStore().getState().updateActivity({
      segments: {},
      nodes: {}
    });

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

  private handleCycleSize() {
    const sizes: Array<'small' | 'medium' | 'large'> = [
      'small',
      'medium',
      'large'
    ];
    const currentIndex = sizes.indexOf(this.size);
    const nextIndex = (currentIndex + 1) % sizes.length;
    this.size = sizes[nextIndex];
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
          const contextExplorerLeft = this.sizeConfig.contextOffset;
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

  private async resume(text: string, attachment?: string) {
    if ((!text && !attachment) || !this.session) {
      return;
    }

    this.sprinting = true;
    this.inputValue = '';
    this.currentQuickReplies = [];
    this.attachmentMenuOpen = false;

    const now = new Date().toISOString();
    const msgInEvt: Event = {
      uuid: crypto.randomUUID(),
      type: 'msg_received',
      created_on: now,
      msg: {
        uuid: crypto.randomUUID(),
        text: text || '',
        urn: this.contact.urns[0],
        attachments: attachment ? [attachment] : []
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

  private handleQuickReply(quickReply: string) {
    if (!this.sprinting) {
      this.resume(quickReply);
    }
  }

  private handleToggleAttachmentMenu() {
    this.attachmentMenuOpen = !this.attachmentMenuOpen;
  }

  private handleClickOutsideAttachmentMenu(event: MouseEvent) {
    if (!this.attachmentMenuOpen) {
      return;
    }

    const menu = this.shadowRoot?.querySelector('.attachment-menu');
    const button = this.shadowRoot?.querySelector('.attachment-button');

    if (!menu || !button) {
      return;
    }

    // check if click is outside both menu and button
    const clickedInsideMenu = menu.contains(event.target as Node);
    const clickedInsideButton = button.contains(event.target as Node);

    if (!clickedInsideMenu && !clickedInsideButton) {
      this.attachmentMenuOpen = false;
    }
  }

  private handleSendAttachment(attachmentType: string) {
    let attachment = '';
    switch (attachmentType) {
      case 'image':
        attachment = `image/jpeg:${TEST_IMAGES[this.imageIndex]}`;
        this.imageIndex = (this.imageIndex + 1) % TEST_IMAGES.length;
        break;
      case 'video':
        attachment = `video/mp4:${TEST_VIDEOS[this.videoIndex]}`;
        this.videoIndex = (this.videoIndex + 1) % TEST_VIDEOS.length;
        break;
      case 'audio':
        attachment = `audio/mp3:${TEST_AUDIO[this.audioIndex]}`;
        this.audioIndex = (this.audioIndex + 1) % TEST_AUDIO.length;
        break;
      case 'location':
        attachment = TEST_LOCATIONS[this.locationIndex];
        this.locationIndex = (this.locationIndex + 1) % TEST_LOCATIONS.length;
        break;
    }

    if (attachment) {
      this.resume('', attachment);
    }
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

  private renderAttachment(attachment: string): TemplateResult {
    // parse attachment format: "type/subtype:url" or "geo:lat,long"
    const parts = attachment.split(':');
    const type = parts[0];
    const content = parts.slice(1).join(':'); // rejoin in case url has colons

    if (type === 'geo') {
      // use temba-thumbnail for location to get map image
      return html`
        <div class="attachment-location">
          <temba-thumbnail attachment="${attachment}"></temba-thumbnail>
        </div>
      `;
    } else if (type.startsWith('image/')) {
      // custom image rendering
      return html`
        <div class="attachment">
          <img src="${content}" alt="Image attachment" />
        </div>
      `;
    } else if (type.startsWith('video/')) {
      // custom video rendering
      return html`
        <div class="attachment">
          <video controls>
            <source src="${content}" type="${type}" />
          </video>
        </div>
      `;
    } else if (type.startsWith('audio/')) {
      // custom audio rendering
      return html`
        <div class="attachment">
          <div class="attachment-audio">
            <audio controls>
              <source src="${content}" type="${type}" />
            </audio>
          </div>
        </div>
      `;
    }

    // fallback for unknown types
    return html`
      <div class="attachment">
        <span>Attachment</span>
      </div>
    `;
  }

  private renderMessages(): TemplateResult {
    if (this.events.length === 0) {
      return html`
        <div class="message incoming">👋 Welcome! Starting simulation...</div>
      `;
    }

    const eventTemplates = this.events.map((event, index) => {
      // only animate messages that are new (beyond previous count)
      const isNew = index >= this.previousEventCount;
      const animatedClass = isNew ? 'animated' : '';
      // stagger animations for new messages
      const animationDelay = isNew
        ? `${(index - this.previousEventCount) * 0.2}s`
        : '0s';

      if (event.type === 'msg_received' && event.msg) {
        const hasAttachments =
          event.msg.attachments && event.msg.attachments.length > 0;
        const hasText = event.msg.text && event.msg.text.trim().length > 0;

        return html`
          ${hasAttachments
            ? html`
                <div
                  class="attachment-wrapper outgoing ${animatedClass}"
                  style="animation-delay: ${animationDelay}"
                >
                  ${event.msg.attachments.map((att: string) =>
                    this.renderAttachment(att)
                  )}
                </div>
              `
            : html``}
          ${hasText
            ? html`
                <div
                  class="message outgoing ${animatedClass}"
                  style="animation-delay: ${animationDelay}"
                >
                  ${event.msg.text}
                </div>
              `
            : html``}
        `;
      } else if (event.type === 'msg_created' && event.msg) {
        const hasAttachments =
          event.msg.attachments && event.msg.attachments.length > 0;
        const hasText = event.msg.text && event.msg.text.trim().length > 0;

        return html`
          ${hasAttachments
            ? html`
                <div
                  class="attachment-wrapper incoming ${animatedClass}"
                  style="animation-delay: ${animationDelay}"
                >
                  ${event.msg.attachments.map((att: string) =>
                    this.renderAttachment(att)
                  )}
                </div>
              `
            : html``}
          ${hasText
            ? html`
                <div
                  class="message incoming ${animatedClass}"
                  style="animation-delay: ${animationDelay}"
                >
                  ${event.msg.text}
                </div>
              `
            : html``}
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
    });

    // render quick replies at the end if we have any from the most recent sprint
    const hasQuickReplies = this.currentQuickReplies.length > 0;
    const quickRepliesAnimationDelay =
      this.events.length >= this.previousEventCount
        ? `${(this.events.length - this.previousEventCount) * 0.2}s`
        : '0s';

    return html`
      ${eventTemplates}
      ${hasQuickReplies
        ? html`
            <div
              class="quick-replies animated"
              style="animation-delay: ${quickRepliesAnimationDelay}"
            >
              ${this.currentQuickReplies.map(
                (qr: any) => html`
                  <button
                    class="quick-reply-btn animated"
                    style="animation-delay: ${quickRepliesAnimationDelay}"
                    @click=${() => this.handleQuickReply(qr.text)}
                  >
                    ${qr.text}
                  </button>
                `
              )}
            </div>
          `
        : html``}
    `;
  }

  protected render(): TemplateResult {
    const config = this.sizeConfig;

    // set CSS custom properties dynamically based on size
    const styleVars = `
      --phone-width: ${config.phoneWidth}px;
      --phone-total-height: ${config.phoneTotalHeight}px;
      --context-width: ${config.contextWidth}px;
      --context-offset: ${config.contextOffset}px;
      --option-pane-width: ${config.optionPaneWidth}px;
      --option-pane-gap: ${config.optionPaneGap}px;
      --window-padding: ${config.windowPadding}px;
      --phone-screen-height: ${config.phoneScreenHeight}px;
      --context-height: ${config.contextHeight}px;
      --context-closed-left: ${this.contextClosedLeft}px;
      --cutout-height: ${config.cutoutHeight}px;
      --cutout-padding: ${config.cutoutPadding}px;
      --cutout-font-size: ${config.cutoutFontSize}px;
      --cutout-island-width: ${config.cutoutIslandWidth}px;
      --cutout-island-height: ${config.cutoutIslandHeight}px;
      --cutout-island-top: ${config.cutoutIslandTop}px;
    `;

    return html`
      <temba-floating-window
        id="phone-window"
        width="${this.windowWidth}"
        leftBoundaryMargin="${this.leftBoundaryMargin}"
        bottomBoundaryMargin="${config.windowPadding}"
        topBoundaryMargin="${config.windowPadding}"
        height="${config.phoneTotalHeight}"
        top="60"
        chromeless
      >
        <div class="phone-simulator" style="${styleVars}">
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

          <div
            class="phone-frame"
            style="pointer-events: ${this.isVisible ? 'all' : 'none'}"
          >
            <div class="phone-top drag-handle">
              <div class="phone-notch">
                <div class="dynamic-island"></div>
              </div>
            </div>
            <div class="phone-screen">${this.renderMessages()}</div>
            <div class="message-input">
              <button
                class="attachment-button"
                @click=${this.handleToggleAttachmentMenu}
                ?disabled=${this.sprinting}
              >
                <temba-icon name="plus" size="1.5"></temba-icon>
              </button>
              <input
                type="text"
                placeholder="Enter Message"
                .value=${this.inputValue}
                @input=${this.handleInput}
                @keyup=${this.handleKeyUp}
                ?disabled=${this.sprinting}
              />
              <div
                class="attachment-menu ${this.attachmentMenuOpen ? 'open' : ''}"
              >
                <div
                  class="attachment-menu-item"
                  @click=${() => this.handleSendAttachment('image')}
                >
                  <temba-icon name="attachment_image" size="1.2"></temba-icon>
                  <span>Image</span>
                </div>
                <div
                  class="attachment-menu-item"
                  @click=${() => this.handleSendAttachment('video')}
                >
                  <temba-icon name="attachment_video" size="1.2"></temba-icon>
                  <span>Video</span>
                </div>
                <div
                  class="attachment-menu-item"
                  @click=${() => this.handleSendAttachment('audio')}
                >
                  <temba-icon name="attachment_audio" size="1.2"></temba-icon>
                  <span>Audio</span>
                </div>
                <div
                  class="attachment-menu-item"
                  @click=${() => this.handleSendAttachment('location')}
                >
                  <temba-icon
                    name="attachment_location"
                    size="1.2"
                  ></temba-icon>
                  <span>Location</span>
                </div>
              </div>
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

            <button
              class="option-btn"
              @click=${this.handleCycleSize}
              title="Size: ${this.size}"
            >
              ${this.size === 'small'
                ? 'S'
                : this.size === 'medium'
                ? 'M'
                : 'L'}
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
