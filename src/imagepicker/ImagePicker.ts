import { TemplateResult, html, css } from 'lit';
import { FormElement } from '../FormElement';
import { property } from 'lit/decorators.js';
import { AttachmentsUploader } from '../attachments/AttachmentsUploader';
import {
  Attachment,
  ImageType,
  UploadFile,
  UploadValidationResult,
  validateImageDimensions,
  validateMaxFileSize,
} from '../attachments/attachments';
import { capitalize } from '../utils';
import { Icon } from '../vectoricon';

export class ImagePicker extends FormElement {
  static get styles() {
    return css`
      .image {
        display: flex;
        justify-content: center;
      }
      .image-item {
        display: flex;
      }

      .image-image,
      .avatar-image,
      .logo-image {
        background-image: none;
        background-repeat: no-repeat;
        background-position: center;
        background-size: cover;
      }
      .image-image,
      .missing-image {
        border-radius: var(--curvature-widget);
        width: 100px;
        height: 100px;
        margin: 5px 0px;
      }
      .avatar-image {
        border-radius: 50%;
        width: 100px;
        height: 100px;
      }
      .logo-image {
        border-radius: var(--curvature-widget);
        width: 200px;
        height: 125px;
        margin: 15px 0px;
      }
      .missing-icon {
        color: rgb(102, 102, 102, 0.25);
        background-color: rgba(100, 100, 100, 0.05);
        border-radius: var(--curvature-widget);
      }

      .actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-left: 0.25em;
        padding: 0.2em;
      }
      .remove-icon {
        color: rgb(102, 102, 102);
      }
    `;
  }

  @property({ type: String })
  imageType = 'image';

  @property({ type: String })
  uploadIcon = 'attachment_image';

  @property({ type: String })
  uploadText = 'Upload';

  // @property({ type: Number })
  // dropWidth = 125; //px

  @property({ type: String })
  removeIcon = 'delete';

  @property({ type: Number })
  maxAttachments = 1;

  @property({ type: Number })
  maxFileSize = 26214400; //bytes, 204800 = 200KB, 1024000 = 1MB, 26214400 = 25MB

  // @property({ type: Number })
  // imageWidth = 100; //px

  // @property({ type: Number })
  // imageHeight = 100; //px

  @property({ type: Object })
  currentAttachment: Attachment;

  @property({ type: Array })
  currentAttachments: Attachment[] = [];

  @property({ type: Array })
  failedAttachments: Attachment[] = [];

  // @property({ type: String })
  // helpText = 'todo';

  public constructor() {
    super();
  }

  public updated(changes: Map<string, any>): void {
    super.updated(changes);
  }

  private handleDragDropped(evt: CustomEvent): void {
    const de = evt.detail.de as DragEvent;
    const dt = de.dataTransfer;
    if (dt) {
      const files = dt.files;
      const attachmentsUploader = this.shadowRoot.querySelector(
        'temba-attachments-uploader'
      ) as AttachmentsUploader;
      attachmentsUploader.inspectFiles(files);
    }
  }

  private handleUploadValidation(evt: CustomEvent): void {
    const files: UploadFile[] = [evt.detail.files[0]];

    let result: UploadValidationResult = {
      validFiles: files,
      invalidFiles: [],
    };
    result = validateMaxFileSize(
      result.validFiles,
      result.invalidFiles,
      this.maxFileSize
    );

    const [imageWidth, imageHeight] = this.getImageDimensions();

    result = validateImageDimensions(
      result.validFiles,
      result.invalidFiles,
      imageWidth,
      imageHeight,
      this.imageType
    );

    const attachmentsUploader = this.shadowRoot.querySelector(
      'temba-attachments-uploader'
    ) as AttachmentsUploader;
    attachmentsUploader.uploadFiles(result);
  }

  private getImageDimensions(): [number, number] {
    return this.imageType === ImageType.Logo ? [200, 125] : [100, 100];
  }

  private handleAttachmentAdded(evt: CustomEvent): void {
    this.currentAttachments = evt.detail.currentAttachments;
    this.failedAttachments = evt.detail.failedAttachments;
    this.currentAttachment = null;
    this.errors = [];

    if (this.currentAttachments.length > 0) {
      this.currentAttachment = this.currentAttachments[0];
    } else if (this.failedAttachments.length > 0) {
      this.currentAttachment = this.failedAttachments[0];
      this.errors = [this.currentAttachment.error];

      // temp hack - spoof a successful file upload
      // this.currentAttachment.url = '../../test-assets/img/meow.jpg'
      // this.currentAttachment.error = '';
      // this.errors = [];
    }
  }

  private handleAttachmentRemoved(): void {
    this.currentAttachments = [];
    this.failedAttachments = [];
    this.currentAttachment = null;

    const attachmentsUploader = this.shadowRoot.querySelector(
      'temba-attachments-uploader'
    ) as AttachmentsUploader;
    attachmentsUploader.requestUpdate();
  }

  private getDropZoneWidth(): number {
    return this.imageType === ImageType.Logo ? 250 : 125;
  }

  private getDropZoneText(): string {
    return this.uploadText + ' ' + capitalize(this.imageType as any);
  }

  public render(): TemplateResult {
    return html`
      <temba-field
        name=${this.name}
        .helpText=${this.helpText}
        .errors=${this.errors}
        .widgetOnly=${this.widgetOnly}
        value=${this.value}
      >
        <temba-attachments-drop-zone
          dropWidth="${this.getDropZoneWidth()}"
          dropText="${this.getDropZoneText()}"
          @temba-drag-dropped=${this.handleDragDropped.bind(this)}
        >
          <div class="items image">${this.getImage()}</div>
          <div class="items actions">${this.getActions()}</div>
        </temba-attachments-drop-zone>
      </temba-field>
    `;
  }

  private getImage(): TemplateResult {
    return html`
      ${this.currentAttachment
        ? this.currentAttachment.error
          ? html` <div class="image-item missing-image">
              <temba-icon
                class="missing-icon"
                name="${Icon.attachment_error}"
                size="5"
              ></temba-icon>
            </div>`
          : html` <div
              class="image-item ${this.imageType}-image"
              style="background-image:url(${this.currentAttachment.url});"
            ></div>`
        : null}
    `;
  }

  private getActions(): TemplateResult {
    return html`
      <div class="action-item">${this.getUploader()}</div>
      ${this.currentAttachment //&& !this.currentAttachment.error
        ? this.getRemoveAction()
        : null}
    `;
  }

  private getUploader(): TemplateResult {
    return html`
      <temba-attachments-uploader
        .currentAttachments="${this.currentAttachments}"
        .failedAttachments="${this.failedAttachments}"
        uploadIcon="${this.uploadIcon}"
        uploadText="${this.uploadText +
        ' ' +
        capitalize(this.imageType as any)}"
        maxAttachments="1"
        maxFileSize="${this.maxFileSize}"
        @temba-content-changed=${this.handleAttachmentAdded.bind(this)}
        @temba-upload-started=${this.handleUploadValidation.bind(this)}
      >
      </temba-attachments-uploader>
    `;
  }

  private getRemoveAction(): TemplateResult {
    return html` <div class="action-item">
      <temba-icon
        id=${this.currentAttachment.uuid}
        class="remove-icon"
        name="icon.${this.removeIcon}"
        @click=${this.handleAttachmentRemoved}
        clickable
      >
      </temba-icon>
    </div>`;
  }
}
