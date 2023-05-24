import { TemplateResult, html, css } from 'lit';
import { FormElement } from '../FormElement';
import { property } from 'lit/decorators.js';
import { CustomEventType } from '../interfaces';
import { postFormData, WebResponse } from '../utils';

export interface Attachment {
  uuid: string;
  content_type: string;
  url: string;
  filename: string;
  size: number;
  error: string;
}

export const upload_endpoint = '/api/v2/media.json';

export class AttachmentsUploader extends FormElement {
  static get styles() {
    return css`
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
      .upload-text {
        margin-left: 5px;
      }
      .upload-text:hover {
        cursor: pointer;
      }
    `;
  }

  @property({ type: String })
  accept = ''; //e.g. ".xls,.xlsx"

  @property({ type: String })
  uploadIcon: string;

  @property({ type: String })
  uploadText: string;

  @property({ type: String, attribute: false })
  endpoint = upload_endpoint;

  @property({ type: Number })
  maxAttachments: number;

  @property({ type: Boolean, attribute: false })
  uploading: boolean;

  @property({ type: Array })
  currentAttachments: Attachment[] = [];

  @property({ type: Array })
  failedAttachments: Attachment[] = [];

  public constructor() {
    super();
  }

  public firstUpdated(changes: Map<string, any>): void {
    // console.log('AttachmentsUploader firstUpdated');
    super.firstUpdated(changes);
    // console.log('AttachmentsUploader firstUpdated old currentAttachments', changes.get('currentAttachments'));
    // console.log('AttachmentsUploader firstUpdated currentAttachments', this.currentAttachments);
  }

  public updated(changes: Map<string, any>): void {
    // console.log('AttachmentsUploader updated');
    super.updated(changes);

    if (changes.has('currentAttachments') || changes.has('failedAttachments')) {
      // console.log('AttachmentsUploader updated old currentAttachments', changes.get('currentAttachments'));
      // console.log('AttachmentsUploader updated currentAttachments', this.currentAttachments);
      if (
        changes.get('currentAttachments') !== undefined ||
        changes.get('failedAttachments') !== undefined
      ) {
        this.fireCustomEvent(CustomEventType.ContentChanged, {
          currentAttachments: this.currentAttachments,
          failedAttachments: this.failedAttachments,
        });
      }
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

    if (this.maxAttachments === 1) {
      filesToUpload = [files.item(0)];
    } else {
      //remove files that will exceed max attachments
      let totalAttachments = this.currentAttachments.length + files.length;
      if (totalAttachments > this.maxAttachments) {
        if (this.currentAttachments.length === this.maxAttachments) {
          return;
        } else {
          let idx = 0;
          while (totalAttachments > this.maxAttachments) {
            filesToUpload.push(files.item(idx));
            totalAttachments =
              this.currentAttachments.length + filesToUpload.length;
            idx++;
          }
        }
      }
      if (this.currentAttachments.length > 0) {
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

  private addCurrentAttachment(attachmentToAdd: Attachment) {
    if (this.maxAttachments === 1) {
      this.currentAttachments = [attachmentToAdd];
    } else {
      this.currentAttachments.push(attachmentToAdd);
      this.requestUpdate('currentAttachments');
    }
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

    if (this.maxAttachments === 1) {
      this.failedAttachments = [failedAttachment];
    } else {
      this.failedAttachments.push(failedAttachment);
      this.requestUpdate('failedAttachments');
    }
  }

  public render(): TemplateResult {
    if (this.uploading) {
      return html`<temba-loading units="3" size="12"></temba-loading>`;
    } else {
      return html` ${this.getInput()}
        <label
          id="upload-label"
          class="actions-left upload-label"
          for="upload-input"
        >
          <temba-icon
            id="upload-icon"
            class="upload-icon"
            name="icon.${this.uploadIcon}"
            @click="${this.handleUploadFileIconClicked}"
            clickable
          ></temba-icon>
          ${this.uploadText
            ? this.currentAttachments.length === 0 &&
              this.failedAttachments.length === 0
              ? html` <div
                  class="upload-text"
                  @click="${this.handleUploadFileIconClicked}"
                >
                  ${this.uploadText}
                </div>`
              : null
            : null}
        </label>`;
    }
  }

  private getInput(): TemplateResult {
    if (this.maxAttachments > 1) {
      return html`<input
        type="file"
        id="upload-input"
        multiple
        accept="${this.accept}"
        @change="${this.handleUploadFileInputChanged}"
      />`;
    } else {
      return html`<input
        type="file"
        id="upload-input"
        single
        accept="${this.accept}"
        @change="${this.handleUploadFileInputChanged}"
      />`;
    }
  }
}
