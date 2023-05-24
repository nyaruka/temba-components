import { TemplateResult, html, css } from 'lit';
import { FormElement } from '../FormElement';
import { property } from 'lit/decorators.js';
import { CustomEventType } from '../interfaces';
import { Completion } from '../completion/Completion';
import { AttachmentsUploader } from '../attachments/AttachmentsUploader';
import { AttachmentsList } from '../attachments/AttachmentsList';

export interface Attachment {
  uuid: string;
  content_type: string;
  url: string;
  filename: string;
  size: number;
  error: string;
}

export const upload_endpoint = '/api/v2/media.json';

export class Compose2 extends FormElement {
  static get styles() {
    return css`
      temba-completion {
        margin-left: 0.3em;
        margin-top: 0.3em;
        --color-widget-border: none;
        --curvature-widget: none;
        --widget-box-shadow: none;
        --widget-box-shadow-focused: none;
        --temba-textinput-padding: 0;
      }

      .attachments {
        display: flex;
        flex-direction: column;
      }

      .actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-left: 0.25em;
        padding: 0.2em;
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
    `;
  }

  @property({ type: Boolean })
  chatbox: boolean;

  @property({ type: Boolean })
  attachments: boolean;

  @property({ type: Boolean })
  counter: boolean;

  @property({ type: Boolean })
  button: boolean;

  @property({ type: String })
  currentText = '';

  @property({ type: String })
  accept = ''; //e.g. ".xls,.xlsx"

  @property({ type: String, attribute: false })
  endpoint = upload_endpoint;

  @property({ type: String })
  uploadIcon = 'attachment';

  @property({ type: String })
  removeIcon = 'delete_small';

  @property({ type: Number })
  maxAttachments = 3;

  @property({ type: Array })
  currentAttachments: Attachment[] = [];

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

  @property({ type: String })
  value = '';

  public constructor() {
    super();
  }

  private deserializeComposeValue(): void {
    // console.log('deseralizeComposeValue');
    // console.log('deseralizeComposeValue value', this.value);
    if (this.value) {
      const parsed_value = JSON.parse(this.value);
      // console.log('deseralizeComposeValue parsed_value', parsed_value);
      if (this.chatbox) {
        // console.log('deseralizeComposeValue chatbox', this.chatbox);
        this.currentText = parsed_value.text;
        // console.log('deseralizeComposeValue this.currentText', this.currentText);
      }
      if (this.attachments) {
        // console.log(
        // 'deseralizeComposeValue attachments',
        // parsed_value.attachments
        // );
        this.currentAttachments = parsed_value.attachments;
        // console.log('deseralizeComposeValue this.currentAttachments', this.currentAttachments);
      }
    }
  }

  private serializeComposeValue(): void {
    // console.log('seralizeComposeValue');
    // console.log('seralizeComposeValue this.currentText', this.currentText);
    // console.log('seralizeComposeValue this.currentAttachments', this.currentAttachments);
    const composeValue = {
      text: this.currentText,
      attachments: this.currentAttachments,
    };
    // update this.value...
    this.value = JSON.stringify(composeValue);
    // console.log('seralizeComposeValue value', this.value);
    // and then also update this.values...
    // so that the hidden input is updated via FormElement.updateInputs()
    this.values = [composeValue];
    // console.log('seralizeComposeValue values', this.values);

    const attachmentsList = this.shadowRoot.querySelector(
      'temba-attachments-list'
    ) as AttachmentsList;
    attachmentsList.requestUpdate();

    const attachmentsUploader = this.shadowRoot.querySelector(
      'temba-attachments-uploader'
    ) as AttachmentsUploader;
    attachmentsUploader.requestUpdate();
  }

  public firstUpdated(changes: Map<string, any>): void {
    // console.log('firstUpdated');
    super.firstUpdated(changes);

    this.deserializeComposeValue();

    this.setFocusOnChatbox();
  }

  public updated(changes: Map<string, any>): void {
    // console.log('Compose2 updated');
    super.updated(changes);

    // changes.forEach((oldValue, propName) => {
    //console.log(propName);
    // if (Object.hasOwn(this, propName)) {
    // console.log(
    // `${propName}: ${oldValue} -> ${JSON.stringify(this[propName])}`
    // );
    // }
    // });

    if (changes.has('currentAttachments')) {
      console.log(
        'C2',
        changes.get('currentAttachments'),
        '->',
        this.currentAttachments
      );
    }

    // console.log('Compose2 updated this.currentText', this.currentText);
    // console.log('Compose2 updated this.currentAttachments', this.currentAttachments);
    // console.log('Compose2 updated this.value', this.value);
    // console.log('Compose2 updated this.values', this.values);

    if (changes.has('currentText') || changes.has('currentAttachments')) {
      this.toggleButton();
      this.serializeComposeValue();
      this.fireCustomEvent(CustomEventType.ContentChanged, this.value);
    }

    this.setFocusOnChatbox();
  }

  private setFocusOnChatbox(): void {
    if (this.chatbox) {
      const completion = this.shadowRoot.querySelector(
        'temba-completion'
      ) as Completion;
      if (completion) {
        window.setTimeout(() => {
          completion.focus();
        }, 0);
      }
    }
  }

  public reset(): void {
    console.log('resetting..');
    this.currentText = '';
    this.currentAttachments = [];
    this.failedAttachments = [];
    this.buttonError = '';
  }

  private handleContainerClicked(evt: Event) {
    this.setFocusOnChatbox();
  }

  private handleChatboxChange(evt: Event) {
    const completion = evt.target as Completion;
    this.currentText = completion.value;
  }

  private handleDragDropped(evt: CustomEvent): void {
    const de = evt.detail.de as DragEvent;
    const dt = de.dataTransfer;
    if (dt) {
      const files = dt.files;
      const attachmentsUploader = this.shadowRoot.querySelector(
        'temba-attachments-uploader'
      ) as AttachmentsUploader;
      attachmentsUploader.uploadFiles(files);
    }
  }

  private handleAttachmentsAdded(evt: CustomEvent): void {
    // console.log('handleAttachmentsAdded');
    console.log('handleAttachmentsAdded evt.detail', evt.detail);
    this.currentAttachments = evt.detail.currentAttachments;
    this.failedAttachments = evt.detail.failedAttachments;

    const attachmentsList = this.shadowRoot.querySelector(
      'temba-attachments-list'
    ) as AttachmentsList;
    attachmentsList.requestUpdate();
  }

  private handleAttachmentsRemoved(evt: CustomEvent): void {
    // console.log('handleAttachmentsRemoved');
    console.log('handleAttachmentsRemoved evt.detail', evt.detail);
    this.currentAttachments = evt.detail.currentAttachments;
    this.failedAttachments = evt.detail.failedAttachments;

    const attachmentsUploader = this.shadowRoot.querySelector(
      'temba-attachments-uploader'
    ) as AttachmentsUploader;
    attachmentsUploader.requestUpdate();
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
    if (evt.key === 'Enter' && !evt.shiftKey) {
      const chat = evt.target as Completion;
      if (!chat.hasVisibleOptions()) {
        this.handleSend();
      }
      evt.preventDefault();
      evt.stopPropagation();
    }
  }

  private handleSend() {
    if (!this.buttonDisabled) {
      this.buttonDisabled = true;
      const name = this.buttonName;
      this.fireCustomEvent(CustomEventType.ButtonClicked, { name });
    }
  }

  public render(): TemplateResult {
    return html`
      <temba-field
        name=${this.name}
        .errors=${this.errors}
        .widgetOnly=${this.widgetOnly}
        value=${this.value}
      >
        <temba-attachments-drop-zone
          @temba-container-clicked="${this.handleContainerClicked.bind(this)}
          @temba-drag-dropped="${this.handleDragDropped.bind(this)}"
        >
          ${
            this.chatbox
              ? html`<div class="items chatbox">${this.getChatbox()}</div>`
              : null
          }
          ${
            this.attachments
              ? html`<div class="items attachments">
                  ${this.getAttachments()}
                </div>`
              : null
          }
          <div class="items actions">${this.getActions()}</div>
        </temba-attachments-drop-zone>        
      </temba-field>
    `;
  }

  private getChatbox(): TemplateResult {
    return html` <temba-completion
      value=${this.currentText}
      gsm
      textarea
      autogrow
      @change=${this.handleChatboxChange}
      @keydown=${this.handleSendEnter}
      placeholder="Write something here"
    >
    </temba-completion>`;
  }

  private getAttachments(): TemplateResult {
    return html`
      <temba-attachments-list
        .currentAttachments="${this.currentAttachments}"
        .failedAttachments="${this.failedAttachments}"
        removeIcon="${this.removeIcon}"
        @temba-content-changed="${this.handleAttachmentsRemoved.bind(this)}"
      >
      </temba-attachments-list>
    `;
  }

  private getActions(): TemplateResult {
    return html`
      <div class="actions-left">
        ${this.attachments ? this.getUploader() : null}
      </div>
      <div class="actions-center"></div>
      <div class="actions-right">
        ${this.buttonError
          ? html`<div class="send-error">${this.buttonError}</div>`
          : null}
        ${this.counter ? this.getCounter() : null}
        ${this.button ? this.getButton() : null}
      </div>
    `;
  }

  private getUploader(): TemplateResult {
    return html`
      <temba-attachments-uploader
        .currentAttachments="${this.currentAttachments}"
        .failedAttachments="${this.failedAttachments}"
        uploadIcon="${this.uploadIcon}"
        maxAttachments="${this.maxAttachments}"
        @temba-content-changed="${this.handleAttachmentsAdded.bind(this)}"
      >
      </temba-attachments-uploader>
    `;
  }

  private getCounter(): TemplateResult {
    return html`<temba-charcount text="${this.currentText}"></temba-charcount>`;
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
