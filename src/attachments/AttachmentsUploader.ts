import { TemplateResult, html, css } from 'lit';
import { FormElement } from '../FormElement';
import { property } from 'lit/decorators.js';
import { Icon } from '../vectoricon';
import { CustomEventType } from '../interfaces';
import { postFormData, WebResponse } from '../utils';
import { Attachment } from './Attachments';

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
    console.log('AttachmentsUploader - updated');
    super.updated(changes);

    if (changes.has('currentAttachments') || changes.has('failedAttachments')) {
      console.log('AttachmentsUploader - updated - old values...');
      changes.forEach((oldValue, propName) => {
        console.log(`${propName} changed. oldValue: ${oldValue}`);
      });
      console.log('AttachmentsUploader - updated - new values...');
      console.log('currentAttachments', this.currentAttachments);
      console.log('failedAttachments', this.failedAttachments);

      this.fireCustomEvent(CustomEventType.ContentChanged, {
        currentAttachments: this.currentAttachments,
        failedAttachments: this.failedAttachments,
      });
    }
  }

  private handleUploadFileIconClicked(): void {
    console.log('AttachmentsUploader - handleUploadFileIconClicked');
    this.dispatchEvent(new Event('change'));
  }

  private handleUploadFileInputChanged(evt: Event): void {
    console.log('AttachmentsUploader - handleUploadFileInputChanged');
    const target = evt.target as HTMLInputElement;
    const files = target.files;
    this.uploadFiles(files);
  }

  public uploadFiles(files: FileList): void {
    console.log('AttachmentsUploader - uploadFiles');
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
    console.log('AttachmentsUploader - uploadFile');
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
    console.log('AttachmentsUploader - addCurrentAttachment');
    this.currentAttachments.push(attachmentToAdd);
    this.requestUpdate('currentAttachments');
  }

  private addFailedAttachment(file: File, error: string) {
    console.log('AttachmentsUploader - addFailedAttachment');
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

  public render(): TemplateResult {
    console.log('AttachmentsUploader - render');
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
