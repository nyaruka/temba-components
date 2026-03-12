import { TemplateResult, html, css, PropertyValues, nothing } from 'lit';
import { FieldElement } from './FieldElement';
import { property } from 'lit/decorators.js';
import { Attachment, CustomEventType, Language, Shortcut } from '../interfaces';
import { DEFAULT_MEDIA_ENDPOINT } from '../utils';
import { Select } from './select/Select';
import { MessageEditor } from './MessageEditor';
import { ShortcutList } from '../list/ShortcutList';
import { setCaretOffset } from '../excellent/caret-utils';
import { Icon } from '../Icons';

export interface ComposeValue {
  text: string;
  attachments: { uuid: string }[];
  quick_replies: string[];
  optin: string;
  template: string;
  variables: string[];
}

export class Compose extends FieldElement {
  static get styles() {
    return css`
      :host {
        border-top-right-radius: var(--curvature);
        border-top-left-radius: var(--curvature);
      }

      .container {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
        border-radius: var(--compose-curvature, var(--curvature-widget));
        background: var(--color-widget-bg);
        border: var(--compose-border, 1px solid var(--color-widget-border));
        transition: all ease-in-out var(--transition-speed);
        box-shadow: var(--compose-shadow, var(--widget-box-shadow));
        caret-color: var(--input-caret);
      }

      .container:focus-within {
        border-color: var(--color-focus);
        box-shadow: var(--widget-box-shadow-focused, 0 0 0 3px rgba(0, 123, 255, 0.25));
      }

      .editor-wrapper {
        --color-widget-border: none;
        --widget-box-shadow: none;
        --widget-box-shadow-focused: none;
        --temba-textinput-padding: 1em 1em;
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .editor-wrapper temba-message-editor {
        flex-grow: 1;
        --color-widget-border: transparent;
        --widget-box-shadow: none;
        --widget-box-shadow-focused: none;
        --color-focus: transparent;
      }

      .language {
        margin-bottom: 0.6em;
        display: block;
      }

      .send-error {
        color: rgba(250, 0, 0, 0.75);
        font-size: var(--help-text-size);
        padding: 0.5em;
      }

      .quick-replies {
        margin: 0.2em;
      }

      .optins {
        margin: 0.2em;
      }

      .templates {
        margin: 0.2em;
      }

      temba-accordion {
        margin-top: 0.5em;
      }

      .shortcut-overlay {
        position: fixed;
        margin-top: 4px;
        display: flex;
        flex-direction: row;
        align-items: stretch;
        --options-block-shadow: none;
        --curvature-widget: 0px;
        --color-options-bg: #fff;
        border: 1px solid var(--color-widget-border);
        border-radius: 6px;
        background: var(--color-widget-bg, #fff);
        box-shadow: var(--options-shadow);
        z-index: 1000003;
        overflow: hidden;
      }

      temba-shortcuts {
        flex-grow: 1;
      }

      .shortcut-icon {
        color: #888;
        background: rgba(0, 0, 0, 0.04);
        border-radius: 8px;
        transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out;
      }

      .shortcut-icon:hover {
        color: var(--color-text-dark);
        background: rgba(0, 0, 0, 0.08);
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

  @property({ type: String, attribute: 'template-warning' })
  templateWarning: string;

  @property({ type: Boolean })
  counter: boolean;

  @property({ type: Boolean })
  autogrow: boolean;

  @property({ type: Number, attribute: 'min-height' })
  minHeight = 150;

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

  @property({ type: Boolean })
  hasPendingText = false;

  @property({ type: Object })
  activeShortcut: Shortcut;

  @property({ type: Boolean, attribute: false })
  showShortcuts = false;

  private shortcutAnchor: { top: number; left: number } = null;
  private shortcutFilter: string = null;
  private shortcutViaIcon = false;
  private lastCaretPosition: number = 0;
  private lastCaretScreenPosition: { top: number; left: number } = null;

  public constructor() {
    super();
  }

  private isBaseLanguage(): boolean {
    return (
      this.currentLanguage == 'und' ||
      this.currentLanguage == this.languages[0].iso
    );
  }

  public willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);

    if (changed.has('languages') && this.languages.length > 0) {
      this.currentLanguage = this.languages[0].iso;
    }

    if (changed.has('value')) {
      this.langValues = this.getDeserializedValue() || {};
      this.variables = this.langValues[this.currentLanguage]?.variables || [];
      this.template = this.langValues[this.currentLanguage]?.template || null;
    }

    if (changed.has('currentLanguage') && this.langValues) {
      let langValue = {
        text: '',
        attachments: [],
        quick_replies: []
      };

      if (this.currentLanguage in this.langValues) {
        langValue = this.langValues[this.currentLanguage];
      }

      this.currentText = langValue.text || '';
      this.initialText = langValue.text || '';
      this.currentAttachments = langValue.attachments || [];
      this.currentQuickReplies = (langValue.quick_replies || []).map(
        (value) => {
          return { name: value, value };
        }
      );
      this.currentOptin = langValue['optin'] ? [langValue['optin']] : [];
    }

    if (
      this.langValues &&
      (changed.has('currentText') ||
        changed.has('currentAttachments') ||
        changed.has('currentQuickReplies') ||
        changed.has('currentOptin') ||
        changed.has('currentTemplate') ||
        changed.has('variables'))
    ) {
      this.checkIfEmpty();

      const trimmed = this.currentText ? this.currentText.trim() : '';
      if (
        trimmed ||
        (this.currentAttachments || []).length > 0 ||
        this.currentQuickReplies.length > 0 ||
        this.currentOptin.length > 0 ||
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
      this.setValue(this.langValues);
    }
  }

  connectedCallback() {
    super.connectedCallback();
    // Make the compose host focusable so clicks on it set activeElement
    if (!this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '-1');
    }
    this.addEventListener('keydown', this.handleHostKeyDown as EventListener);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.handleHostKeyDown as EventListener);
  }

  private handleShortcutIconClick() {
    if (this.showShortcuts) {
      this.showShortcuts = false;
      return;
    }

    // Use saved caret screen position since clicking the icon steals focus
    if (this.lastCaretScreenPosition) {
      this.shortcutAnchor = this.lastCaretScreenPosition;
    }
    this.shortcutFilter = '';
    this.shortcutViaIcon = true;
    this.showShortcuts = true;
    this.updateComplete.then(() => {
      const shortcuts = this.shadowRoot.querySelector(
        'temba-shortcuts'
      ) as ShortcutList;
      if (shortcuts) {
        shortcuts.filter = '';
        shortcuts.showSearch = true;
        shortcuts.updateComplete.then(() => {
          shortcuts.focusSearch();
        });
      }
    });
  }

  private handleHostKeyDown = (evt: KeyboardEvent) => {
    if (evt.key === 'Escape' && this.showShortcuts) {
      evt.preventDefault();
      evt.stopPropagation();
      this.showShortcuts = false;
      return;
    }

    if (evt.key === 'Enter' && !evt.shiftKey) {
      if (this.showShortcuts) {
        return;
      }
      const editor = this.getMessageEditor();
      if (editor) {
        const richEdit = editor.getRichEditor();
        if (richEdit && richEdit.hasVisibleOptions()) {
          return;
        }
      }
      evt.preventDefault();
      evt.stopPropagation();
      this.triggerSend();
    }
  };

  public firstUpdated(changes: PropertyValues): void {
    super.firstUpdated(changes);
    this.setFocusOnEditor();
  }

  public updated(changes: Map<string, any>): void {
    super.updated(changes);

    if (changes.has('currentLanguage') && this.langValues) {
      this.setFocusOnEditor();

      const editor = this.getMessageEditor();
      if (editor) {
        const richEdit = editor.getRichEditor();
        if (richEdit) {
          richEdit.value = this.initialText;
        }
      }
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
      this.fireCustomEvent(CustomEventType.ContentChanged, this.langValues);
    }
  }

  private handleLoading(event: CustomEvent) {
    this.uploading = event.detail.loading;
  }

  private handleAttachmentsChanged(event: CustomEvent) {
    if (event.detail && event.detail.attachments) {
      this.currentAttachments = event.detail.attachments;
    }
    this.requestUpdate();
  }

  private setFocusOnEditor(): void {
    const editor = this.getMessageEditor();
    if (editor) {
      window.setTimeout(() => {
        editor.focus();
      }, 0);
    }
  }

  public reset(): void {
    const editor = this.getMessageEditor();
    if (editor) {
      const richEdit = editor.getRichEditor();
      if (richEdit) {
        const textInput = richEdit.getTextInput();
        textInput.updateValue('');
        richEdit.fireEvent('change');
      }
      this.initialText = '';
      this.currentText = '';
      this.currentQuickReplies = [];
      this.currentAttachments = [];
      this.showShortcuts = false;
    }
  }

  private handleQuickReplyChange() {
    this.requestUpdate('currentQuickReplies');
  }

  private handleOptInChange(event: InputEvent) {
    this.currentOptin = (event.target as any).values;
    this.requestUpdate('currentOptin');
  }

  private handleEditorChange(evt: Event) {
    const richEdit = (evt.target as MessageEditor).getRichEditor();
    if (!richEdit) return;

    this.currentText = richEdit.value || '';
    this.hasPendingText = this.currentText.length > 0;

    // Track caret for shortcut icon click
    this.lastCaretPosition = richEdit.getCaretPosition();
    const screenPos = richEdit.getCaretScreenPosition();
    if (screenPos) {
      this.lastCaretScreenPosition = screenPos;
    }

    // Detect / at beginning of line for shortcuts
    if (this.shortcuts) {
      const text = this.currentText;
      const cursor = richEdit.getCaretPosition();
      const lineStart = text.lastIndexOf('\n', cursor - 1) + 1;
      const line = text.substring(lineStart, cursor);

      if (line.startsWith('/')) {
        if (!this.showShortcuts) {
          const caretPos = richEdit.getCaretScreenPosition();
          if (caretPos) {
            this.shortcutAnchor = caretPos;
          }
          this.shortcutViaIcon = false;
        }
        this.shortcutFilter = line.substring(1);
        this.showShortcuts = true;
        this.updateComplete.then(() => {
          const shortcuts = this.shadowRoot.querySelector(
            'temba-shortcuts'
          ) as ShortcutList;
          if (shortcuts) {
            shortcuts.showSearch = false;
            shortcuts.filter = this.shortcutFilter;
          }
        });
      } else {
        this.showShortcuts = false;
      }
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

  private handleKeyDown(evt: KeyboardEvent) {
    if (evt.key === 'Backspace' && this.shortcuts && this.showShortcuts) {
      // Check if we're deleting the / trigger
      const editor = this.getMessageEditor();
      if (editor) {
        const richEdit = editor.getRichEditor();
        if (richEdit) {
          const text = richEdit.getText();
          const cursor = richEdit.getCaretPosition();
          const lineStart = text.lastIndexOf('\n', cursor - 1) + 1;
          const line = text.substring(lineStart, cursor);
          if (line === '/') {
            this.showShortcuts = false;
          }
        }
      }
    }
  }

  public triggerSend() {
    this.checkIfEmpty();
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

  private getShortcutOverlayStyle(): string {
    const container = this.shadowRoot?.querySelector('.container');
    if (!container) return '';
    const rect = container.getBoundingClientRect();
    const margin = 16;
    const top = this.shortcutAnchor
      ? this.shortcutAnchor.top
      : rect.top + 30;
    const maxHeight = window.innerHeight - top - margin;
    return `left: ${rect.left}px; top: ${top}px; width: ${rect.width}px; max-height: ${maxHeight}px;`;
  }

  private getMessageEditor(): MessageEditor {
    return this.shadowRoot.querySelector(
      'temba-message-editor'
    ) as MessageEditor;
  }

  public handleShortcutSelection(event: CustomEvent) {
    this.activeShortcut = event.detail.selected;
    const editor = this.getMessageEditor();
    if (!editor) return;

    const richEdit = editor.getRichEditor();
    if (!richEdit) return;

    const text = richEdit.getText();
    const cursor = richEdit.getCaretPosition() || this.lastCaretPosition;

    // Find current line
    const lineStart = text.lastIndexOf('\n', cursor - 1) + 1;
    let lineEnd = text.indexOf('\n', lineStart);
    if (lineEnd === -1) lineEnd = text.length;
    const line = text.substring(lineStart, lineEnd);

    // Build the new text with shortcut replacing the /command line
    let newText: string;
    let newCursor: number;
    if (line.startsWith('/')) {
      const before = text.substring(0, lineStart);
      const after = text.substring(lineEnd);
      newText = before + this.activeShortcut.text + after;
      newCursor = lineStart + this.activeShortcut.text.length;
    } else {
      newText =
        text.substring(0, cursor) +
        this.activeShortcut.text +
        text.substring(cursor);
      newCursor = cursor + this.activeShortcut.text.length;
    }

    // Update the rendered content and fire change so the char counter
    // and form value pick up the new text
    const textInput = richEdit.getTextInput();
    textInput.updateValue(newText);
    richEdit.fireEvent('change');

    // Restore focus and place cursor at end of inserted text
    const editableDiv = richEdit.inputElement;
    if (editableDiv) {
      editableDiv.focus();
      setCaretOffset(editableDiv, newCursor);
    }

    this.showShortcuts = false;
  }

  private handleTemplateChanged(evt: CustomEvent) {
    this.currentTemplate = evt.detail.template;
    this.locale = evt.detail.translation?.locale;
    this.requestUpdate();
  }

  private handleTemplateVariablesChanged(evt: CustomEvent) {
    this.variables = [...evt.detail.variables];
  }

  public render(): TemplateResult {
    return this.renderField();
  }

  protected renderWidget(): TemplateResult {
    const showOptins = this.optIns && this.isBaseLanguage();
    const showTemplates = this.templates && this.isBaseLanguage();
    const hasAccordionSections =
      this.quickReplies || showOptins || showTemplates;

    return html`
      <div>
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
          <div class="editor-wrapper">
            <temba-message-editor
              .value=${this.initialText}
              .attachments=${this.currentAttachments}
              attachment-format="object"
              accept=${this.accept}
              max-attachments=${this.maxAttachments}
              endpoint=${this.endpoint}
              placeholder="Write something here"
              gsm
              textarea
              minHeight=${this.minHeight}
              ?autogrow=${this.autogrow}
              ?disableCompletion=${!this.completion}
              counter=${this.counter ? 'true' : nothing}
              @change=${this.handleEditorChange}
              @keydown=${this.handleKeyDown}
              @temba-content-changed=${this.handleAttachmentsChanged}
              @loading=${this.handleLoading}
            >
              ${this.shortcuts
                ? html`<temba-icon
                    slot="icons"
                    class="shortcut-icon"
                    name=${Icon.shortcut}
                    size="1"
                    @click=${this.handleShortcutIconClick}
                  ></temba-icon>`
                : null}
            </temba-message-editor>
          </div>

          ${this.shortcuts && this.showShortcuts
            ? html`<div class="shortcut-overlay" style=${this.getShortcutOverlayStyle()}>
                <temba-shortcuts
                  @temba-selection=${this.handleShortcutSelection}
                ></temba-shortcuts>
              </div>`
            : null}
        </div>
        ${hasAccordionSections
          ? html`<temba-accordion>
              ${this.quickReplies
                ? html`<temba-accordion-section
                    label="Quick Replies"
                    .count=${this.currentQuickReplies.length}
                  >
                    <temba-select
                      @change=${this.handleQuickReplyChange}
                      .values=${this.currentQuickReplies}
                      maxItems=${this.maxQuickReplies}
                      maxItemsText="You can only add ${this
                        .maxQuickReplies} Quick Replies"
                      class="quick-replies"
                      tags
                      multi
                      searchable
                      expressions
                      placeholder="Add Quick Reply"
                    ></temba-select>
                  </temba-accordion-section>`
                : null}
              ${showTemplates
                ? html`<temba-accordion-section
                    label="WhatsApp Template"
                    ?checked=${!!this.currentTemplate}
                    ?hasError=${this.errors &&
                    !!this.errors.find((error) => error.includes('template'))}
                  >
                    <temba-template-editor
                      class="templates"
                      @temba-context-changed=${this.handleTemplateChanged}
                      @temba-content-changed=${this
                        .handleTemplateVariablesChanged}
                      template=${this.template}
                      variables=${JSON.stringify(this.variables)}
                      url=${this.templateEndpoint}
                      lang=${this.currentLanguage}
                      template-warning=${this.templateWarning || nothing}
                    >
                    </temba-template-editor>
                  </temba-accordion-section>`
                : null}
              ${showOptins
                ? html`<temba-accordion-section
                    label="Facebook Opt-in"
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
                  </temba-accordion-section>`
                : null}
            </temba-accordion>`
          : null}
      </div>
    `;
  }
}
