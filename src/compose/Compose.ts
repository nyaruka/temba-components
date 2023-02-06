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

export interface Attachment {
  uuid: string;
  content_type: string;
  type: string; //deprecated
  url: string;
  name: string;
  size: number;
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
      }

      .attachments {
        display: flex;
        flex-direction: column;
      }
      .selected {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
      }
      .selected-item {
        background: rgba(100, 100, 100, 0.1);
        border-radius: 2px;
        margin: 2px;
        display: flex;
        color: var(--color-widget-text);
      }
      .remove-item {
        cursor: pointer;
        padding: 3px 6px;
        border-right: 1px solid rgba(100, 100, 100, 0.2);
        margin-top: 1px;
        background: rgba(100, 100, 100, 0.05);
      }
      .option-name {
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
  uploadErrors: string[] = [];

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

  private handleChatboxChange(evt: Event) {
    console.log('handleChatboxChange evt', evt);
    this.uploadErrors = [];
    this.preventDefaults(evt);
    const completionElement = evt.target as Completion;
    const textInputElement = completionElement.textInputElement;
    this.currentChat = textInputElement.value;
    this.toggleButton();
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
    this.uploadErrors = [];
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

    // todo remove for final PR
    // window.setTimeout(() => {
    //   const attachment = {
    //     uuid: Math.random().toString(36).slice(2, 6),
    //     content_type: file.type,
    //     type: file.type,
    //     name: file.name,
    //     url: file.name,
    //     size: file.size,
    //   };
    //   console.log('attachment', attachment);
    //   this.addValue(attachment);
    //   console.log('values', this.values);
    //   this.uploading = false;
    // }, 2500);

    const url = this.endpoint;
    console.log('url', url);
    const payload = new FormData();
    payload.append('file', file);
    postFormData(url, payload)
      .then((response: WebResponse) => {
        console.log(response);
        if (response.json.error) {
          console.log(response.json.error);
          this.uploadErrors.push(file.name + ' - ' + response.json.error);
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
        this.uploadErrors.push(file.name + ' - ' + error);
      })
      .finally(() => {
        this.uploading = false;
        this.toggleButton();
      });
  }

  private handleRemoveAttachment(evt: Event): void {
    console.log('handleRemoveAttachment evt', evt);
    this.uploadErrors = [];
    const target = evt.target as HTMLDivElement;
    const attachment = this.values.find(({ uuid }) => uuid === target.id);
    console.log('handleRemoveAttachment attachment', attachment);
    this.removeValue(attachment);
    console.log('values', this.values);
    this.fireCustomEvent(CustomEventType.AttachmentRemoved, attachment);
    this.toggleButton();
  }

  private toggleButton() {
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

  public handleSendClick(evt: MouseEvent) {
    console.log('handleClick evt', evt);
    this.uploadErrors = [];
    const button = evt.target as Button;
    if (!button.disabled) {
      const name = button.name;
      this.fireCustomEvent(CustomEventType.ButtonClicked, { name });
    }
  }

  public handleSendEnter(evt: KeyboardEvent) {
    console.log('handleSend evt', evt);
    this.uploadErrors = [];
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
    // return html`
    //   <temba-completion counter="temba-charcount" value=${this.currentChat} gsm textarea></temba-completion>
    //   <temba-charcount text='count this text'></temba-charcount>`;

    return html` <temba-completion
      @change=${this.handleChatboxChange}
      .value=${this.currentChat}
      value=${this.currentChat}
      @keydown=${(e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          const chat = e.target as Completion;
          if (!chat.hasVisibleOptions()) {
            this.handleSendEnter(e);
            this.preventDefaults(e);
          }
        }
      }}
      placeholder="Type something here"
      textarea
    >
    </temba-completion>`;
    // <temba-charcount></temba-charcount>`;
  }

  private getAttachments(): TemplateResult {
    return html`
      ${this.values && this.values.length > 0
        ? html`
            <div class="selected">
              ${this.values.map(attachment => {
                return html` <div class="selected-item">
                  <div class="remove-item">
                    <temba-icon
                      id="${attachment.uuid}"
                      name="${Icon.delete_small}"
                      @click="${this.handleRemoveAttachment}"
                      clickable
                    ></temba-icon>
                  </div>
                  <div class="option-name">
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
            </div`
        : null}
    `;
  }

  private getActions(): TemplateResult {
    if (this.attachments) {
      if (this.uploading) {
        return html` <temba-loading units="3" size="12"></temba-loading>`;
      } else {
        return html`
          <input
            type="file"
            id="upload-files"
            multiple
            accept="${this.accept}"
            @change="${this.handleUploadFileChanged}"
          />
          <label class="upload-label" for="upload-files">
            <temba-icon
              class="upload-icon"
              name="${Icon.attachment}"
              @click="${this.handleAddAttachments}"
              clickable
            ></temba-icon>
            ${this.uploadErrors.length > 0
              ? html` <div class="upload-error">
                  ${this.uploadErrors.join(', ')}
                </div>`
              : null}
          </label>
          ${this.button ? this.getButton() : null}
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
