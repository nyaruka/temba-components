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
import { TextInput } from '../textinput/TextInput';

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
        margin-top: 0.5em;
      }

      .chatbox {
        // none
      }
      // todo override styles
      // temba-completion .input-container {
      //   border: none;
      //   --color-widget-border: none;
      //   border-radius: none;
      //   --curvature-widget: none;
      //   box-shadow: none;
      //   --widget-box-shadow: none;
      // }
      // temba-completion textarea.textinput {
      //   padding: none;
      // }

      .attachments {
        display: flex;
        flex-direction: column;
      }
      .select-container {
        // display: flex;
        // flex-flow: row nowrap;
        // align-items: center;
        // transition: all ease-in-out var(--transition-speed);
        // cursor: pointer;
        // border-radius: var(--curvature-widget);
        // background: var(--color-widget-bg);
        // padding-top: 1px;
        // box-shadow: var(--widget-shadow);
        // position: relative;
        // z-index: 2;
      }
      .selected {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        // align-items: stretch;
        // user-select: none;
        // padding: 0.25em 0.25em 0.25em 0;
      }
      .selected-item {
        // vertical-align: middle;
        background: rgba(100, 100, 100, 0.1);
        // user-select: none;
        border-radius: 2px;
        // align-items: stretch;
        // flex-flow: row nowrap;
        margin: 2px;
        display: flex;
        // overflow: hidden;
        color: var(--color-widget-text);
        // line-height: var(--temba-select-selected-line-height);
        // --icon-color: var(--color-text-dark);
      }
      .remove-item {
        cursor: pointer;
        // display: inline-block;
        padding: 3px 6px;
        border-right: 1px solid rgba(100, 100, 100, 0.2);
        // margin: 0px;
        margin-top: 1px;
        background: rgba(100, 100, 100, 0.05);
      }
      .option-name {
        // flex: 1 1 auto;
        align-self: center;
        // white-space: nowrap;
        // overflow: hidden;
        // text-overflow: ellipsis;
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
      }
      .upload-icon {
        color: rgb(102, 102, 102);
        margin: 0;
      }
      .upload-error {
        color: red;
        font-size: var(--help-text-size);
        margin-left: 5px;
      }
      .send-button {
        // none
      }
    `;
  }

  @property({ type: String })
  endpoint = '/msgmedia/upload/';

  @property({ type: String })
  accept: string; //e.g. ".xls,.xlsx"

  @property({ type: Boolean })
  uploading: boolean;

  @property({ type: String })
  uploadError: string;

  @property({ type: String })
  currentChat = '';

  public constructor() {
    super();
  }

  public updated(changes: Map<string, any>): void {
    super.updated(changes);
    console.log('changes', changes);
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

  private handleUploadFileClicked(evt: Event): void {
    console.log('handleUploadFileClicked evt', evt);
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
    if (this.values && this.values.length) {
      [...files].map(file => {
        const index = this.values.findIndex(
          value => value.name === file.name && value.size === file.size
        );
        if (index == -1) {
          this.uploadFile(file);
        }
      });
    } else {
      [...files].map(file => this.uploadFile(file));
    }
  }

  private uploadFile(file: File): void {
    console.log('uploadFile file', file);
    this.uploading = true;
    this.uploadError = '';

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
          this.uploadError = response.json.error;
        } else {
          console.log(response.json);
          const attachment = response.json as Attachment;
          if (attachment) {
            console.log('attachment', attachment);
            this.addValue(attachment);
            console.log('values', this.values);
            this.fireCustomEvent(
              CustomEventType.AttachmentUploaded,
              attachment
            );
          }
        }
      })
      .catch((error: string) => {
        console.log(error);
        this.uploadError = error;
      })
      .finally(() => {
        if (this.uploadError && this.uploadError.length > 0) {
          this.uploadError += ', please try again';
        }
        this.uploading = false;
      });
  }

  private handleRemoveAttachment(evt: Event): void {
    console.log('handleRemoveFile evt', evt);
    const target = evt.target as HTMLDivElement;
    const attachment = this.values.find(({ uuid }) => uuid === target.id);
    console.log('handleRemoveFile attachment', attachment);
    this.removeValue(attachment);
    // this.counter = this.values.length;
    console.log('values', this.values);
    this.fireCustomEvent(CustomEventType.AttachmentRemoved, attachment);
  }

  private handleChatChange(evt: Event) {
    this.preventDefaults(evt);
    const completionElement = evt.target as Completion;
    const textInputElement = completionElement.shadowRoot.querySelector(
      'temba-textinput'
    ) as TextInput;
    this.currentChat = textInputElement.value;
    this.uploadError = '';
  }

  private handleSend() {
    // const payload = {
    //   contacts: [this.currentContact.uuid],
    //   text: this.currentChat,
    // };
    // if (this.currentTicket) {
    //   payload['ticket'] = this.currentTicket.uuid;
    // }
    // postJSON(`/api/v2/broadcasts.json`, payload)
    //   .then(() => {
    //     this.currentChat = '';
    //     this.refresh(true);
    //   })
    //   .catch(err => {
    //     // error message dialog?
    //     console.error(err);
    //   });
  }

  public render(): TemplateResult {
    return html`
      <div
        class="container"
        @dragenter="${this.handleDragEnter}"
        @dragover="${this.handleDragOver}"
        @dragleave="${this.handleDragLeave}"
        @drop="${this.handleDrop}"
      >
        <div class="items chatbox">${this.getChatbox()}</div>
        <div class="items attachments">${this.getAttachments()}</div>
        <div class="items actions">${this.getActions()}</div>
      </div>
    `;
  }

  private getChatbox(): TemplateResult {
    return html` <temba-completion
      @change=${this.handleChatChange}
      .value=${this.currentChat}
      @keydown=${(e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          const chat = e.target as Completion;
          if (!chat.hasVisibleOptions()) {
            this.handleSend();
            this.preventDefaults(e);
          }
        }
      }}
      placeholder=${'Type something here'}
      textarea
    >
    </temba-completion>`;
  }

  private getAttachments(): TemplateResult {
    // return html`<div>Hi!</div>`;
    return html`
      ${this.values && this.values.length > 0
        ? html` <div class="select-container">
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
            </div>
          </div>`
        : null}
    `;
  }

  private getActions(): TemplateResult {
    // return html`<div>Hi!</div>`;
    return html`
      ${this.uploading
        ? html` <temba-loading units="3" size="12"></temba-loading>`
        : html` <input
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
                @click="${this.handleUploadFileClicked}"
                clickable
              ></temba-icon>
              ${this.uploadError
                ? html` <div class="upload-error">${this.uploadError}</div>`
                : null}
            </label>
            <temba-button
              id="send-button"
              name="Send"
              @click=${this.handleSend}
              ?disabled=${this.currentChat.trim().length === 0}
            ></temba-button>`}
    `;
  }
}
