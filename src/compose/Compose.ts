import { TemplateResult, html, css } from 'lit';
import { FormElement } from '../FormElement';
import { property } from 'lit/decorators.js';
import { Icon } from '../vectoricon';
import { CustomEventType } from '../interfaces';
import {
  formatFileSize,
  formatFileType,
  getClasses,
  postFormData,
  truncate,
  WebResponse,
} from '../utils';
import { Completion } from '../completion/Completion';
import { VectorIcon } from '../vectoricon/VectorIcon';
import { Button } from '../button/Button';

export interface Attachment {
  uuid: string;
  content_type: string;
  url: string;
  filename: string;
  size: number;
  error: string;
}

export const upload_endpoint = '/api/v2/media.json';

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
        border: 1px solid var(--color-widget-border);
        transition: all ease-in-out var(--transition-speed);
        box-shadow: var(--widget-box-shadow);
        caret-color: var(--input-caret);
        padding: var(--temba-textinput-padding);
      }
      .container:focus-within {
        border-color: var(--color-focus);
        background: var(--color-widget-bg-focused);
        box-shadow: var(--widget-box-shadow-focused);
      }

      .drop-mask {
        opacity: 0;
        pointer-events: none;
        position: absolute;
        z-index: 1;
        height: 100%;
        width: 100%;
        bottom: 0;
        right: 0;
        background: rgba(210, 243, 184, 0.8);
        border-radius: var(--curvature-widget);
        margin: -0.5em;
        padding: 0.5em;
        transition: opacity ease-in-out var(--transition-speed);
        display: flex;
        align-items: center;
        text-align: center;
      }

      .highlight .drop-mask {
        opacity: 1;
      }

      .drop-mask > div {
        margin: auto;
        border-radius: var(--curvature-widget);
        font-weight: 400;
        color: rgba(0, 0, 0, 0.5);
      }

      .items {
      }

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
      .attachments-list {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
      }
      .attachment-item {
        background: rgba(100, 100, 100, 0.1);
        border-radius: 2px;
        margin: 0.3em;
        display: flex;
        color: var(--color-widget-text);
      }
      .attachment-item.error {
        background: rgba(250, 0, 0, 0.1);
        color: rgba(250, 0, 0, 0.75);
      }
      .remove-item {
        cursor: pointer !important;
        padding: 3px 6px;
        border-right: 1px solid rgba(100, 100, 100, 0.2);
        margin-top: 1px;
        background: rgba(100, 100, 100, 0.05);
      }

      .remove-item:hover {
        background: rgba(100, 100, 100, 0.1);
      }

      .remove-item.error:hover {
        background: rgba(250, 0, 0, 0.1);
      }

      .remove-item.error {
        background: rgba(250, 0, 0, 0.05);
        color: rgba(250, 0, 0, 0.75);
      }
      .attachment-name {
        align-self: center;
        font-size: 12px;
        padding: 2px 8px;
      }

      .actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-left: 0.25em;
        padding: 0.2em;
      }

      #upload-files {
        display: none;
      }
      .upload-label {
        display: flex;
        align-items: center;
      }
      .upload-icon {
        color: rgb(102, 102, 102);
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
  pendingDrop: boolean;

  @property({ type: Boolean })
  button: boolean;

  @property({ type: String, attribute: false })
  currentChat = '';

  @property({ type: String })
  accept = ''; //e.g. ".xls,.xlsx"

  @property({ type: String, attribute: false })
  endpoint = upload_endpoint;

  @property({ type: Boolean, attribute: false })
  uploading: boolean;

  // values = attachments that are uploaded sent to the server when the user clicks send
  // errorValues = attachments that are not uploaded and are not sent to the server when the user clicks send
  @property({ type: Array, attribute: false })
  errorValues: Attachment[] = [];

  @property({ type: String })
  buttonName = 'Send';

  @property({ type: Boolean, attribute: false })
  buttonDisabled = true;

  @property({ type: String, attribute: false })
  buttonError = '';

  public constructor() {
    super();
  }

  public updated(changes: Map<string, any>): void {
    super.updated(changes);

    if (changes.has('currentChat') || changes.has('values')) {
      this.buttonError = '';
      this.toggleButton();
    }
  }

  firstUpdated(): void {
    this.setFocusOnChatbox();
  }

  setFocusOnChatbox(): void {
    if (this.chatbox) {
      const completion = this.shadowRoot.querySelector(
        'temba-completion'
      ) as Completion;
      if (completion) {
        //simulate a click inside the completion to set focus
        window.setTimeout(() => {
          completion.click();
        }, 0);
      }
    }
  }

  public reset(): void {
    this.currentChat = '';
    this.values = [];
    this.errorValues = [];
    this.buttonError = '';
  }

  private handleChatboxChange(evt: Event) {
    const completion = evt.target as Completion;
    const textInput = completion.textInputElement;
    this.currentChat = textInput.value;
  }

  private handleDragEnter(evt: DragEvent): void {
    this.highlight(evt);
  }

  private handleDragOver(evt: DragEvent): void {
    this.highlight(evt);
  }

  private handleDragLeave(evt: DragEvent): void {
    this.unhighlight(evt);
  }

  private handleDrop(evt: DragEvent): void {
    this.unhighlight(evt);

    const dt = evt.dataTransfer;
    if (dt) {
      const files = dt.files;
      this.uploadFiles(files);
    }
  }

  private preventDefaults(evt: Event): void {
    evt.preventDefault();
    evt.stopPropagation();
  }

  private highlight(evt: DragEvent): void {
    this.pendingDrop = true;
    this.preventDefaults(evt);
  }

  private unhighlight(evt: DragEvent): void {
    this.pendingDrop = false;
    this.preventDefaults(evt);
  }

  private handleAddAttachments(): void {
    this.dispatchEvent(new Event('change'));
  }

  private handleUploadFileChanged(evt: Event): void {
    const target = evt.target as HTMLInputElement;
    const files = target.files;
    this.uploadFiles(files);
  }

  public uploadFiles(files: FileList): void {
    let filesToUpload = [];
    if (this.values && this.values.length > 0) {
      //remove duplicate files that have already been uploaded
      filesToUpload = [...files].filter(file => {
        const index = this.values.findIndex(
          value => value.name === file.name && value.size === file.size
        );
        if (index === -1) {
          return file;
        }
      });
    } else {
      filesToUpload = [...files];
    }
    filesToUpload.map(fileToUpload => {
      this.uploadFile(fileToUpload);
    });
  }

  private uploadFile(file: File): void {
    this.uploading = true;

    const url = this.endpoint;
    const payload = new FormData();
    payload.append('file', file);
    postFormData(url, payload)
      .then((response: WebResponse) => {
        const attachment = response.json as Attachment;
        if (attachment) {
          this.addValue(attachment);
          this.fireCustomEvent(CustomEventType.AttachmentAdded, attachment);
        }
      })
      .catch((error: WebResponse) => {
        let fileError = '';
        if (error.status === 400) {
          fileError = error.json.file[0];
        } else {
          fileError = 'Server failure';
        }
        console.error(fileError);
        this.addErrorValue(file, fileError);
      })
      .finally(() => {
        this.uploading = false;
      });
  }

  private addErrorValue(file: File, error: string) {
    const errorValue = {
      uuid: Math.random().toString(36).slice(2, 6),
      content_type: file.type,
      filename: file.name,
      url: file.name,
      size: file.size,
      error: error,
    } as Attachment;
    this.errorValues.push(errorValue);
    this.requestUpdate('errorValues');
  }
  public removeErrorValue(valueToRemove: any) {
    this.errorValues = this.errorValues.filter(
      (value: any) => value !== valueToRemove
    );
    this.requestUpdate('errorValues');
  }

  private handleRemoveAttachment(evt: Event): void {
    const target = evt.target as HTMLDivElement;

    const attachment = this.values.find(({ uuid }) => uuid === target.id);
    if (attachment) {
      this.removeValue(attachment);
      this.fireCustomEvent(CustomEventType.AttachmentRemoved, attachment);
    }
    const errorAttachment = this.errorValues.find(
      ({ uuid }) => uuid === target.id
    );
    if (errorAttachment) {
      this.removeErrorValue(errorAttachment);
      this.fireCustomEvent(CustomEventType.AttachmentRemoved, attachment);
    }
  }

  public toggleButton() {
    if (this.button) {
      const chatboxEmpty = this.currentChat.trim().length === 0;
      const attachmentsEmpty = this.values.length === 0;
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

  private handleSendClick() {
    this.handleSend();
  }

  private handleSendEnter(evt: KeyboardEvent) {
    if (evt.key === 'Enter' && !evt.shiftKey) {
      const chat = evt.target as Completion;
      if (!chat.hasVisibleOptions()) {
        this.handleSend();
      }
      this.preventDefaults(evt);
    }
  }

  private handleSend() {
    if (!this.buttonDisabled) {
      this.buttonDisabled = true;
      const name = this.buttonName;
      this.fireCustomEvent(CustomEventType.ButtonClicked, { name });

      //after send, return focus to chatbox
      this.setFocusOnChatbox();
    }
  }

  public render(): TemplateResult {
    return html`
      <div
        class=${getClasses({ container: true, highlight: this.pendingDrop })}
        @dragenter="${this.handleDragEnter}"
        @dragover="${this.handleDragOver}"
        @dragleave="${this.handleDragLeave}"
        @drop="${this.handleDrop}"
      >
        <div class="drop-mask"><div>Upload Attachment</div></div>

        ${this.chatbox
          ? html`<div class="items chatbox">${this.getChatbox()}</div>`
          : null}
        ${this.attachments
          ? html`<div class="items attachments">${this.getAttachments()}</div>`
          : null}
        <div class="items actions">${this.getActions()}</div>
      </div>
    `;
  }

  private getChatbox(): TemplateResult {
    return html` <temba-completion
      value=${this.currentChat}
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
      ${(this.values && this.values.length > 0) ||
      (this.errorValues && this.errorValues.length > 0)
        ? html` <div class="attachments-list">
            ${this.values.map(attachment => {
              return html` <div class="attachment-item">
                <div
                  class="remove-item"
                  @click="${this.handleRemoveAttachment}"
                >
                  <temba-icon
                    id="${attachment.uuid}"
                    name="${Icon.delete_small}"
                  ></temba-icon>
                </div>
                <div class="attachment-name">
                  <span
                    title="${attachment.filename} (${formatFileSize(
                      attachment.size,
                      2
                    )}) ${attachment.content_type}"
                    >${truncate(attachment.filename, 25)}
                    (${formatFileSize(attachment.size, 0)})
                    ${formatFileType(attachment.content_type)}</span
                  >
                </div>
              </div>`;
            })}
            ${this.errorValues.map(errorAttachment => {
              return html` <div class="attachment-item error">
                <div
                  class="remove-item error"
                  @click="${this.handleRemoveAttachment}"
                >
                  <temba-icon
                    id="${errorAttachment.uuid}"
                    name="${Icon.delete_small}"
                  ></temba-icon>
                </div>
                <div class="attachment-name">
                  <span
                    title="${errorAttachment.filename} (${formatFileSize(
                      0,
                      0
                    )}) - Attachment failed - ${errorAttachment.error}"
                    >${truncate(errorAttachment.filename, 25)}
                    (${formatFileSize(0, 0)}) - Attachment failed</span
                  >
                </div>
              </div>`;
            })}
          </div>`
        : null}
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
    if (this.uploading) {
      return html`<temba-loading units="3" size="12"></temba-loading>`;
    } else {
      return html` <input
          type="file"
          id="upload-files"
          multiple
          accept="${this.accept}"
          @change="${this.handleUploadFileChanged}"
        />
        <label class="actions-left upload-label" for="upload-files">
          <temba-icon
            class="upload-icon"
            name="${Icon.attachment}"
            @click="${this.handleAddAttachments}"
            clickable
          ></temba-icon>
        </label>`;
    }
  }

  private getCounter(): TemplateResult {
    return html`<temba-charcount text="${this.currentChat}"></temba-charcount>`;
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
