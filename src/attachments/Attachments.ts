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

export interface Attachment {
  uuid: string;
  content_type: string;
  url: string;
  filename: string;
  size: number;
  error: string;
}

export const upload_endpoint = '/api/v2/media.json';

export class Attachments extends FormElement {
  static get styles() {
    return css`
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

      #upload-input {
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
    `;
  }

  @property({ type: String })
  accept = ''; //e.g. ".xls,.xlsx"

  @property({ type: String, attribute: false })
  endpoint = upload_endpoint;

  @property({ type: Boolean, attribute: false })
  uploading: boolean;

  @property({ type: Array })
  currentAttachments: Attachment[] = [];

  @property({ type: Array, attribute: false })
  failedAttachments: Attachment[] = [];

  public constructor() {
    super();
  }

  public updated(changes: Map<string, any>): void {
    super.updated(changes);

    if (changes.has('currentAttachments')) {
      this.fireCustomEvent(CustomEventType.ContentChanged, this.currentAttachments);
    }
  }

  private handleDragDropped(evt: CustomEvent): void {
    debugger;
    const de = evt.detail.de as DragEvent;
    const dt = de.dataTransfer;
    if (dt) {
      const files = dt.files;
      this.uploadFiles(files);
    }
  }

  private handleUploadFileIconClicked(): void {
    this.dispatchEvent(new Event('change'));
  }

  private handleUploadFileInputChanged(evt: Event): void {
    const target = evt.target as HTMLInputElement;
    const files = target.files;
    this.uploadFiles(files);
  }

  public uploadFiles(files: FileList): void {
    let filesToUpload = [];
    if (this.currentAttachments && this.currentAttachments.length > 0) {
      //remove duplicate files that have already been uploaded
      filesToUpload = [...files].filter(file => {
        const index = this.currentAttachments.findIndex(
          value => value.filename === file.name && value.size === file.size
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
          this.addCurrentAttachment(attachment);
        }
      })
      .catch((error: WebResponse) => {
        let uploadError = '';
        if (error.status === 400) {
          uploadError = error.json.file[0];
        } else {
          uploadError = 'Server failure';
        }
        console.error(uploadError);
        this.addFailedAttachment(file, uploadError);
      })
      .finally(() => {
        this.uploading = false;
      });
  }

  private addCurrentAttachment(attachmentToAdd: any) {
    this.currentAttachments.push(attachmentToAdd);
    this.requestUpdate('currentAttachments');
    this.addValue(attachmentToAdd);
  }

  private removeCurrentAttachment(attachmentToRemove: any) {
    this.currentAttachments = this.currentAttachments.filter(
      currentAttachment => currentAttachment !== attachmentToRemove
    );
    this.requestUpdate('currentAttachments');
    this.removeValue(attachmentToRemove);
  }

  private addFailedAttachment(file: File, error: string) {
    const failedAttachment = {
      uuid: Math.random().toString(36).slice(2, 6),
      content_type: file.type,
      filename: file.name,
      url: file.name,
      size: file.size,
      error: error,
    } as Attachment;
    this.failedAttachments.push(failedAttachment);
    this.requestUpdate('failedAttachments');
  }

  private removeFailedAttachment(attachmentToRemove: any) {
    this.failedAttachments = this.failedAttachments.filter(
      (failedAttachment: any) => failedAttachment !== attachmentToRemove
    );
    this.requestUpdate('failedAttachments');
  }

  private handleRemoveFileClicked(evt: Event): void {
    const target = evt.target as HTMLDivElement;

    const currentAttachmentToRemove = this.currentAttachments.find(
      ({ uuid }) => uuid === target.id
    );
    if (currentAttachmentToRemove) {
      this.removeCurrentAttachment(currentAttachmentToRemove);
    }

    const failedAttachmentToRemove = this.failedAttachments.find(
      ({ uuid }) => uuid === target.id
    );
    if (failedAttachmentToRemove) {
      this.removeFailedAttachment(failedAttachmentToRemove);
    }
  }

  public render(): TemplateResult {
    return html`
      <temba-attachments-drop-zone
        @temba-drag-dropped=${this.handleDragDropped.bind(this)}
      >
        <div slot="inner-components" class="inner-components">
          <div class="items attachments">
            ${this.getAttachments()}
          </div>
          <div class="items actions">${this.getActions()}</div>
        </div>
      </temba-drop-zone>
    `;
  }

  private getAttachments(): TemplateResult {
    return html`
      ${(this.currentAttachments && this.currentAttachments.length > 0) ||
      (this.failedAttachments && this.failedAttachments.length > 0)
        ? html` <div class="attachments-list">
            ${this.currentAttachments.map(validAttachment => {
              return html` <div class="attachment-item">
                <div
                  class="remove-item"
                  @click="${this.handleRemoveFileClicked}"
                >
                  <temba-icon
                    id="${validAttachment.uuid}"
                    name="${Icon.delete_small}"
                  ></temba-icon>
                </div>
                <div class="attachment-name">
                  <span
                    title="${validAttachment.filename} (${formatFileSize(
                      validAttachment.size,
                      2
                    )}) ${validAttachment.content_type}"
                    >${truncate(validAttachment.filename, 25)}
                    (${formatFileSize(validAttachment.size, 0)})
                    ${formatFileType(validAttachment.content_type)}</span
                  >
                </div>
              </div>`;
            })}
            ${this.failedAttachments.map(invalidAttachment => {
              return html` <div class="attachment-item error">
                <div
                  class="remove-item error"
                  @click="${this.handleRemoveFileClicked}"
                >
                  <temba-icon
                    id="${invalidAttachment.uuid}"
                    name="${Icon.delete_small}"
                  ></temba-icon>
                </div>
                <div class="attachment-name">
                  <span
                    title="${invalidAttachment.filename} (${formatFileSize(
                      0,
                      0
                    )}) - Attachment failed - ${invalidAttachment.error}"
                    >${truncate(invalidAttachment.filename, 25)}
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
        ${this.getUploader()}
      </div>
      <div class="actions-center"></div>
      <div class="actions-right">
      </div>
    `;
  }

  private getUploader(): TemplateResult {
    if (this.uploading) {
      return html`<temba-loading units="3" size="12"></temba-loading>`;
    } else {
      return html` <input
          type="file"
          id="upload-input"
          multiple
          accept="${this.accept}"
          @change="${this.handleUploadFileInputChanged}"
        />
        <label
          id="upload-label"
          class="actions-left upload-label"
          for="upload-input"
        >
          <temba-icon
            id="upload-icon"
            class="upload-icon"
            name="${Icon.attachment}"
            @click="${this.handleUploadFileIconClicked}"
            clickable
          ></temba-icon>
        </label>`;
    }
  }
}