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
        align-items: flex-start;
      }
      .image-item img {
        border-radius: 50%;
        height: 200px;
        width: 200px;
      }
      .remove-item {
        cursor: pointer !important;
        padding: 3px 6px;
        background: rgba(100, 100, 100, 0.05);
      }
      .remove-item:hover {
        background: rgba(100, 100, 100, 0.1);
      }

      .actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-left: 0.25em;
        padding: 0.2em;
      }
      .actions-right {
        display: flex;
        align-items: center;
      }
    `;
  }

  @property({ type: String })
  uploadIcon = 'attachment_logo';

  @property({ type: String })
  removeIcon = 'delete_small';

  @property({})
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
        @temba-drag-dropped="${this.handleDragDropped.bind(this)}"
      >
        <div slot="inner-components">
          <div class="items image">${this.getImage()}</div>
          <div class="items actions">${this.getActions()}</div>
        </div>
      </temba-attachments-drop-zone>
    `;
  }

  private getImage(): TemplateResult {
    // todo display x or trash to delete
    return html`
      ${this.currentAttachment
        ? html`
          <div class="image-item">
            <img src=${this.currentAttachment.url}
            ></img>
          </div>
          <div class="remove-item">
            <temba-icon
              id=${this.currentAttachment.uuid}
              name="icon.${this.removeIcon}"
              @click=${this.handleAttachmentRemoved}
            >
            </temba-icon>
          </div>`
        : null}
    `;
  }

  private getActions(): TemplateResult {
    return html`
      <div class="actions-left">${this.getUploader()}</div>
      <div class="actions-center"></div>
      <div class="actions-right"></div>
    `;
  }

  private getUploader(): TemplateResult {
    return html`
      <temba-attachments-uploader
        .currentAttachments="${this.currentAttachments}"
        .failedAttachments="${this.failedAttachments}"
        maxAttachments="1"
        uploadIcon="${this.uploadIcon}"
        @temba-content-changed="${this.handleAttachmentAdded.bind(this)}"
      >
      </temba-attachments-uploader>
    `;
  }
}
