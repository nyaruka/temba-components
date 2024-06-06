import { TemplateResult, html, css } from 'lit';
import { FormElement } from '../FormElement';
import { property } from 'lit/decorators.js';
import { Attachment, CustomEventType, Language } from '../interfaces';
import { DEFAULT_MEDIA_ENDPOINT } from '../utils';
import { Completion } from '../completion/Completion';
import { Select } from '../select/Select';
import { TabPane } from '../tabpane/TabPane';
import { EventHandler } from '../RapidElement';
import { MediaPicker } from '../mediapicker/MediaPicker';

export class Compose extends FormElement {
  static get styles() {
    return css`
      .container {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;

        border-radius: var(--curvature-widget);
        background: var(--color-widget-bg);
        border: var(--compose-border, 1px solid var(--color-widget-border));
        transition: all ease-in-out var(--transition-speed);
        box-shadow: var(--compose-shadow, var(--widget-box-shadow));
        caret-color: var(--input-caret);
      }

      .chatbox {
        --color-widget-border: none;
        --curvature-widget: var(
          --compose-curvature,
          var(--curvature) var(--curvature) 0px 0px
        );
        --textarea-min-height: var(--textarea-min-height, 4em);
        --widget-box-shadow: none;
        padding: var(--compose-padding, 0px);
      }

      .actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0em;
        background: #f9f9f9;
        border-bottom-left-radius: var(--curvature);
        border-bottom-right-radius: var(--curvature);
        border-top: solid 1px var(--color-widget-border);
      }

      .actions-right {
        display: flex;
        align-items: center;
      }

      temba-charcount {
        margin-right: 5px;
        overflow: hidden;
        --temba-charcount-counts-margin-top: 0px;
        --temba-charcount-summary-margin-top: 0px;
        --temba-charcount-summary-position: fixed;
        --temba-charcount-summary-right: 105px;
        --temba-charcount-summary-bottom: 105px;
      }

      temba-button {
        --button-y: 1px;
        --button-x: 12px;
      }

      .send-error {
        color: rgba(250, 0, 0, 0.75);
        font-size: var(--help-text-size);
      }

      .language {
        margin-bottom: 0.6em;
        display: block;
      }

      .top-right {
        align-items: center;
        display: flex;
      }

      #send-button {
        margin: 0.3em;
      }

      temba-tabs {
        --focused-tab-color: #f4f4f4;
      }

      .quick-replies {
        margin: 0.8em;
      }

      .optins {
        padding: 1em;
      }

      .attachments {
        padding-top: 0.5em;
      }
    `;
  }

  @property({ type: Number })
  index = 1;

  @property({ type: Number })
  maxAttachments = 3;

  @property({ type: Number })
  maxLength = 640;

  @property({ type: Boolean })
  completion: boolean;

  @property({ type: Boolean })
  chatbox: boolean;

  @property({ type: Boolean })
  attachments: boolean;

  @property({ type: Boolean })
  quickReplies: boolean;

  @property({ type: Boolean })
  optIns: boolean;

  @property({ type: Boolean })
  counter: boolean;

  @property({ type: Boolean })
  button: boolean;

  @property({ type: String })
  currentText = '';

  @property({ type: String })
  initialText = '';

  @property({ type: String })
  accept = ''; //e.g. ".xls,.xlsx"

  @property({ type: String, attribute: false })
  endpoint = DEFAULT_MEDIA_ENDPOINT;

  @property({ type: Boolean, attribute: false })
  uploading: boolean;

  @property({ type: Array })
  languages: Language[] = [];

  @property({ type: Array })
  currentAttachments: Attachment[] = [];

  @property({ type: Array })
  currentQuickReplies: { name: string; value: string }[] = [];

  @property({ type: Array })
  currentOptin: { name: string; uuid: string }[] = [];

  @property({ type: String })
  optinEndpoint = '/api/v2/optins.json';

  @property({ type: Array, attribute: false })
  failedAttachments: Attachment[] = [];

  @property({ type: String })
  buttonName = 'Send';

  @property({ type: Boolean, attribute: false })
  buttonDisabled = true;

  @property({ type: String, attribute: false })
  buttonError = '';

  @property({ type: Boolean, attribute: 'widget_only' })
  widgetOnly: boolean;

  @property({ type: Array })
  errors: string[];

  @property({ type: Object })
  langValues: {
    [lang: string]: {
      text: string;
      attachments: Attachment[];
      quick_replies: string[];
      optin?: { name: string; uuid: string };
    };
  } = {};

  @property({ type: String })
  currentLanguage = 'und';

  public constructor() {
    super();
  }

  private isBaseLanguage(): boolean {
    return (
      this.currentLanguage == 'und' ||
      this.currentLanguage == this.languages[0].iso
    );
  }

  private handleTabChanged() {
    const tabs = this.shadowRoot.querySelector('temba-tabs') as TabPane;
    const tab = tabs.getCurrentTab();
    if (tab) {
      // check we are going for the first attachment
      if (tab.icon == 'attachment') {
        if (this.currentAttachments.length == 0) {
          (
            this.shadowRoot.querySelector('temba-media-picker') as MediaPicker
          ).click();
        }
      }
    }
  }

  public getEventHandlers(): EventHandler[] {
    return [
      { event: CustomEventType.ContextChanged, method: this.handleTabChanged }
    ];
  }

  public firstUpdated(changes: Map<string, any>): void {
    super.firstUpdated(changes);

    if (changes.has('languages') && this.languages.length > 0) {
      this.currentLanguage = this.languages[0].iso;
    }

    if (changes.has('value')) {
      this.langValues = this.getDeserializedValue() || {};
    }
    this.setFocusOnChatbox();
  }

  public updated(changes: Map<string, any>): void {
    super.updated(changes);

    if (changes.has('currentLanguage') && this.langValues) {
      let langValue = {
        text: '',
        attachments: [],
        quick_replies: []
      };

      if (this.currentLanguage in this.langValues) {
        langValue = this.langValues[this.currentLanguage];
      }

      this.currentText = langValue.text;
      this.initialText = langValue.text;
      this.currentAttachments = langValue.attachments;
      this.currentQuickReplies = (langValue.quick_replies || []).map(
        (value) => {
          return { name: value, value };
        }
      );
      this.currentOptin = langValue['optin'] ? [langValue['optin']] : [];
      this.setFocusOnChatbox();

      // TODO: this feels like it shouldn't be needed
      const chatbox = this.shadowRoot.querySelector('.chatbox') as any;
      if (chatbox) {
        chatbox.value = this.initialText;
      }
      this.resetTabs();
      this.requestUpdate('currentAttachments');
    }

    if (
      (this.langValues &&
        (changes.has('currentText') ||
          changes.has('currentAttachments') ||
          changes.has('currentQuickReplies'))) ||
      changes.has('currentOptin')
    ) {
      this.toggleButton();

      const trimmed = this.currentText ? this.currentText.trim() : '';
      if (
        trimmed ||
        this.currentAttachments.length > 0 ||
        this.currentQuickReplies.length > 0
      ) {
        this.langValues[this.currentLanguage] = {
          text: trimmed,
          attachments: this.currentAttachments,
          quick_replies: this.currentQuickReplies.map((option) => option.value),
          optin: this.currentOptin.length > 0 ? this.currentOptin[0] : null
        };
      } else {
        delete this.langValues[this.currentLanguage];
      }
      this.fireCustomEvent(CustomEventType.ContentChanged, this.langValues);
      this.requestUpdate('langValues');
      this.setValue(this.langValues);
    }
  }

  private handleAttachmentsChanged(event: CustomEvent) {
    const media = event.target as MediaPicker;
    this.currentAttachments = media.attachments;
    this.requestUpdate();
  }

  private setFocusOnChatbox(): void {
    if (this.chatbox) {
      const completion = this.shadowRoot.querySelector(
        '.chatbox'
      ) as Completion;
      if (completion) {
        window.setTimeout(() => {
          completion.focus();
          // this.resetTabs();
        }, 0);
      }
    }
  }

  public reset(): void {
    (this.shadowRoot.querySelector('.chatbox') as HTMLInputElement).value = '';
    this.initialText = '';
    this.currentText = '';
    this.currentQuickReplies = [];
    this.currentAttachments = [];
    this.failedAttachments = [];
    this.buttonError = '';
  }

  private handleQuickReplyChange() {
    this.requestUpdate('currentQuickReplies');
  }

  private handleOptInChange(event: InputEvent) {
    this.currentOptin = (event.target as any).values;
    this.requestUpdate('optIn');
  }

  private handleChatboxChange(evt: Event) {
    const chatbox = evt.target as HTMLInputElement;
    this.currentText = chatbox.value;
  }

  public toggleButton() {
    if (this.button) {
      this.buttonError = '';
      const chatboxEmpty = this.currentText.trim().length === 0;
      const attachmentsEmpty = this.currentAttachments.length === 0;
      if (this.chatbox && this.attachments) {
        this.buttonDisabled = chatboxEmpty && attachmentsEmpty;
      } else if (this.chatbox) {
        this.buttonDisabled = chatboxEmpty;
      } else if (this.attachments) {
        this.buttonDisabled = attachmentsEmpty;
      } else {
        this.buttonDisabled = true;
      }
    }
  }

  private handleSendClick(evt: Event) {
    evt.stopPropagation();
    this.handleSend();
  }

  private handleSendEnter(evt: KeyboardEvent) {
    if (this.button) {
      if (evt.key === 'Enter' && !evt.shiftKey) {
        if (this.completion) {
          const chat = evt.target as Completion;
          if (!chat.hasVisibleOptions()) {
            this.handleSend();
          }
        } else {
          this.handleSend();
        }
      }
    }
  }

  private handleSend() {
    if (!this.buttonDisabled) {
      this.buttonDisabled = true;
      const name = this.buttonName;
      this.fireCustomEvent(CustomEventType.ButtonClicked, { name });
    }
  }

  private handleLanguageChange(evt: Event) {
    const select = evt.target as Select;
    this.currentLanguage = select.values[0].iso;
  }

  public resetTabs() {
    (this.shadowRoot.querySelector('temba-tabs') as TabPane).index = -1;
  }

  public render(): TemplateResult {
    return html`
      <temba-field
        name=${this.name}
        .errors=${this.errors}
        .widgetOnly=${this.widgetOnly}
        .value=${this.value}
      >
        ${this.languages.length > 1
          ? html`<temba-select
              @change=${this.handleLanguageChange}
              class="language"
              name="language"
              .staticOptions=${this.languages}
              valueKey="iso"
            >
            </temba-select>`
          : null}
        <div class="container">
          ${this.chatbox ? html`${this.getChatbox()}` : null}
          <div class="items actions">${this.getActions()}</div>
        </div>
      </temba-field>
    `;
  }

  private getChatbox(): TemplateResult {
    if (this.completion) {
      return html`<temba-completion
        class="chatbox"
        .value=${this.initialText}
        gsm
        textarea
        autogrow
        maxlength=${this.maxLength}
        @change=${this.handleChatboxChange}
        @keydown=${this.handleSendEnter}
        placeholder="Write something here"
      >
      </temba-completion>`;
    } else {
      return html`<temba-textinput
        class="chatbox"
        gsm
        textarea
        autogrow
        maxlength=${this.maxLength}
        .value=${this.initialText}
        @change=${this.handleChatboxChange}
        @keydown=${this.handleSendEnter}
        placeholder="Write something here"
      >
      </temba-textinput>`;
    }
  }

  private getActions(): TemplateResult {
    const showOptins = this.optIns && this.isBaseLanguage();
    return html`
      <temba-tabs
        embedded
        focusedname
        bottom
        refresh="${this.currentAttachments.length}|${this.index}|${this
          .currentQuickReplies.length}|${showOptins}|${this.currentOptin}"
      >
        ${this.attachments
          ? html`<temba-tab
              name="Attachments"
              icon="attachment"
              .count=${this.currentAttachments.length}
            >
              <div class="items attachments">
                <temba-media-picker
                  accept=${this.accept}
                  max=${this.maxAttachments}
                  attachments=${JSON.stringify(this.currentAttachments)}
                  @change=${this.handleAttachmentsChanged.bind(this)}
                ></temba-media-picker>
              </div>
            </temba-tab>`
          : null}
        ${this.quickReplies
          ? html`<temba-tab
              name="Quick Replies"
              icon="quick_replies"
              .count=${this.currentQuickReplies.length}
            >
              <temba-select
                @change=${this.handleQuickReplyChange}
                .values=${this.currentQuickReplies}
                class="quick-replies"
                tags
                multi
                searchable
                expressions
                placeholder="Add Quick Reply"
              ></temba-select>
            </temba-tab>`
          : null}
        <temba-tab
          name="Opt-in"
          icon="channel_fba"
          ?hidden=${!showOptins}
          ?checked=${this.currentOptin.length > 0}
        >
          <temba-select
            @change=${this.handleOptInChange}
            .values=${this.currentOptin}
            endpoint="${this.optinEndpoint}"
            class="optins"
            searchable
            clearable
            placeholder="Select an opt-in to use for Facebook (optional)"
          ></temba-select>
        </temba-tab>

        <div slot="tab-right" class="top-right">
          ${this.buttonError
            ? html`<div class="send-error">${this.buttonError}</div>`
            : null}
          ${this.counter ? this.getCounter() : null}
          ${this.button ? this.getButton() : null}
        </div>
      </temba-tabs>
    `;
  }

  private getCounter(): TemplateResult {
    return html`<temba-charcount
      .text="${this.currentText}"
    ></temba-charcount>`;
  }

  private getButton(): TemplateResult {
    return html` <temba-button
      id="send-button"
      name=${this.buttonName}
      @click=${this.handleSendClick}
      ?disabled=${this.buttonDisabled}
    ></temba-button>`;
  }
}
