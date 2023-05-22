import { TemplateResult, html, css } from 'lit';
import { FormElement } from '../FormElement';
import { property } from 'lit/decorators.js';
import {
  Attachment,
  AttachmentsUploader,
} from '../attachments/AttachmentsUploader';
import { AttachmentsList } from '../attachments/AttachmentsList';

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

      .actions {
        display: flex;
        justify-content: space-between; //todo finalize re: space-between vs. space-around vs. space-evenly
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
  removeIcon = 'delete_small';

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

    //temporary hack
    if (this.failedAttachments.length > 0) {
      this.currentAttachment = this.failedAttachments[0];
      this.currentAttachment.url = './../test-assets/img/meow.jpg';
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
            <img src=${this.currentAttachment.url}></img>
            </div>
          </div>`
        : null}
    `;
  }

  private getActions(): TemplateResult {
    return html`
      <div class="action-item">${this.getUploader()}</div>
      ${this.currentAttachment
        ? html` <div class="action-item">
            <temba-icon
              id=${this.currentAttachment.uuid}
              class="remove-icon"
              name="icon.${this.removeIcon}"
              @click=${this.handleAttachmentRemoved}
              clickable
            >
            </temba-icon>
          </div>`
        : null}
    `;
  }

  private getUploader(): TemplateResult {
    return html`
      <temba-attachments-uploader
        .currentAttachments="${this.currentAttachments}"
        .failedAttachments="${this.failedAttachments}"
        uploadIcon="${this.uploadIcon}"
        maxAttachments="1"
        @temba-content-changed="${this.handleAttachmentAdded.bind(this)}"
      >
      </temba-attachments-uploader>
    `;
  }
}
