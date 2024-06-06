import { TemplateResult, css, html } from 'lit';
import { RapidElement } from '../RapidElement';
import { property } from 'lit/decorators.js';
import { Attachment } from '../interfaces';
import { Icon } from '../vectoricon';
import {
  DEFAULT_MEDIA_ENDPOINT,
  WebResponse,
  formatFileSize,
  getClasses,
  isImageAttachment,
  postFormData,
  truncate
} from '../utils';

const verifyAccept = (type: string, accept: string): boolean => {
  const allowed = accept.split(',').map((x) => x.trim());
  return allowed.includes(type) || allowed.includes(type.split('/')[0] + '/*');
};

export class MediaPicker extends RapidElement {
  static get styles() {
    return css`
      .drop-mask {
        border-radius: var(--curvature-widget);
        transition: opacity ease-in-out var(--transition-speed);
      }

      .highlight .drop-mask {
        background: rgba(210, 243, 184, 0.8);
      }

      .drop-mask > div {
        margin: auto;
        border-radius: var(--curvature-widget);
        font-weight: 400;
        color: rgba(0, 0, 0, 0.5);
      }

      .attachments {
      }

      .attachments-list {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        padding: 0.2em;
      }

      .attachment-item {
        padding: 0.4em;
      }

      .attachment-item.error {
        background: #fff;
        color: rgba(250, 0, 0, 0.75);
        padding: 0.2em;
        margin: 0.3em 0.5em;
        border-radius: var(--curvature);
        display: block;
      }

      .remove-item {
        --icon-color: #ccc;
        background: #fff;
        border-radius: 99%;
        transition: transform 200ms linear;
        transform: scale(0);
        display: block;
        margin-bottom: -24px;
        margin-left: 10px;
        width: 1em;
        height: 1em;
      }

      .attachment-item:hover .remove-item {
        transform: scale(1);
      }

      .remove-item:hover {
        --icon-color: #333;
        cursor: pointer;
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

      .add-attachment {
        padding: 1em;
        background-color: rgba(0, 0, 0, 0.05);
        border-radius: var(--curvature);
        color: #aaa;
        margin: 0.5em;
      }

      .add-attachment:hover {
        background-color: rgba(0, 0, 0, 0.07);
        cursor: pointer;
      }
    `;
  }

  @property({ type: String, attribute: false })
  endpoint = DEFAULT_MEDIA_ENDPOINT;

  @property({ type: Boolean })
  pendingDrop: boolean;

  @property({ type: String })
  icon = Icon.add;

  @property({ type: String })
  accept = ''; //e.g. ".xls,.xlsx"

  @property({ type: Number })
  max = 3;

  @property({ type: Array })
  attachments: Attachment[] = [];

  @property({ type: Array, attribute: false })
  failedAttachments: Attachment[] = [];

  @property({ type: Boolean, attribute: false })
  uploading: boolean;

  public updated(changes: Map<string, any>): void {
    super.updated(changes);
    if (changes.has('attachments')) {
      // make sure all of our attachments have uuids
      this.attachments.forEach((attachment) => {
        if (!attachment.uuid) {
          attachment.uuid = attachment.url;
          this.requestUpdate();
        }
      });

      if (changes.get('attachments') !== undefined) {
        this.dispatchEvent(new Event('change'));
      }
    }
  }

  private getAcceptableFiles(evt: DragEvent): File[] {
    const dt = evt.dataTransfer;
    if (dt) {
      const files = [...dt.files];
      return files.filter((file) => verifyAccept(file.type, this.accept));
    }
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
    if (this.canAcceptAttachments()) {
      this.uploadFiles(this.getAcceptableFiles(evt));
    }
  }

  public canAcceptAttachments() {
    return this.attachments.length < this.max;
  }

  private highlight(evt: DragEvent): void {
    evt.preventDefault();
    evt.stopPropagation();
    if (this.canAcceptAttachments()) {
      this.pendingDrop = true;
    }
  }

  private unhighlight(evt: DragEvent): void {
    evt.preventDefault();
    evt.stopPropagation();
    this.pendingDrop = false;
  }

  private addCurrentAttachment(attachmentToAdd: any) {
    this.attachments.push(attachmentToAdd);
    this.requestUpdate('attachments');
  }

  private removeCurrentAttachment(attachmentToRemove: any) {
    this.attachments = this.attachments.filter(
      (currentAttachment) => currentAttachment !== attachmentToRemove
    );
    this.requestUpdate('attachments');
  }

  private addFailedAttachment(file: File, error: string) {
    const failedAttachment = {
      uuid: Math.random().toString(36).slice(2, 6),
      content_type: file.type,
      filename: file.name,
      url: file.name,
      size: file.size,
      error: error
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
    const currentAttachmentToRemove = this.attachments.find(
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

  private handleUploadFileInputChanged(evt: Event): void {
    const target = evt.target as HTMLInputElement;
    const files = target.files;
    this.uploadFiles([...files]);
  }

  public uploadFiles(files: File[]): void {
    let filesToUpload = [];

    //remove duplicate files that have already been uploaded
    filesToUpload = files.filter((file) => {
      // check our file type against accepts
      if (this.accept) {
        if (!verifyAccept(file.type, this.accept)) {
          return false;
        }
      }

      const index = this.attachments.findIndex(
        (value) => value.filename === file.name && value.size === file.size
      );
      if (index === -1) {
        return file;
      }
    });

    filesToUpload.map((fileToUpload) => {
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
        if (this.attachments.length >= this.max) {
          this.addFailedAttachment(file, 'Too many attachments');
        } else {
          const attachment = response.json as Attachment;
          if (attachment) {
            this.addCurrentAttachment(attachment);
          }
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

  private renderUploader(): TemplateResult {
    if (this.uploading) {
      return html`<temba-loading units="3" size="12"></temba-loading>`;
    } else {
      return this.attachments.length < this.max
        ? html`<input
              type="file"
              id="upload-input"
              ?multiple=${this.max > 1}
              accept="${this.accept}"
              @change="${this.handleUploadFileInputChanged}"
            />
            <label
              id="upload-label"
              class="actions-left upload-label"
              for="upload-input"
            >
              <div class="add-attachment">
                <temba-icon name="${this.icon}" size="1.5"></temba-icon>
              </div>
            </label>`
        : null;
    }
  }

  public render(): TemplateResult {
    return html` <div
      class=${getClasses({ container: true, highlight: this.pendingDrop })}
      @dragenter="${this.handleDragEnter}"
      @dragover="${this.handleDragOver}"
      @dragleave="${this.handleDragLeave}"
      @drop="${this.handleDrop}"
    >
      <div class="drop-mask">
        <div class="attachments-list">
          ${this.attachments.map((validAttachment) => {
            return html`<div class="attachment-item">
              <temba-icon
                class="remove-item"
                @click="${this.handleRemoveFileClicked}"
                id="${validAttachment.uuid}"
                name="${Icon.delete_small}"
              ></temba-icon>
              ${isImageAttachment(validAttachment)
                ? html`<temba-thumbnail
                    url="${validAttachment.url}"
                  ></temba-thumbnail>`
                : html`<temba-thumbnail
                    label="${validAttachment.content_type.split('/')[1]}"
                  ></temba-thumbnail>`}
            </div>`;
          })}
          ${this.renderUploader()}
        </div>
        ${this.failedAttachments.map((invalidAttachment) => {
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
        </div></div>`;
        })}
      </div>
    </div>`;
  }
}
