import { TemplateResult, html, css } from 'lit';
import { FormElement } from '../FormElement';
import { property } from 'lit/decorators.js';
import { Icon } from '../vectoricon';
import { CustomEventType } from '../interfaces';
import {
  formatFileSize,
  formatFileType,
  postFormData,
  truncate,
  WebResponse,
} from '../utils';
import { Completion } from '../completion/Completion';
import { Button } from '../button/Button';
import { CharCount } from '../charcount/CharCount';

export interface Attachment {
  uuid: string;
  content_type: string;
  type: string; //deprecated
  url: string;
  name: string;
  size: number;
  error: string;
}

export class Compose extends FormElement {
  static get styles() {
    return css`
      .container {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .highlight {
        opacity: 0.5;
      }
      .items {
        margin-bottom: 0.5em;
      }

      temba-completion {
        --color-widget-border: none;
        --curvature-widget: none;
        --widget-box-shadow: none;
        --widget-box-shadow-focused: none;
        --temba-textinput-padding: 0;
        --textarea-height: 5em;
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
        margin: 2px;
        display: flex;
        color: var(--color-widget-text);
      }
      .attachment-item.error {
        background: rgba(250, 0, 0, 0.1);
        color: rgba(250, 0, 0, 0.75);
      }
      .remove-item {
        cursor: pointer;
        padding: 3px 6px;
        border-right: 1px solid rgba(100, 100, 100, 0.2);
        margin-top: 1px;
        background: rgba(100, 100, 100, 0.05);
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
      .upload-error {
        color: red;
        font-size: var(--help-text-size);
        margin-left: 5px;
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
        --temba-charcount-summary-right: 90px;
        --temba-charcount-summary-bottom: 95px;
      }
      temba-button {
        --button-y: 1px;
        --button-x: 12px;
      }
    `;
  }

  @property({ type: Boolean })
  chatbox = true;

  @property({ type: String, attribute: false })
  currentChat = '';

  @property({ type: Boolean })
  counter = true;

  @property({ type: Boolean })
  attachments = true;

  @property({ type: String, attribute: false })
  endpoint = '/msgmedia/upload/';

  @property({ type: String })
  accept = ''; //e.g. ".xls,.xlsx"

  @property({ type: Boolean, attribute: false })
  uploading: boolean;

  @property({ type: Array, attribute: false })
  errorValues: Attachment[] = [];

  @property({ type: Boolean })
  button = true;

  @property({ type: String })
  buttonName = 'Send';

  @property({ type: Boolean })
  buttonDisabled = true;

  public constructor() {
    super();
  }

  public updated(changes: Map<string, any>): void {
    super.updated(changes);
    console.log('changes', changes);
  }

  public reset(): void {
    this.currentChat = '';
    this.values = [];
    this.buttonDisabled = true;
  }

  private handleChatboxChange(evt: Event) {
    console.log('handleChatboxChange evt', evt);
    this.preventDefaults(evt);
    const completionElement = evt.target as Completion;
    const textInputElement = completionElement.textInputElement;
    this.currentChat = textInputElement.value;
    this.buttonDisabled = this.toggleButton();
  }

  private handleDragEnter(evt: DragEvent): void {
    console.log('drag enter', evt);
    this.highlight(evt);
  }

  private handleDragOver(evt: DragEvent): void {
    console.log('drag over', evt);
    this.highlight(evt);
  }

  private handleDragLeave(evt: DragEvent): void {
    console.log('drag leave', evt);
    this.unhighlight(evt);
  }

  private handleDrop(evt: DragEvent): void {
    console.log('drag drop', evt);
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
    console.log('highlight', evt);
    this.preventDefaults(evt);
    const dragAndDropZone = evt.target as HTMLDivElement;
    dragAndDropZone.classList.add('highlight');
  }

  private unhighlight(evt: DragEvent): void {
    console.log('unhighlight', evt);
    this.preventDefaults(evt);
    const dragAndDropZone = evt.target as HTMLDivElement;
    dragAndDropZone.classList.remove('highlight');
  }

  private handleAddAttachments(evt: Event): void {
    console.log('handleAddAttachments evt', evt);
    this.dispatchEvent(new Event('change'));
  }

  private handleUploadFileChanged(evt: Event): void {
    console.log('handleUploadFileChanged evt', evt);
    const target = evt.target as HTMLInputElement;
    const files = target.files;
    this.uploadFiles(files);
  }

  private uploadFiles(files: FileList): void {
    console.log('uploadFiles files', files);
    let filesToUpload = [];
    if (this.values && this.values.length > 0) {
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
    console.log('filesToUpload', filesToUpload);
    filesToUpload.map(fileToUpload => {
      this.uploadFile(fileToUpload);
    });
  }

  private uploadFile(file: File): void {
    console.log('uploadFile file', file);
    this.uploading = true;

    const url = this.endpoint;
    console.log('url', url);
    const payload = new FormData();
    payload.append('file', file);
    postFormData(url, payload)
      .then((response: WebResponse) => {
        console.log(response);
        if (response.json.error) {
          console.log(response.json.error);
          this.addErrorValue(file, response.json.error);
        } else {
          console.log(response.json);
          const attachment = response.json as Attachment;
          if (attachment) {
            console.log('attachment', attachment);
            this.addValue(attachment);
            console.log('values', this.values);
            this.fireCustomEvent(CustomEventType.AttachmentAdded, attachment);
          }
        }
      })
      .catch((error: string) => {
        console.log(error);
        this.addErrorValue(file, error);
      })
      .finally(() => {
        this.uploading = false;
        this.buttonDisabled = this.toggleButton();
      });
  }

  private addErrorValue(file: File, error: string) {
    const errorValue = {
      uuid: Math.random().toString(36).slice(2, 6),
      content_type: file.type,
      type: file.type,
      name: file.name,
      url: file.name,
      size: file.size,
      error: error,
    };
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
    console.log('handleRemoveAttachment evt', evt);
    const target = evt.target as HTMLDivElement;

    const attachment = this.values.find(({ uuid }) => uuid === target.id);
    console.log('handleRemoveAttachment attachment', attachment);
    if (attachment) {
      this.removeValue(attachment);
      this.fireCustomEvent(CustomEventType.AttachmentRemoved, attachment);
      console.log('values', this.values);
    }
    const errorAttachment = this.errorValues.find(
      ({ uuid }) => uuid === target.id
    );
    console.log('handleRemoveAttachment errorAttachment', errorAttachment);
    if (errorAttachment) {
      this.removeErrorValue(errorAttachment);
      this.fireCustomEvent(CustomEventType.AttachmentRemoved, attachment);
      console.log('errorValues', this.errorValues);
    }
    this.buttonDisabled = this.toggleButton();
  }

  private toggleButton() {
    if (this.button) {
      const chatboxEmpty = this.currentChat.trim().length === 0;
      const attachmentsEmpty = this.values.length === 0;
      if (this.chatbox && this.attachments) {
        return chatboxEmpty && attachmentsEmpty;
      } else if (this.chatbox) {
        return chatboxEmpty;
      } else if (this.attachments) {
        return attachmentsEmpty;
      } else {
        return true;
      }
    }
  }

  private handleSendClick(evt: MouseEvent) {
    console.log('handleClick evt', evt);
    const button = evt.target as Button;
    if (!button.disabled) {
      const name = button.name;
      this.fireCustomEvent(CustomEventType.ButtonClicked, { name });
    }
  }

  private handleSendEnter(evt: KeyboardEvent) {
    console.log('handleSend evt', evt);
    if (this.currentChat && this.currentChat.length > 0) {
      const name = this.buttonName;
      this.fireCustomEvent(CustomEventType.ButtonClicked, { name });
    }
  }

  public render(): TemplateResult {
    console.log('render chatbox', this.chatbox);
    console.log('render attachments', this.attachments);
    console.log('render button', this.button);

    return html`
      <div
        class="container"
        @dragenter="${this.handleDragEnter}"
        @dragover="${this.handleDragOver}"
        @dragleave="${this.handleDragLeave}"
        @drop="${this.handleDrop}"
      >
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
      @change=${this.handleChatboxChange}
      @keydown=${(e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          const chat = e.target as Completion;
          if (!chat.hasVisibleOptions()) {
            this.handleSendEnter(e);
            this.preventDefaults(e);
          }
        }
      }}
      placeholder="Write something here"
    >
    </temba-completion>`;
  }

  private getAttachments(): TemplateResult {
    return html`
      ${(this.values && this.values.length > 0) ||
      (this.errorValues && this.errorValues.length > 0)
        ? html`
            <div class="attachments-list">
              ${this.values.map(attachment => {
                return html` <div class="attachment-item">
                  <div class="remove-item">
                    <temba-icon
                      id="${attachment.uuid}"
                      name="${Icon.delete_small}"
                      @click="${this.handleRemoveAttachment}"
                      clickable
                    ></temba-icon>
                  </div>
                  <div class="attachment-name">
                    <span
                      title="${attachment.name} (${formatFileSize(
                        attachment.size,
                        2
                      )}) ${attachment.type}"
                      >${truncate(attachment.name, 25)}
                      (${formatFileSize(attachment.size, 0)})
                      ${formatFileType(attachment.type)}</span
                    >
                  </div>
                </div>`;
              })}
              ${this.errorValues.map(errorAttachment => {
                return html` <div class="attachment-item error">
                  <div class="remove-item error">
                    <temba-icon
                      id="${errorAttachment.uuid}"
                      name="${Icon.delete_small}"
                      @click="${this.handleRemoveAttachment}"
                      clickable
                    ></temba-icon>
                  </div>
                  <div class="attachment-name">
                    <span
                      title="${errorAttachment.name} (${formatFileSize(
                        0,
                        0
                      )}) - Attachment failed - ${errorAttachment.error}"
                      >${truncate(errorAttachment.name, 25)}
                      (${formatFileSize(0, 0)}) - Attachment failed</span
                    >
                  </div>
                </div>`;
              })}
            </div`
        : null}
    `;
  }

  private getActions(): TemplateResult {
    if (this.attachments) {
      if (this.uploading) {
        return html`<temba-loading units="3" size="12"></temba-loading>`;
      } else {
        return html`
          <input
            class="actions-left"
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
          </label>
          <div class="actions-right">
            <temba-charcount text="${this.currentChat}"></temba-charcount>
            ${this.button ? this.getButton() : null}
          </div>
        `;
      }
    } else {
      return html`
        ${this.button
          ? html` <div></div>
              ${this.getButton()}`
          : null}
      `;
    }
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
