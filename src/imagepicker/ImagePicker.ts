import { TemplateResult, html, css } from 'lit';
import { FormElement } from '../FormElement';
import { property } from 'lit/decorators.js';
import {
  Attachment,
  AttachmentsUploader,
} from '../attachments/AttachmentsUploader';
import { AttachmentsList } from '../attachments/AttachmentsList';
import { Icon } from '../vectoricon';

export class ImagePicker extends FormElement {
  static get styles() {
    return css`
      .image {
        display: flex;
        justify-content: center;
      }
      .image-item img {
        border-radius: 50%;
        height: 100px;
        width: 100px;
      }
      //todo - remove if we display custom image
      .error-item img {
        border-radius: 0%;
        height: 20px;
        width: 20px;
        margin: 5px;
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

    if (this.currentAttachments.length > 0) {
      this.currentAttachment = this.currentAttachments[0];
    } else if (this.failedAttachments.length > 0) {
      this.currentAttachment = this.failedAttachments[0];
      //todo - temporary hack
      this.currentAttachment.url =
        './../test-assets/img/no_image_available.jpeg';
    } else {
      this.currentAttachment = null;
    }

    const attachmentsList = this.shadowRoot.querySelector(
      'temba-attachments-uploader'
    ) as AttachmentsList;
    attachmentsList.requestUpdate();
  }

  private handleAttachmentRemoved(evt: Event): void {
    this.currentAttachment = null;
    this.currentAttachments = [];
    this.failedAttachments = [];

    const attachmentsUploader = this.shadowRoot.querySelector(
      'temba-attachments-uploader'
    ) as AttachmentsUploader;
    attachmentsUploader.requestUpdate();
  }

  public render(): TemplateResult {
    return html`
      <temba-attachments-drop-zone
        customWidth="125px"
        dropText="${this.uploadText}"
        @temba-drag-dropped="${this.handleDragDropped.bind(this)}"
      >
        <div class="items image">${this.getImage()}</div>
        <div class="items actions">${this.getActions()}</div>
      </temba-attachments-drop-zone>
    `;
  }

  private getImage(): TemplateResult {
    return html`
      ${this.currentAttachment
        ? html`
          <div class="image-item">
            <img 
              src="${this.currentAttachment.url}"
              title="${
                this.currentAttachment.error
                  ? 'Upload failed - ' + this.currentAttachment.error
                  : null
              }"></img>
            </div>
          </div>`
        : null}
    `;
  }

  private getActions(): TemplateResult {
    return html`
      <div class="action-item">${this.getUploader()}</div>
      <div class="action-item">
        ${this.currentAttachment ? this.getRemoveAction() : null}
      </div>
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
        @temba-content-changed="${this.handleAttachmentAdded.bind(this)}"
      >
      </temba-attachments-uploader>
    `;
  }

  private getRemoveAction(): TemplateResult {
    return html` <temba-icon
      id=${this.currentAttachment.uuid}
      class="remove-icon"
      name="${Icon.delete}"
      @click=${this.handleAttachmentRemoved}
      clickable
    >
    </temba-icon>`;
  }
}
