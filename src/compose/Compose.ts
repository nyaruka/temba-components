import { TemplateResult, html, css } from 'lit';
import { FormElement } from '../FormElement';
import { property } from 'lit/decorators.js';
import { Attachment, CustomEventType, Language, Shortcut } from '../interfaces';
import { DEFAULT_MEDIA_ENDPOINT, getClasses } from '../utils';
import { Completion } from '../completion/Completion';
import { Select } from '../select/Select';
import { TabPane } from '../tabpane/TabPane';
import { MediaPicker } from '../mediapicker/MediaPicker';
import { Tab } from '../tabpane/Tab';
import { TextInput } from '../textinput/TextInput';
import { ShortcutList } from '../list/ShortcutList';

export interface ComposeValue {
  text: string;
  attachments: { uuid: string }[];
  quick_replies: string[];
  optin: string;
  template: string;
  variables: string[];
}

export class Compose extends FormElement {
  static get styles() {
    return css`
      :host {
        overflow: hidden;
        border-top-right-radius: var(--curvature);
        border-top-left-radius: var(--curvature);
      }

      .active-template .chatbox {
        display: none;
      }

      .active-template .actions {
        border: none;
      }

      .container {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
        overflow: hidden;
        border-radius: var(--compose-curvature, var(--curvature-widget));
        background: var(--color-widget-bg);
        border: var(--compose-border, 1px solid var(--color-widget-border));
        transition: all ease-in-out var(--transition-speed);
        box-shadow: var(--compose-shadow, var(--widget-box-shadow));
        caret-color: var(--input-caret);
        --color-widget-bg-focused: transparent;
        --color-widget-bg: transparent;
      }

      .chatbox {
        --color-widget-border: none;
        --curvature-widget: var(
          --compose-curvature,
          var(--curvature) var(--curvature) 0px 0px
        );

        --widget-box-shadow: none;
        display: block;
        flex-grow: 1;
        --widget-box-shadow-focused: none;
        --temba-textinput-padding: 1em 1em;
      }

      .actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0em;
        background: #f9f9f9;
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

      .send-error {
        color: rgba(250, 0, 0, 0.75);
        font-size: var(--help-text-size);
        padding: 0.5em;
      }

      .language {
        margin-bottom: 0.6em;
        display: block;
      }

      .top-right {
        align-items: center;
        display: flex;
      }

      .gutter {
        align-items: center;
        display: flex;
        margin: 0.5em;
      }

      temba-tabs {
        --temba-tabs-border-bottom: none;
        --temba-tabs-border-left: none;
        --temba-tabs-border-right: none;
        --temba-tabs-options-padding: 0.25em 0 0 0.25em;
      }

      temba-completion {
        --textarea-min-height: 8em;
      }

      .quick-replies {
        margin: 0.8em;
      }

      .optins {
        margin: 0.8em;
      }

      .templates {
        margin: 0.8em;
      }

      .attachments {
        min-height: 5em;
        padding: 0.2em;
        align-items: center;
        display: flex;
        background: #f9f9f9;
        border-radius: var(--curvature);
        margin: 0.6em;
        margin-bottom: 0em;
      }

      .pane-bottom {
        border: 0px solid red;
        --color-placeholder: rgba(0, 0, 0, 0.2);
        flex-grow: 99;
      }

      .shortcut-wrapper {
        max-height: var(--shortcuts-height, 12em);
        display: flex;
        flex-direction: row;
        align-items: stretch;
        --options-block-shadow: none;
        --curvature-widget: 0px;
        --color-options-bg: #fff;
        border-bottom: 1px solid var(--color-widget-border);
      }

      temba-shortcuts {
        flex-grow: 1;
      }

      .quick-replies {
        background: #f9f9f9;
      }
    `;
  }

  @property({ type: Number })
  index = 1;

  @property({ type: Number })
  maxAttachments = 3;

  @property({ type: Number })
  maxLength = 640;

  @property({ type: Number })
  maxQuickReplies = 10;

  @property({ type: Boolean })
  completion: boolean;

  @property({ type: Boolean })
  attachments: boolean;

  @property({ type: Boolean })
  quickReplies: boolean;

  @property({ type: Boolean })
  optIns: boolean;

  @property({ type: Boolean })
  templates: boolean;

  @property({ type: Boolean })
  counter: boolean;

  @property({ type: Boolean })
  autogrow: boolean;

  @property({ type: Boolean })
  shortcuts: boolean;

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

  @property({ type: Array })
  variables: string[] = [];

  @property({ type: String })
  template: string;

  @property({ type: Object })
  currentTemplate: { name: string; uuid: string };

  // locale for the template
  @property({ type: String })
  locale: string;

  @property({ type: String })
  optinEndpoint = '/api/v2/optins.json';

  @property({ type: String })
  templateEndpoint = '/api/internal/templates.json';

  @property({ type: Boolean, attribute: false })
  empty = true;

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
      template?: string;
      variables?: string[];
      locale?: string;
    };
  } = {};

  @property({ type: String })
  currentLanguage = 'und';

  @property({ type: Object })
  currentTab: Tab;

  @property({ type: Boolean })
  hasPendingText = false;

  @property({ type: Object })
  activeShortcut: Shortcut;

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
    this.currentTab = tabs.getCurrentTab();
    if (this.currentTab && this.currentTab.name === 'Shortcuts') {
      const shortcuts = this.shadowRoot.querySelector(
        'temba-shortcuts'
      ) as ShortcutList;
      shortcuts.filter = '';
    }
    this.setFocusOnChatbox();
  }

  public firstUpdated(changes: Map<string, any>): void {
    super.firstUpdated(changes);

    if (changes.has('languages') && this.languages.length > 0) {
      this.currentLanguage = this.languages[0].iso;
    }

    if (changes.has('value')) {
      this.langValues = this.getDeserializedValue() || {};
      this.variables = this.langValues[this.currentLanguage]?.variables || [];
      this.template = this.langValues[this.currentLanguage]?.template || null;
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
      changes.has('currentOptin') ||
      changes.has('currentTemplate') ||
      changes.has('variables')
    ) {
      this.checkIfEmpty();

      const trimmed = this.currentText ? this.currentText.trim() : '';
      if (
        trimmed ||
        (this.currentAttachments || []).length > 0 ||
        this.currentQuickReplies.length > 0 ||
        this.variables.length > 0
      ) {
        this.langValues[this.currentLanguage] = {
          text: trimmed,
          attachments: this.currentAttachments,
          quick_replies: this.currentQuickReplies.map((option) => option.value),
          optin: this.currentOptin.length > 0 ? this.currentOptin[0] : null,
          template: this.currentTemplate ? this.currentTemplate.uuid : null,
          variables: this.variables,
          locale: this.locale
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
    const completion = this.shadowRoot.querySelector('.chatbox') as Completion;
    if (completion) {
      window.setTimeout(() => {
        completion.focus();
      }, 0);
    }
  }

  public reset(): void {
    const completion = this.shadowRoot.querySelector('.chatbox') as Completion;
    if (completion) {
      completion.textInputElement.value = '';
      completion.value = '';
      this.initialText = '';
      this.currentText = '';
      this.currentQuickReplies = [];
      this.currentAttachments = [];
      this.resetTabs();
    }
  }

  private handleQuickReplyChange() {
    this.requestUpdate('currentQuickReplies');
  }

  private handleOptInChange(event: InputEvent) {
    this.currentOptin = (event.target as any).values;
    this.requestUpdate('optIn');
  }

  private handleChatboxChange(evt: Event) {
    const chatbox = evt.target as Completion;
    const inputElement = chatbox.getTextInput().inputElement;

    this.currentText = inputElement.value;
    this.hasPendingText = inputElement.value.length > 0;

    // is the last character a / and is it at the beginning of the line
    const cursor = inputElement.selectionStart;
    const text = inputElement.value;
    const lineStart = text.lastIndexOf('\n', cursor - 1) + 1;
    const line = text.substring(lineStart, cursor);

    if (line.startsWith('/')) {
      // switch to the shortcuts tab
      if (this.currentTab.name !== 'Shortcuts') {
        this.getTabs().focusTab('Shortcuts');
      }
      const shortcuts = this.shadowRoot.querySelector(
        'temba-shortcuts'
      ) as ShortcutList;
      shortcuts.filter = line.substring(1);
    }
  }

  public checkIfEmpty() {
    const chatboxEmpty = this.currentText.trim().length === 0;
    const attachmentsEmpty = this.currentAttachments.length === 0;
    if (this.attachments) {
      this.empty = chatboxEmpty && attachmentsEmpty;
    } else {
      this.empty = chatboxEmpty;
    }
  }

  private getCurrentLine(): { text: string; index: number } {
    const chatbox = this.shadowRoot.querySelector('.chatbox') as Completion;

    const cursor = chatbox.getTextInput().inputElement.selectionStart - 1;
    const text = chatbox.value;
    const start = text.substring(0, cursor).lastIndexOf('\n') + 1;

    let end = chatbox.value.indexOf('\n', start);
    if (end === -1) {
      end = chatbox.value.length;
    }

    return { text: chatbox.value.substring(start, end), index: start };
  }

  private handleKeyDown(evt: KeyboardEvent) {
    const tabs = this.shadowRoot.querySelector('temba-tabs') as TabPane;
    const num = parseInt(evt.key);
    if (
      !Number.isNaN(num) &&
      num > 0 &&
      evt.ctrlKey &&
      evt.metaKey &&
      num <= tabs.options.length
    ) {
      tabs.index = num - 1;
    }

    if (evt.key === 'Backspace') {
      const line = this.getCurrentLine();
      const text = line.text;
      if (text === '/') {
        tabs.focusTab('Reply');
      }
    }

    if (this.currentTab.name === 'Shortcuts') {
      if (evt.key === 'Enter' && !evt.shiftKey) {
        return;
      }
    }

    if (evt.key === 'Enter') {
      if (!evt.shiftKey) {
        evt.preventDefault();
        if (this.completion) {
          const chat = evt.target as Completion;
          if (!chat.hasVisibleOptions()) {
            this.triggerSend();
          }
        } else {
          this.triggerSend();
        }
      }
    }
  }

  public triggerSend() {
    if (!this.empty) {
      this.fireCustomEvent(CustomEventType.Submitted, {
        langValues: this.langValues
      });
    }
  }

  private handleLanguageChange(evt: Event) {
    const select = evt.target as Select<any>;
    this.currentLanguage = select.values[0].iso;
  }

  public resetTabs() {
    this.getTabs().focusTab('Reply');
  }

  public getTabs(): TabPane {
    return this.shadowRoot.querySelector('temba-tabs') as TabPane;
  }

  public render(): TemplateResult {
    return html`
      <temba-field
        name=${this.name}
        .errors=${this.errors}
        .widgetOnly=${this.widgetOnly}
        .value=${this.value}
        class=${getClasses({
          'active-template':
            !!this.currentTemplate &&
            this.currentTab &&
            this.currentTab.name === 'Template'
        })}
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
          <div class="items actions">${this.getActions()}</div>
        </div>
      </temba-field>
    `;
  }

  private handleTemplateChanged(evt: CustomEvent) {
    this.currentTemplate = evt.detail.template;
    this.locale = evt.detail.translation?.locale;
    this.requestUpdate();
  }

  private handleTemplateVariablesChanged(evt: CustomEvent) {
    this.variables = [...evt.detail.variables];
  }

  public getTextInput(): TextInput {
    return (
      this.shadowRoot.querySelector('.chatbox') as Completion
    ).getTextInput();
  }

  public handleShortcutSelection(event: CustomEvent) {
    this.activeShortcut = event.detail.selected;
    const line = this.getCurrentLine();
    const chatbox = this.getTextInput();

    const originalText = chatbox.value;

    if (line.text.startsWith('/')) {
      const newText =
        originalText.substring(0, line.index) +
        this.activeShortcut.text +
        originalText.substring(line.index + line.text.length);

      chatbox.updateValue(newText);

      // set our cursor to the end of the shortcut
      const cursor = line.index + this.activeShortcut.text.length;
      chatbox.inputElement.setSelectionRange(cursor, cursor);
    } else {
      // add the text where the cursor is
      const cursor = chatbox.inputElement.selectionStart;
      const newText =
        originalText.substring(0, cursor) +
        this.activeShortcut.text +
        originalText.substring(cursor);
      chatbox.updateValue(newText);

      // set the cursor to the end of the shortcut text
      const newCursor = cursor + this.activeShortcut.text.length;
      chatbox.inputElement.setSelectionRange(newCursor, newCursor);
    }

    const tabs = this.shadowRoot.querySelector('temba-tabs') as TabPane;
    tabs.index = tabs.options.findIndex((tab) => tab.name === 'Reply');
  }

  private getActions(): TemplateResult {
    const showOptins = this.optIns && this.isBaseLanguage();
    const showTemplates = this.templates && this.isBaseLanguage();
    return html`
      <temba-tabs
        focusedname
        @temba-context-changed=${this.handleTabChanged}
        refresh="${(this.currentAttachments || []).length}|${this.index}|${this
          .currentQuickReplies.length}|${showOptins}|${this
          .currentOptin}|${showTemplates}|${this.currentTemplate}"
      >
        <temba-tab
          name="Reply"
          icon="message"
          selectionBackground="#fff"
        ></temba-tab>
        ${this.attachments
          ? html`<temba-tab
              name="Attachments"
              icon="attachment"
              selectionBackground="#fff"
              .count=${(this.currentAttachments || []).length}
            >
              <div class="items attachments">
                <temba-media-picker
                  accept=${this.accept}
                  max=${this.maxAttachments}
                  attachments=${JSON.stringify(this.currentAttachments || [])}
                  @change=${this.handleAttachmentsChanged.bind(this)}
                ></temba-media-picker>
              </div>
            </temba-tab>`
          : null}
        ${this.quickReplies
          ? html`<temba-tab
              name="Quick Replies"
              icon="quick_replies"
              selectionBackground="#fff"
              .count=${this.currentQuickReplies.length}
            >
              <temba-select
                @change=${this.handleQuickReplyChange}
                .values=${this.currentQuickReplies}
                maxitems=${this.maxQuickReplies}
                class="quick-replies"
                tags
                multi
                searchable
                expressions
                placeholder="Add Quick Reply"
              ></temba-select>
            </temba-tab>`
          : null}
        ${showOptins
          ? html`<temba-tab
              name="Opt-in"
              icon="channel_fba"
              selectionBackground="#fff"
              ?hidden=${!showOptins}
              ?checked=${this.currentOptin.length > 0}
            >
              <temba-select
                @change=${this.handleOptInChange}
                .values=${this.currentOptin}
                endpoint="${this.optinEndpoint}"
                valueKey="uuid"
                class="optins"
                searchable
                clearable
                placeholder="Select an opt-in to use for Facebook (optional)"
              ></temba-select>
            </temba-tab>`
          : null}
        ${showTemplates
          ? html`<temba-tab
              name="Template"
              icon="channel_wa"
              selectionBackground="#fff"
              ?alert=${this.errors &&
              this.errors.find((error) => error.includes('template'))}
              ?hidden=${!showTemplates}
              ?checked=${this.currentTemplate}
            >
              <temba-template-editor
                class="templates"
                @temba-context-changed=${this.handleTemplateChanged}
                @temba-content-changed=${this.handleTemplateVariablesChanged}
                template=${this.template}
                variables=${JSON.stringify(this.variables)}
                url=${this.templateEndpoint}
                lang=${this.currentLanguage}
              >
              </temba-template-editor>
            </temba-tab>`
          : null}

        <!--temba-tab
          name="Note"
          icon="notes"
          activityColor="#ffbd00"
          selectionBackground="#fff9c2"
          borderColor="#ebdf6f"
        ></temba-tab-->

        ${this.shortcuts
          ? html`<temba-tab
              name="Shortcuts"
              icon="shortcut"
              selectionBackground="#fff"
            >
              <div class="shortcut-wrapper">
                <temba-shortcuts
                  @temba-selection=${this.handleShortcutSelection}
                ></temba-shortcuts>
              </div>
            </temba-tab>`
          : null}

        <div slot="tab-right" class="top-right">
          ${this.counter ? this.getCounter() : null}
        </div>

        <div
          slot="pane-bottom"
          class="pane-bottom ${this.hasPendingText ? 'pending' : ''}"
        >
          <temba-completion
            class="chatbox"
            .value=${this.initialText}
            gsm
            textarea
            ?disableCompletion=${!this.completion}
            ?autogrow=${this.autogrow}
            maxlength=${this.maxLength}
            @change=${this.handleChatboxChange}
            @keydown=${this.handleKeyDown}
            placeholder="Write something here"
          >
          </temba-completion>
        </div>
      </temba-tabs>
    `;
  }

  private getCounter(): TemplateResult {
    return html`<temba-charcount
      .text="${this.currentText}"
    ></temba-charcount>`;
  }
}
