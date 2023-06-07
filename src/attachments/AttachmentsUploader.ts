import { TemplateResult, html, css } from 'lit';
import { FormElement } from '../FormElement';
import { property } from 'lit/decorators.js';
import { CustomEventType } from '../interfaces';
import { postFormData, WebResponse } from '../utils';
import {
  Attachment,
  UploadFile,
  UploadValidationResult,
  getFileDimensions,
} from './attachments';

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
  uploadLabel = '';

  @property({ type: String, attribute: false })
  endpoint = upload_endpoint;

  @property({ type: Number })
  maxAttachments = 3;

  @property({ type: Number })
  maxFileSize = 26214400; //25 MB, accepts bytes

  @property({ type: Boolean })
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
      this.fireCustomEvent(CustomEventType.ContentChanged, {
        currentAttachments: this.currentAttachments,
        failedAttachments: this.failedAttachments,
      });
    }
  }

  private handleUploadFileIconClicked(): void {
    this.dispatchEvent(new Event('change'));
  }

  private handleUploadFileInputChanged(evt: Event): void {
    const target = evt.target as HTMLInputElement;
    const files = target.files;
    this.inspectFiles(files);
  }

  public async inspectFiles(files: FileList): Promise<void> {
    const filesToInspect = [...files];
    const getFileDimPromises = [];
    filesToInspect.map(fileToInspect => {
      const getFileDimPromise = getFileDimensions({ file: fileToInspect });
      getFileDimPromises.push(getFileDimPromise);
    });
    const filesToValidate: UploadFile[] = await Promise.all(getFileDimPromises);
    this.fireCustomEvent(CustomEventType.UploadStarted, {
      files: filesToValidate,
    });
  }

  public uploadFiles(uploadFileValidationResult: UploadValidationResult): void {
    // add any invalidFiles (files that failed client-side validation) to failedAttachments
    if (uploadFileValidationResult.invalidFiles) {
      uploadFileValidationResult.invalidFiles.map(invalidFile => {
        this.addFailedAttachment(
          invalidFile.uploadFile.file,
          invalidFile.error
        );
      });
    }

    // upload the validFiles
    const filesToUpload = uploadFileValidationResult.validFiles;
    filesToUpload.map(fileToUpload => {
      this.uploadFile(fileToUpload.file);
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

  private addCurrentAttachment(currentAttachment: Attachment) {
    if (this.maxAttachments === 1) {
      this.currentAttachments = [currentAttachment];
    } else {
      this.currentAttachments = [
        ...this.currentAttachments,
        ...[currentAttachment],
      ];
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
      this.failedAttachments = [
        ...this.failedAttachments,
        ...[failedAttachment],
      ];
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
          ${this.uploadLabel &&
          this.currentAttachments.length === 0 &&
          this.failedAttachments.length === 0
            ? html` <div
                class="upload-text"
                @click=${this.handleUploadFileIconClicked}
              >
                ${this.uploadLabel}
              </div>`
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
