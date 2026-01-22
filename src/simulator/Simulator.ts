import { html, TemplateResult } from 'lit-html';
import { RapidElement } from '../RapidElement';
import { FloatingWindow } from '../layout/FloatingWindow';
import { css, PropertyValueMap } from 'lit';
import { property } from 'lit/decorators.js';
import { postJSON, fromCookie, generateUUIDv7 } from '../utils';
import { getStore } from '../store/Store';
import { CustomEventType } from '../interfaces';
import { Chat, ContactEvent, MessageType } from '../display/Chat';
import { Events, renderEvent } from '../events/eventRenderers';

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
    phoneTotalHeight: 530,
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
    phoneTotalHeight: 600,
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
    phoneTotalHeight: 700,
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
        --animation-time: 200ms;
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
        transition: all var(--animation-time) ease;
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
        background: var(--color-primary-dark);
        color: white;
      }
      .option-btn.active:hover {
        background: var(--color-primary-dark);
      }

      .phone-frame {
        width: var(--phone-width);
        height: var(--phone-total-height);
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
        transition: left calc(var(--animation-time) * 1.5) ease-out,
          opacity calc(var(--animation-time) * 1.5) ease-out;
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
        transition: background var(--animation-time) ease;
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

      /* Custom scrollbar for chat area to allow content to flow behind input */
      .custom-scrollbar-container {
        position: absolute;
        top: 40px;
        bottom: var(--bottom-input-height, 60px);
        right: 4px;
        width: 10px;
        z-index: 20;
        overflow-y: auto;
        overflow-x: hidden;
      }

      .custom-scrollbar-container::-webkit-scrollbar {
        width: 6px;
      }

      .custom-scrollbar-container::-webkit-scrollbar-track {
        background: transparent;
      }

      .custom-scrollbar-container::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 3px;
      }

      .custom-scrollbar-container::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.4);
      }

      .custom-scrollbar-content {
        width: 100%;
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
        transition: transform var(--animation-time) ease;
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
        transition: opacity var(--animation-time) ease;
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
        animation: slideInUp var(--animation-time) ease-out;
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
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: white;
        display: flex;
        flex-direction: column;
      }

      temba-chat {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
        --color-chat-in: #e5e5ea;
        --color-chat-out: #007aff;
        --chat-top-padding: calc(var(--cutout-height));
        --chat-bottom-padding: calc(var(--bottom-input-height, 80px) - 10px);
      }

      .bottom-input-container {
        position: absolute;
        bottom: 0px;
        left: 0px;
        right: 0px;
        z-index: 10;
      }

      .bottom-input-container::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.45);
        backdrop-filter: blur(10px);
        -webkit-mask-image: linear-gradient(to bottom, transparent, black 20px);
        mask-image: linear-gradient(to bottom, transparent, black 20px);
        z-index: -1;
      }

      .quick-replies-container {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 6px;
        z-index: 9;
      }

      .quick-reply-btn {
        padding: 4px 8px;
        border-radius: 18px;
        border: 1px solid var(--color-primary, #007aff);
        background: white;
        color: var(--color-primary, #007aff);
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }

      .quick-reply-btn:hover:not(:disabled) {
        background: var(--color-primary, #007aff);
        color: white;
      }

      .quick-reply-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .message-input {
        padding: 8px 12px;
        border-top: none;
        display: flex;
        align-items: center;
        gap: 8px;
        z-index: 10;
      }
      .message-input input {
        flex: 1;
        border: 1px solid #c6c6c857;
        border-radius: 20px;
        padding: 8px 15px;
        font-size: 15px;
        margin-bottom: 5px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
        border: 1px solid #c6c6c857;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        flex-shrink: 0;
        margin-bottom: 5px;
        transition: all var(--animation-time) ease;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
        transition: opacity var(--animation-time) ease, transform 0.2s ease;
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
        transition: background var(--animation-time) ease;
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
    `;
  }

  @property({ type: String })
  flow = '';

  @property({ type: String })
  endpoint = '';

  @property({ type: Number })
  animationTime = 200;

  @fromCookie('simulator-size', 'small')
  size: 'small' | 'medium' | 'large';

  @property({ type: Array })
  private events: ContactEvent[] = [];

  private previousEventCount = 0;
  private chat: Chat = null;

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

  @fromCookie('simulator-follow', true)
  private following: boolean;

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

  // method to reset attachment indices for testing
  public resetAttachmentIndices() {
    this.imageIndex = 2;
    this.videoIndex = 0;
    this.audioIndex = 0;
    this.locationIndex = 0;
  }

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

  public connectedCallback() {
    super.connectedCallback();
  }

  protected firstUpdated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.firstUpdated(changes);
    this.chat = this.shadowRoot.querySelector('temba-chat');

    // if we have events that were collected before chat was ready, add them now
    if (this.chat && this.events.length > 0) {
      this.chat.addMessages(this.events, null, true);
    }

    this.setupCustomScrollbar();
  }

  private setupCustomScrollbar() {
    const chat = this.shadowRoot?.querySelector('temba-chat') as Chat;
    const scrollContainer = this.shadowRoot?.querySelector(
      '.custom-scrollbar-container'
    ) as HTMLElement;
    const scrollContent = this.shadowRoot?.querySelector(
      '.custom-scrollbar-content'
    ) as HTMLElement;

    if (!chat || !scrollContainer || !scrollContent) return;

    chat.updateComplete.then(() => {
      const chatScroll = chat.shadowRoot?.querySelector(
        '.scroll'
      ) as HTMLElement;
      if (!chatScroll) return;

      let ignoreScroll = false;

      // Sync from chat to custom scrollbar
      chatScroll.addEventListener('scroll', () => {
        if (!ignoreScroll) {
          ignoreScroll = true;
          // Chat: 0 (bottom) ... -Max (top) (Negative scrolling)
          // Custom: Max (bottom) ... 0 (top) (Positive scrolling)

          const maxScroll =
            scrollContainer.scrollHeight - scrollContainer.clientHeight;
          // Math.abs to handle negative scrollTop
          const distanceFromBottom = Math.abs(chatScroll.scrollTop);
          const newCustomScrollTop = maxScroll - distanceFromBottom;

          scrollContainer.scrollTop = newCustomScrollTop;

          requestAnimationFrame(() => (ignoreScroll = false));
        }
      });

      // Sync from custom scrollbar to chat
      scrollContainer.addEventListener('scroll', () => {
        if (!ignoreScroll) {
          ignoreScroll = true;

          const maxScroll =
            scrollContainer.scrollHeight - scrollContainer.clientHeight;
          const distanceFromBottom = maxScroll - scrollContainer.scrollTop;

          // chat scrollTop should be -distanceFromBottom
          chatScroll.scrollTop = -distanceFromBottom;

          requestAnimationFrame(() => (ignoreScroll = false));
        }
      });

      // Sync height
      const syncHeight = () => {
        const chatMaxScroll = chatScroll.scrollHeight - chatScroll.clientHeight;
        const customClientHeight = scrollContainer.clientHeight;

        // ensure minimum height
        if (chatMaxScroll <= 0) {
          scrollContent.style.height = '100%';
          return;
        }

        const newHeight = chatMaxScroll + customClientHeight;
        scrollContent.style.height = `${newHeight}px`;

        // If we were effectively at the bottom, stay at the bottom
        // This is a heuristic, assuming if we're close enough we're "at bottom"
        // But the Chat component handles scrollToBottom on new messages, which fires scroll event,
        // which updates us. So we might not need to force it here unless resize happens without message.
        if (Math.abs(chatScroll.scrollTop) < 5) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      };

      // Observe changes
      const observer = new MutationObserver(syncHeight);
      observer.observe(chatScroll, {
        childList: true,
        subtree: true,
        attributes: true
      });

      const resizeObserver = new ResizeObserver(syncHeight);
      resizeObserver.observe(chatScroll);

      // Initial sync
      syncHeight();
    });
  }

  protected updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);

    if (
      changes.has('currentQuickReplies') ||
      changes.has('keyboardVisible') ||
      changes.has('attachmentMenuOpen')
    ) {
      this.updateBottomInputHeight();
    }

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

    // ensure chat component is available
    if (!this.chat) {
      this.chat = this.shadowRoot.querySelector('temba-chat');
    }

    // start the simulation if we haven't already
    if (!this.session) {
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
      const errorEvent = {
        uuid: generateUUIDv7(),
        type: 'error',
        created_on: new Date(now),
        _rendered: {
          html: html`<p>Failed to start simulation</p>`,
          type: MessageType.Error
        }
      } as ContactEvent;
      if (this.chat) {
        this.chat.addMessages([errorEvent], null, true);
      } else {
        this.events = [...this.events, errorEvent];
      }
    }
  }

  private updateRunContext(runContext: RunContext, msgInEvt?: ContactEvent) {
    const newEvents: ContactEvent[] = [];

    // add the user's message if provided
    if (msgInEvt) {
      // ensure it has a UUID
      if (!msgInEvt.uuid) {
        msgInEvt.uuid = generateUUIDv7();
      }
      // ensure created_on is a Date object
      if (typeof msgInEvt.created_on === 'string') {
        msgInEvt.created_on = new Date(msgInEvt.created_on);
      }
      newEvents.push(msgInEvt);
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

    // extract quick replies from the most recent sprint
    this.currentQuickReplies = [];

    if (runContext.events && runContext.events.length > 0) {
      for (const rawEvent of runContext.events) {
        // skip msg_received events from the server since we already added the user's message
        if (rawEvent.type === 'msg_received') {
          continue;
        }

        // skip msg_created events without a proper msg property
        if (rawEvent.type === 'msg_created' && !(rawEvent as any).msg) {
          continue;
        }

        // convert to ContactEvent
        const event: ContactEvent = {
          ...rawEvent,
          uuid: rawEvent.uuid || generateUUIDv7(),
          created_on:
            typeof rawEvent.created_on === 'string'
              ? new Date(rawEvent.created_on)
              : rawEvent.created_on
        } as ContactEvent;

        // pre-render non-message events
        this.prerenderEvent(event);

        // extract quick replies from msg_created events
        if (event.type === 'msg_created' && (event as any).msg?.quick_replies) {
          this.currentQuickReplies = (event as any).msg.quick_replies;
        }

        const isMessage = event.type === 'msg_created';
        const msg = (event as any).msg;

        // Check if the event should be displayed.
        // 1. If it's a message, it must have text or attachments
        if (isMessage) {
          const hasText = msg.text && msg.text.trim().length > 0;
          const hasAttachments = msg.attachments && msg.attachments.length > 0;
          if (!hasText && !hasAttachments) {
            continue;
          }
        }
        // 2. If it's not a message, it must have been rendered by prerenderEvent
        else if (!event._rendered) {
          continue;
        }

        newEvents.push(event);
      }
    }

    // add all new events to chat component if it exists
    if (this.chat) {
      this.chat.addMessages(newEvents, null, true);
    } else {
      // fallback: store events and add them once chat is ready
      this.events = [...this.events, ...newEvents];
    }

    this.sprinting = false;
    this.requestUpdate(); // trigger re-render for quick replies
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

    // Update simulator activity in the store
    getStore().getState().updateSimulatorActivity({
      segments: pathCounts,
      nodes: nodeCounts
    });

    // Fire follow event if following is enabled
    if (this.following) {
      this.fireFollowEvent();
    }
  }

  private fireFollowEvent() {
    if (!this.session || !this.session.runs || this.session.runs.length === 0) {
      return;
    }

    // Find the first active or waiting run
    let activeRun = this.session.runs.find(
      (run: any) => run.status === 'active' || run.status === 'waiting'
    );

    // If no active/waiting run and simulation has ended, use the first completed run
    if (!activeRun) {
      activeRun = this.session.runs.find(
        (run: any) => run.status === 'completed'
      );
    }

    if (activeRun && activeRun.path && activeRun.path.length > 0) {
      const finalStep = activeRun.path[activeRun.path.length - 1];
      if (finalStep && finalStep.node_uuid) {
        this.fireCustomEvent(CustomEventType.FollowSimulation, {
          flowUuid: activeRun.flow?.uuid || this.flow,
          nodeUuid: finalStep.node_uuid
        });
      }
    }
  }

  private scrollToBottom() {
    if (this.chat) {
      // chat component handles scrolling, but we still need to focus input
      this.chat.scrollToBottom();
      setTimeout(() => {
        const input = this.shadowRoot?.querySelector(
          '.message-input input'
        ) as HTMLInputElement;
        if (input) {
          input.focus();
        }
      }, 50);
      return;
    }
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

  private prerenderEvent(event: ContactEvent) {
    // skip if already rendered or is a message event
    if (
      event._rendered ||
      event.type === Events.MSG_CREATED ||
      event.type === Events.MSG_RECEIVED
    ) {
      return;
    }

    // handle simulator-specific events (errors, warnings, failures)
    if (event.type === 'error' || event.type === 'failure') {
      event._rendered = {
        html: renderEvent(event, true),
        type: MessageType.Error
      };
      return;
    }

    if (event.type === 'warning') {
      event._rendered = {
        html: renderEvent(event, true),
        type: MessageType.Note
      };
      return;
    }

    // try to render as a standard event
    const rendered = renderEvent(event, true);
    if (rendered) {
      event._rendered = {
        html: rendered,
        type: MessageType.Inline
      };
    }
  }

  private handleClose() {
    const phoneWindow = this.shadowRoot.getElementById(
      'phone-window'
    ) as FloatingWindow;
    // phoneWindow.hide();

    phoneWindow.handleClose();
    this.isVisible = false;
    getStore().getState().setSimulatorActive(false);
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

    // reset chat component
    if (this.chat) {
      this.chat.reset();
    }

    // Clear simulator activity data
    getStore().getState().updateSimulatorActivity({
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

    // create the event for the API (with ISO string date)
    const msgInEvtForAPI = {
      uuid: generateUUIDv7(),
      type: 'msg_received',
      created_on: now,
      msg: {
        uuid: generateUUIDv7(),
        text: text || '',
        urn: this.contact.urns[0],
        direction: 'in',
        type: 'text',
        attachments: attachment ? [attachment] : [],
        quick_replies: [],
        channel: { uuid: generateUUIDv7(), name: 'Simulator' }
      }
    };

    // create the ContactEvent for display (with Date object)
    const msgInEvt = {
      ...msgInEvtForAPI,
      created_on: new Date(now)
    } as ContactEvent;

    // show user's message immediately via chat component
    if (this.chat) {
      this.chat.addMessages([msgInEvt], null, true);
    } else {
      this.events = [...this.events, msgInEvt];
    }
    this.requestUpdate();
    this.scrollToBottom();

    const body = {
      session: this.session,
      contact: this.contact,
      resume: {
        type: 'msg',
        event: msgInEvtForAPI,
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
      const errorEvent = {
        uuid: generateUUIDv7(),
        type: 'error',
        created_on: new Date(now),
        _rendered: {
          html: html`<p>Failed to send message</p>`,
          type: MessageType.Error
        }
      } as ContactEvent;
      if (this.chat) {
        this.chat.addMessages([errorEvent], null, true);
      } else {
        this.events = [...this.events, errorEvent];
      }
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

  private handleQuickReplyClick(text: string) {
    if (!this.sprinting && text) {
      this.resume(text);
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

  private updateBottomInputHeight() {
    requestAnimationFrame(() => {
      const bottomContainer = this.shadowRoot?.querySelector(
        '.bottom-input-container'
      ) as HTMLElement;
      if (bottomContainer) {
        const height = bottomContainer.offsetHeight;
        this.style.setProperty('--bottom-input-height', `${height}px`);
      }
    });
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
      --animation-time: ${this.animationTime}ms;
    `;

    return html`
      <temba-floating-window
        style="--transition-duration: ${this.animationTime}ms"
        id="phone-window"
        width="${this.windowWidth}"
        leftBoundaryMargin="${this.leftBoundaryMargin}"
        bottomBoundaryMargin="${config.windowPadding}"
        topBoundaryMargin="${config.windowPadding}"
        height="${config.phoneTotalHeight}"
        top="0"
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
            <temba-chat class="phone-screen" .showTimestamps=${false}>
            </temba-chat>
            <div class="custom-scrollbar-container">
              <div class="custom-scrollbar-content"></div>
            </div>

            <div class="bottom-input-container">
              ${this.currentQuickReplies.length > 0
                ? html`<div class="quick-replies-container">
                    ${this.currentQuickReplies.map(
                      (qr) => html`
                        <button
                          class="quick-reply-btn"
                          @click=${() => this.handleQuickReplyClick(qr.text)}
                          ?disabled=${this.sprinting}
                        >
                          ${qr.text}
                        </button>
                      `
                    )}
                  </div>`
                : null}
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
                  class="attachment-menu ${this.attachmentMenuOpen
                    ? 'open'
                    : ''}"
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
          </div>
          <div class="option-pane">
            <button class="option-btn" @click=${this.handleClose} title="Close">
              <temba-icon name="x" size="1.5"></temba-icon>
            </button>
            <button
              class="option-btn ${this.following ? 'active' : ''}"
              @click=${this.handleToggleFollow}
              title="${this.following ? 'Following' : 'Follow'}"
            >
              <temba-icon name="follow" size="1.5"></temba-icon>
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
        .hidden=${this.isVisible}
        @temba-button-clicked=${this.handleShow}
      ></temba-floating-tab>
    `;
  }
}
