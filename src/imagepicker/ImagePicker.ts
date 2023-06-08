import { TemplateResult, html, css } from 'lit';
import { FormElement } from '../FormElement';
import { property } from 'lit/decorators.js';
import { AttachmentsUploader } from '../attachments/AttachmentsUploader';
import {
  Attachment,
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
        border-radius: var(--curvature-widget);
        width: 100px;
        height: 100px;
        display: flex;
        margin: 10px 0px;
      }
      .missing-icon {
        color: rgb(102, 102, 102, 0.25);
        background-color: rgba(100, 100, 100, 0.05);
      }
      .attachment-image {
        background-image: none;
        background-repeat: no-repeat;
        background-position: center;
        background-size: cover;
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
  uploadIcon = 'attachment_image';

  @property({ type: String })
  uploadLabel = '';

  @property({ type: String })
  removeIcon = 'delete';

  @property({ type: Number })
  maxAttachments = 1;

  @property({ type: Number })
  maxFileSize = 26214400; //25 MB, accepts bytes

  @property({ type: Number })
  imageWidth = 100; //accepts pixels

  @property({ type: Number })
  imageHeight = 100; //accepts pixels

  @property({ type: String })
  imageRadius = 'var(--curvature-widget)'; //accepts pixels or percentage

  @property({ type: Object })
  currentAttachment: Attachment;

  @property({ type: Array })
  currentAttachments: Attachment[] = [];

  @property({ type: Array })
  failedAttachments: Attachment[] = [];

  public constructor() {
    super();
  }

  public firstUpdated(changes: Map<string, any>): void {
    super.firstUpdated(changes);

    // initialize all children component's properties
    this.deserializeAttachmentsValue();

    // initialize all children component's properties
    const attachmentsUploader = this.shadowRoot.querySelector(
      'temba-attachments-uploader'
    ) as AttachmentsUploader;
    if (attachmentsUploader) {
      attachmentsUploader.currentAttachments = this.currentAttachments;
      attachmentsUploader.failedAttachments = this.failedAttachments;
    }
  }

  public updated(changes: Map<string, any>): void {
    super.updated(changes);

    if (changes.has('currentAttachments')) {
      this.serializeAttachmentsValue();
    }
  }

  private deserializeAttachmentsValue(): void {
    if (this.value) {
      const parsedValue = JSON.parse(this.value);
      this.currentAttachments = parsedValue.attachments;
    }
  }

  private serializeAttachmentsValue(): void {
    const attachmentsValue = {
      attachments: this.currentAttachments,
    };
    // update this.value...
    this.value = JSON.stringify(attachmentsValue);
    // and then also update this.values...
    // so that the hidden input is updated via FormElement.updateInputs()
    this.values = [attachmentsValue];
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
    result = validateImageDimensions(
      result.validFiles,
      result.invalidFiles,
      this.imageWidth,
      this.imageHeight
    );

    const attachmentsUploader = this.shadowRoot.querySelector(
      'temba-attachments-uploader'
    ) as AttachmentsUploader;
    attachmentsUploader.uploadFiles(result);
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
      // this.currentAttachment.url = '../../test-assets/img/20mb.jpg'
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
    return this.imageWidth + 25;
  }

  private getUploadLabel(): string {
    return capitalize(this.uploadLabel as any);
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
          uploadLabel="${this.getUploadLabel()}"
          @temba-drag-dropped=${this.handleDragDropped}
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
              class="image-item attachment-image"
              style="background-image:url(${this.currentAttachment
                .url});border-radius:${this.imageRadius};width:${this
                .imageWidth}px;height:${this.imageHeight}px;"
            ></div>`
        : null}
    `;
  }

  private getActions(): TemplateResult {
    return html`
      <div class="action-item">${this.getUploader()}</div>
      ${this.currentAttachment ? this.getRemoveAction() : null}
    `;
  }

  private getUploader(): TemplateResult {
    return html`
      <temba-attachments-uploader
        .currentAttachments="${this.currentAttachments}"
        .failedAttachments="${this.failedAttachments}"
        uploadIcon="${this.uploadIcon}"
        uploadLabel="${this.getUploadLabel()}"
        maxAttachments="1"
        maxFileSize="${this.maxFileSize}"
        @temba-content-changed=${this.handleAttachmentAdded}
        @temba-upload-started=${this.handleUploadValidation}
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
