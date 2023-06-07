import { TemplateResult, html, css } from 'lit';
import { FormElement } from '../FormElement';
import { property } from 'lit/decorators.js';
import { AttachmentsUploader } from './AttachmentsUploader';
import { AttachmentsList } from './AttachmentsList';
import {
  Attachment,
  UploadFile,
  UploadValidationResult,
  validateDuplicateFiles,
  validateMaxAttachments,
  validateMaxFileSize,
} from './attachments';

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
    `;
  }

  @property({ type: String })
  uploadIcon = 'attachment';

  @property({ type: String })
  uploadLabel = '';

  @property({ type: String })
  removeIcon = 'delete_small';

  @property({ type: Number })
  maxAttachments = 3;

  @property({ type: Number })
  maxFileSize = 26214400; //25 MB

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
      const attachmentsUploader = this.shadowRoot.querySelector(
        'temba-attachments-uploader'
      ) as AttachmentsUploader;
      if (attachmentsUploader) {
        attachmentsUploader.currentAttachments = this.currentAttachments;
        attachmentsUploader.failedAttachments = this.failedAttachments;
      }

      const attachmentsList = this.shadowRoot.querySelector(
        'temba-attachments-list'
      ) as AttachmentsList;
      if (attachmentsList) {
        attachmentsList.currentAttachments = this.currentAttachments;
        attachmentsList.failedAttachments = this.failedAttachments;
      }
    }
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
    const files: UploadFile[] = evt.detail.files;
    let result: UploadValidationResult = {
      validFiles: files,
      invalidFiles: [],
    };

    result = validateDuplicateFiles(
      result.validFiles,
      result.invalidFiles,
      this.currentAttachments
    );
    result = validateMaxAttachments(
      result.validFiles,
      result.invalidFiles,
      this.currentAttachments,
      this.maxAttachments
    );
    result = validateMaxFileSize(
      result.validFiles,
      result.invalidFiles,
      this.maxFileSize
    );

    const attachmentsUploader = this.shadowRoot.querySelector(
      'temba-attachments-uploader'
    ) as AttachmentsUploader;
    attachmentsUploader.uploadFiles(result);
  }

  private handleAttachmentsAdded(evt: CustomEvent): void {
    this.currentAttachments = evt.detail.currentAttachments;
    this.failedAttachments = evt.detail.failedAttachments;
  }

  private handleAttachmentsRemoved(evt: CustomEvent): void {
    this.currentAttachments = evt.detail.currentAttachments;
    this.failedAttachments = evt.detail.failedAttachments;
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
          uploadLabel="${this.uploadLabel}"
          @temba-drag-dropped=${this.handleDragDropped}
        >
          <slot></slot>
          <div class="items attachments">${this.getAttachments()}</div>
          <div class="items actions">${this.getActions()}</div>
        </temba-attachments-drop-zone>
      </temba-field>
    `;
  }

  private getAttachments(): TemplateResult {
    return html`
      <temba-attachments-list
        .currentAttachments="${this.currentAttachments}"
        .failedAttachments="${this.failedAttachments}"
        removeIcon="${this.removeIcon}"
        @temba-content-changed=${this.handleAttachmentsRemoved}
      >
      </temba-attachments-list>
    `;
  }

  private getActions(): TemplateResult {
    return html` <div class="action-item">${this.getUploader()}</div> `;
  }

  private getUploader(): TemplateResult {
    return html`
      <temba-attachments-uploader
        .currentAttachments="${this.currentAttachments}"
        .failedAttachments="${this.failedAttachments}"
        uploadIcon="${this.uploadIcon}"
        uploadLabel="${this.uploadLabel}"
        maxAttachments="${this.maxAttachments}"
        maxFileSize="${this.maxFileSize}"
        @temba-content-changed=${this.handleAttachmentsAdded}
        @temba-upload-started=${this.handleUploadValidation}
      >
      </temba-attachments-uploader>
    `;
  }
}
