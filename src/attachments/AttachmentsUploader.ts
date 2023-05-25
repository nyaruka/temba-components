import { TemplateResult, html, css } from 'lit';
import { FormElement } from '../FormElement';
import { property } from 'lit/decorators.js';
import { CustomEventType } from '../interfaces';
import { formatFileSize, postFormData, WebResponse } from '../utils';

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
  uploadIcon = 'attachment';

  @property({ type: String })
  uploadText = '';

  @property({ type: String, attribute: false })
  endpoint = upload_endpoint;

  @property({ type: Number })
  maxAttachments = 3;

  @property({ type: Number })
  maxFileSize = 26214400; //25 MB

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
    super.firstUpdated(changes);
  }

  public updated(changes: Map<string, any>): void {
    super.updated(changes);

    if (changes.has('currentAttachments') || changes.has('failedAttachments')) {
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
    let filesToUpload = [...files];

    if (this.maxAttachments === 1) {
      this.currentAttachments = [];
      this.failedAttachments = [];
      filesToUpload = this.validateMaxFileSize(filesToUpload, false);
      if (filesToUpload.length > 0) {
        filesToUpload = this.validateFileDimensions(filesToUpload, false);
      }
    } else {
      filesToUpload = this.validateDuplicateFiles(filesToUpload);
      if (filesToUpload.length > 0) {
        filesToUpload = this.validateMaxAttachments(filesToUpload);
      }
      if (filesToUpload.length > 0) {
        filesToUpload = this.validateMaxFileSize(filesToUpload);
      }
    }

    filesToUpload.map(fileToUpload => {
      this.uploadFile(fileToUpload);
    });
  }

  private validateDuplicateFiles(
    files: File[],
    removeInvalidFiles = true
  ): File[] {
    if (this.currentAttachments.length === 0) {
      return files;
    } else {
      const validFiles: File[] = [];
      const invalidFiles: File[] = [];
      files.map(file => {
        const index = this.currentAttachments.findIndex(
          value => value.filename === file.name && value.size === file.size
        );
        if (index === -1) {
          validFiles.push(file);
        } else {
          invalidFiles.push(file);
        }
      });
      if (!removeInvalidFiles) {
        invalidFiles.map(file => {
          this.addFailedAttachment(file, `Duplicate file.`);
        });
      }
      return validFiles;
    }
  }

  private validateMaxAttachments(
    files: File[],
    removeInvalidFiles = true
  ): File[] {
    if (this.currentAttachments.length === this.maxAttachments) {
      return files;
    } else if (
      this.currentAttachments.length + files.length <=
      this.maxAttachments
    ) {
      return files;
    } else {
      let totalAttachments = this.currentAttachments.length + files.length;
      const validFiles: File[] = [];
      const invalidFiles: File[] = [];
      files.map(file => {
        totalAttachments = this.currentAttachments.length + validFiles.length;
        if (totalAttachments < this.maxAttachments) {
          validFiles.push(file);
        } else {
          invalidFiles.push(file);
        }
      });
      if (!removeInvalidFiles) {
        invalidFiles.map(file => {
          this.addFailedAttachment(
            file,
            `Maximum allowed attachments is ${this.maxAttachments} files.`
          );
        });
      }
      return validFiles;
    }
  }

  private validateMaxFileSize(
    files: File[],
    removeInvalidFiles = true
  ): File[] {
    const validFiles: File[] = [];
    const invalidFiles: File[] = [];
    files.map(file => {
      if (file.size <= this.maxFileSize) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file);
      }
    });
    if (!removeInvalidFiles) {
      invalidFiles.map(file => {
        this.addFailedAttachment(
          file,
          `Limit for file uploads is ${formatFileSize(this.maxFileSize, 0)}.`
        );
      });
    }
    return validFiles;
  }

  private validateFileDimensions(
    files: File[],
    removeInvalidFiles = true
  ): File[] {
    const validFiles: File[] = [];
    const invalidFiles: File[] = [];

    files.map(file => {
      const reader = new FileReader();
      reader.onload = function (e: ProgressEvent<FileReader>) {
        const image = new Image();
        image.onload = function () {
          if (image.width === image.height) {
            validFiles.push(file);
          } else {
            invalidFiles.push(file);
          }
        };
        image.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });

    if (!removeInvalidFiles) {
      invalidFiles.map(file => {
        this.addFailedAttachment(
          file,
          'Dimensions of file uploads must be equal.'
        );
      });
    }

    return validFiles;
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
            @click=${this.handleUploadFileIconClicked}
            clickable
          ></temba-icon>
          ${this.uploadText
            ? this.currentAttachments.length === 0 &&
              this.failedAttachments.length === 0
              ? html` <div
                  class="upload-text"
                  @click=${this.handleUploadFileIconClicked}
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
        @change=${this.handleUploadFileInputChanged}
      />`;
    } else {
      return html`<input
        type="file"
        id="upload-input"
        single
        accept="${this.accept}"
        @change=${this.handleUploadFileInputChanged}
      />`;
    }
  }
}
