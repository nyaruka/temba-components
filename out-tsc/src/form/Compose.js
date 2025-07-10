import { __decorate } from "tslib";
import { html, css } from 'lit';
import { FormElement } from './FormElement';
import { property } from 'lit/decorators.js';
import { CustomEventType } from '../interfaces';
import { DEFAULT_MEDIA_ENDPOINT, getClasses } from '../utils';
export class Compose extends FormElement {
    static get styles() {
        return css `
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
    `;
    }
    constructor() {
        super();
        this.index = 1;
        this.maxAttachments = 3;
        this.maxLength = 640;
        this.maxQuickReplies = 10;
        this.currentText = '';
        this.initialText = '';
        this.accept = ''; //e.g. ".xls,.xlsx"
        this.endpoint = DEFAULT_MEDIA_ENDPOINT;
        this.languages = [];
        this.currentAttachments = [];
        this.currentQuickReplies = [];
        this.currentOptin = [];
        this.variables = [];
        this.optinEndpoint = '/api/v2/optins.json';
        this.templateEndpoint = '/api/internal/templates.json';
        this.empty = true;
        this.langValues = {};
        this.currentLanguage = 'und';
        this.hasPendingText = false;
    }
    isBaseLanguage() {
        return (this.currentLanguage == 'und' ||
            this.currentLanguage == this.languages[0].iso);
    }
    handleTabChanged() {
        const tabs = this.shadowRoot.querySelector('temba-tabs');
        this.currentTab = tabs.getCurrentTab();
        if (this.currentTab && this.currentTab.name === 'Shortcuts') {
            const shortcuts = this.shadowRoot.querySelector('temba-shortcuts');
            shortcuts.filter = '';
        }
        this.setFocusOnChatbox();
    }
    firstUpdated(changes) {
        var _a, _b;
        super.firstUpdated(changes);
        if (changes.has('languages') && this.languages.length > 0) {
            this.currentLanguage = this.languages[0].iso;
        }
        if (changes.has('value')) {
            this.langValues = this.getDeserializedValue() || {};
            this.variables = ((_a = this.langValues[this.currentLanguage]) === null || _a === void 0 ? void 0 : _a.variables) || [];
            this.template = ((_b = this.langValues[this.currentLanguage]) === null || _b === void 0 ? void 0 : _b.template) || null;
        }
        this.setFocusOnChatbox();
    }
    updated(changes) {
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
            this.currentQuickReplies = (langValue.quick_replies || []).map((value) => {
                return { name: value, value };
            });
            this.currentOptin = langValue['optin'] ? [langValue['optin']] : [];
            this.setFocusOnChatbox();
            // TODO: this feels like it shouldn't be needed
            const chatbox = this.shadowRoot.querySelector('.chatbox');
            if (chatbox) {
                chatbox.value = this.initialText;
            }
            this.resetTabs();
            this.requestUpdate('currentAttachments');
        }
        if ((this.langValues &&
            (changes.has('currentText') ||
                changes.has('currentAttachments') ||
                changes.has('currentQuickReplies'))) ||
            changes.has('currentOptin') ||
            changes.has('currentTemplate') ||
            changes.has('variables')) {
            this.checkIfEmpty();
            const trimmed = this.currentText ? this.currentText.trim() : '';
            if (trimmed ||
                (this.currentAttachments || []).length > 0 ||
                this.currentQuickReplies.length > 0 ||
                this.variables.length > 0) {
                this.langValues[this.currentLanguage] = {
                    text: trimmed,
                    attachments: this.currentAttachments,
                    quick_replies: this.currentQuickReplies.map((option) => option.value),
                    optin: this.currentOptin.length > 0 ? this.currentOptin[0] : null,
                    template: this.currentTemplate ? this.currentTemplate.uuid : null,
                    variables: this.variables,
                    locale: this.locale
                };
            }
            else {
                delete this.langValues[this.currentLanguage];
            }
            this.fireCustomEvent(CustomEventType.ContentChanged, this.langValues);
            this.requestUpdate('langValues');
            this.setValue(this.langValues);
        }
    }
    handleAttachmentsChanged(event) {
        const media = event.target;
        this.currentAttachments = media.attachments;
        this.requestUpdate();
    }
    setFocusOnChatbox() {
        const completion = this.shadowRoot.querySelector('.chatbox');
        if (completion) {
            window.setTimeout(() => {
                completion.focus();
            }, 0);
        }
    }
    reset() {
        const completion = this.shadowRoot.querySelector('.chatbox');
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
    handleQuickReplyChange() {
        this.requestUpdate('currentQuickReplies');
    }
    handleOptInChange(event) {
        this.currentOptin = event.target.values;
        this.requestUpdate('optIn');
    }
    handleChatboxChange(evt) {
        const chatbox = evt.target;
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
            const shortcuts = this.shadowRoot.querySelector('temba-shortcuts');
            shortcuts.filter = line.substring(1);
        }
    }
    checkIfEmpty() {
        const chatboxEmpty = this.currentText.trim().length === 0;
        const attachmentsEmpty = this.currentAttachments.length === 0;
        if (this.attachments) {
            this.empty = chatboxEmpty && attachmentsEmpty;
        }
        else {
            this.empty = chatboxEmpty;
        }
    }
    getCurrentLine() {
        const chatbox = this.shadowRoot.querySelector('.chatbox');
        const cursor = chatbox.getTextInput().inputElement.selectionStart - 1;
        const text = chatbox.value;
        const start = text.substring(0, cursor).lastIndexOf('\n') + 1;
        let end = chatbox.value.indexOf('\n', start);
        if (end === -1) {
            end = chatbox.value.length;
        }
        return { text: chatbox.value.substring(start, end), index: start };
    }
    handleKeyDown(evt) {
        const tabs = this.shadowRoot.querySelector('temba-tabs');
        const num = parseInt(evt.key);
        if (!Number.isNaN(num) &&
            num > 0 &&
            evt.ctrlKey &&
            evt.metaKey &&
            num <= tabs.options.length) {
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
                    const chat = evt.target;
                    if (!chat.hasVisibleOptions()) {
                        this.triggerSend();
                    }
                }
                else {
                    this.triggerSend();
                }
            }
        }
    }
    triggerSend() {
        if (!this.empty) {
            this.fireCustomEvent(CustomEventType.Submitted, {
                langValues: this.langValues
            });
        }
    }
    handleLanguageChange(evt) {
        const select = evt.target;
        this.currentLanguage = select.values[0].iso;
    }
    resetTabs() {
        this.getTabs().focusTab('Reply');
    }
    getTabs() {
        return this.shadowRoot.querySelector('temba-tabs');
    }
    render() {
        return html `
      <temba-field
        name=${this.name}
        .errors=${this.errors}
        .widgetOnly=${this.widgetOnly}
        .value=${this.value}
        class=${getClasses({
            'active-template': !!this.currentTemplate &&
                this.currentTab &&
                this.currentTab.name === 'Template'
        })}
      >
        ${this.languages.length > 1
            ? html `<temba-select
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
    handleTemplateChanged(evt) {
        var _a;
        this.currentTemplate = evt.detail.template;
        this.locale = (_a = evt.detail.translation) === null || _a === void 0 ? void 0 : _a.locale;
        this.requestUpdate();
    }
    handleTemplateVariablesChanged(evt) {
        this.variables = [...evt.detail.variables];
    }
    getTextInput() {
        return this.shadowRoot.querySelector('.chatbox').getTextInput();
    }
    handleShortcutSelection(event) {
        this.activeShortcut = event.detail.selected;
        const line = this.getCurrentLine();
        const chatbox = this.getTextInput();
        const originalText = chatbox.value;
        if (line.text.startsWith('/')) {
            const newText = originalText.substring(0, line.index) +
                this.activeShortcut.text +
                originalText.substring(line.index + line.text.length);
            chatbox.updateValue(newText);
            // set our cursor to the end of the shortcut
            const cursor = line.index + this.activeShortcut.text.length;
            chatbox.inputElement.setSelectionRange(cursor, cursor);
        }
        else {
            // add the text where the cursor is
            const cursor = chatbox.inputElement.selectionStart;
            const newText = originalText.substring(0, cursor) +
                this.activeShortcut.text +
                originalText.substring(cursor);
            chatbox.updateValue(newText);
            // set the cursor to the end of the shortcut text
            const newCursor = cursor + this.activeShortcut.text.length;
            chatbox.inputElement.setSelectionRange(newCursor, newCursor);
        }
        const tabs = this.shadowRoot.querySelector('temba-tabs');
        tabs.index = tabs.options.findIndex((tab) => tab.name === 'Reply');
    }
    getActions() {
        const showOptins = this.optIns && this.isBaseLanguage();
        const showTemplates = this.templates && this.isBaseLanguage();
        return html `
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
            ? html `<temba-tab
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
            ? html `<temba-tab
              name="Quick Replies"
              icon="quick_replies"
              selectionBackground="#fff"
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
            </temba-tab>`
            : null}
        ${showOptins
            ? html `<temba-tab
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
            ? html `<temba-tab
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
            ? html `<temba-tab
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
    getCounter() {
        return html `<temba-charcount
      .text="${this.currentText}"
    ></temba-charcount>`;
    }
}
__decorate([
    property({ type: Number })
], Compose.prototype, "index", void 0);
__decorate([
    property({ type: Number })
], Compose.prototype, "maxAttachments", void 0);
__decorate([
    property({ type: Number })
], Compose.prototype, "maxLength", void 0);
__decorate([
    property({ type: Number })
], Compose.prototype, "maxQuickReplies", void 0);
__decorate([
    property({ type: Boolean })
], Compose.prototype, "completion", void 0);
__decorate([
    property({ type: Boolean })
], Compose.prototype, "attachments", void 0);
__decorate([
    property({ type: Boolean })
], Compose.prototype, "quickReplies", void 0);
__decorate([
    property({ type: Boolean })
], Compose.prototype, "optIns", void 0);
__decorate([
    property({ type: Boolean })
], Compose.prototype, "templates", void 0);
__decorate([
    property({ type: Boolean })
], Compose.prototype, "counter", void 0);
__decorate([
    property({ type: Boolean })
], Compose.prototype, "autogrow", void 0);
__decorate([
    property({ type: Boolean })
], Compose.prototype, "shortcuts", void 0);
__decorate([
    property({ type: String })
], Compose.prototype, "currentText", void 0);
__decorate([
    property({ type: String })
], Compose.prototype, "initialText", void 0);
__decorate([
    property({ type: String })
], Compose.prototype, "accept", void 0);
__decorate([
    property({ type: String, attribute: false })
], Compose.prototype, "endpoint", void 0);
__decorate([
    property({ type: Boolean, attribute: false })
], Compose.prototype, "uploading", void 0);
__decorate([
    property({ type: Array })
], Compose.prototype, "languages", void 0);
__decorate([
    property({ type: Array })
], Compose.prototype, "currentAttachments", void 0);
__decorate([
    property({ type: Array })
], Compose.prototype, "currentQuickReplies", void 0);
__decorate([
    property({ type: Array })
], Compose.prototype, "currentOptin", void 0);
__decorate([
    property({ type: Array })
], Compose.prototype, "variables", void 0);
__decorate([
    property({ type: String })
], Compose.prototype, "template", void 0);
__decorate([
    property({ type: Object })
], Compose.prototype, "currentTemplate", void 0);
__decorate([
    property({ type: String })
], Compose.prototype, "locale", void 0);
__decorate([
    property({ type: String })
], Compose.prototype, "optinEndpoint", void 0);
__decorate([
    property({ type: String })
], Compose.prototype, "templateEndpoint", void 0);
__decorate([
    property({ type: Boolean, attribute: false })
], Compose.prototype, "empty", void 0);
__decorate([
    property({ type: Boolean, attribute: 'widget_only' })
], Compose.prototype, "widgetOnly", void 0);
__decorate([
    property({ type: Array })
], Compose.prototype, "errors", void 0);
__decorate([
    property({ type: Object })
], Compose.prototype, "langValues", void 0);
__decorate([
    property({ type: String })
], Compose.prototype, "currentLanguage", void 0);
__decorate([
    property({ type: Object })
], Compose.prototype, "currentTab", void 0);
__decorate([
    property({ type: Boolean })
], Compose.prototype, "hasPendingText", void 0);
__decorate([
    property({ type: Object })
], Compose.prototype, "activeShortcut", void 0);
//# sourceMappingURL=Compose.js.map