import { TemplateResult, html, css } from 'lit';
import { FormElement } from '../FormElement';
import { property } from 'lit/decorators.js';
import {
  Attachment,
  AttachmentsUploader,
} from '../attachments/AttachmentsUploader';
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
        height: 100px;
        width: 100px;
      }
      .image-item img {
        border-radius: 50%;
      }
      .missing-icon {
        color: rgb(102, 102, 102, 0.25);
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
  uploadText = 'Upload Image';

  @property({ type: Number })
  maxFileSize = 204800; //200 KB //26214400; //25 MB

  @property({ type: String })
  removeIcon = 'delete';

  @property({ type: Object })
  currentAttachment: Attachment;

  @property({ type: Array })
  currentAttachments: Attachment[] = [];

  @property({ type: Array })
  failedAttachments: Attachment[] = [];

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
      attachmentsUploader.uploadFiles(files);
    }
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

  public render(): TemplateResult {
    return html`
      <temba-field
        name=${this.name}
        .errors=${this.errors}
        .widgetOnly=${this.widgetOnly}
        value=${this.value}
      >
        <temba-attachments-drop-zone
          customWidth="125px"
          dropText="${this.uploadText}"
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
        ? html` <div class="image-item">
            ${this.currentAttachment.error
              ? html` <temba-icon
                  class="missing-icon"
                  name="${Icon.attachment_error}"
                  size="5"
                ></temba-icon>`
              : html`
                    <img
                      src="${this.currentAttachment.url}">
                    </img>`}
          </div>`
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
        uploadText="${this.uploadText}"
        maxAttachments="1"
        maxFileSize="${this.maxFileSize}"
        @temba-content-changed=${this.handleAttachmentAdded.bind(this)}
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
