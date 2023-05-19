import { TemplateResult, html, css } from 'lit';
import { FormElement } from '../FormElement';
import { property } from 'lit/decorators.js';
import { Attachment, AttachmentsUploader } from './AttachmentsUploader';
import { AttachmentsList } from './AttachmentsList';

export class AttachmentsPicker extends FormElement {
  static get styles() {
    return css`
      .attachments {
        display: flex;
        flex-direction: column;
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
  uploadIcon = 'attachment';

  @property({ type: String })
  removeIcon = 'delete_small';

  @property({ type: Number })
  maxAttachments = 3;

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

  private handleAttachmentsAdded(evt: CustomEvent): void {
    this.currentAttachments = evt.detail.currentAttachments;
    this.failedAttachments = evt.detail.failedAttachments;

    const attachmentsList = this.shadowRoot.querySelector(
      'temba-attachments-list'
    ) as AttachmentsList;
    attachmentsList.requestUpdate();
  }

  private handleAttachmentsRemoved(evt: CustomEvent): void {
    this.currentAttachments = evt.detail.currentAttachments;
    this.failedAttachments = evt.detail.failedAttachments;

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
        <slot></slot>
        <div class="items attachments">${this.getAttachments()}</div>
        <div class="items actions">${this.getActions()}</div>
      </temba-attachments-drop-zone>
    `;
  }

  private getAttachments(): TemplateResult {
    return html`
      <temba-attachments-list
        .currentAttachments="${this.currentAttachments}"
        .failedAttachments="${this.failedAttachments}"
        removeIcon="${this.removeIcon}"
        @temba-content-changed="${this.handleAttachmentsRemoved.bind(this)}"
      >
      </temba-attachments-list>
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
        uploadIcon="${this.uploadIcon}"
        maxAttachments="${this.maxAttachments}"
        @temba-content-changed="${this.handleAttachmentsAdded.bind(this)}"
      >
      </temba-attachments-uploader>
    `;
  }
}
