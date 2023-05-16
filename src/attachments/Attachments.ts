import { TemplateResult, html, css } from 'lit';
import { FormElement } from '../FormElement';
import { property } from 'lit/decorators.js';
import { AttachmentsUploader } from './AttachmentsUploader';
import { AttachmentsList } from './AttachmentsList';

export interface Attachment {
  uuid: string;
  content_type: string;
  url: string;
  filename: string;
  size: number;
  error: string;
}

export const upload_endpoint = '/api/v2/media.json';

export class Attachments extends FormElement {
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

  @property({ type: Array })
  currentAttachments: Attachment[] = [];

  @property({ type: Array, attribute: false })
  failedAttachments: Attachment[] = [];

  public constructor() {
    super();
  }

  public updated(changes: Map<string, any>): void {
    console.log('Attachments - updated');
    super.updated(changes);

    if (changes.has('currentAttachments') || changes.has('failedAttachments')) {
      console.log('Attachments - updated - old values...');
      changes.forEach((oldValue, propName) => {
        console.log(`${propName} changed. oldValue: ${oldValue}`);
      });
      console.log('Attachments - updated - new values...');
      console.log('currentAttachments', this.currentAttachments);
      console.log('failedAttachments', this.failedAttachments);

      console.log('Attachments - updated - uploader...');
      const attachmentsUploader = this.shadowRoot.querySelector(
        'temba-attachments-uploader'
      ) as AttachmentsUploader;
      if (attachmentsUploader) {
        console.log(
          'currentAttachments',
          attachmentsUploader.currentAttachments
        );
        console.log('failedAttachments', attachmentsUploader.failedAttachments);
      }

      console.log('Attachments - updated - list...');
      const attachmentsList = this.shadowRoot.querySelector(
        'temba-attachments-list'
      ) as AttachmentsList;
      if (attachmentsList) {
        console.log('currentAttachments', attachmentsList.currentAttachments);
        console.log('failedAttachments', attachmentsList.failedAttachments);
      }
    }
  }

  private handleDragDropped(evt: CustomEvent): void {
    console.log('Attachments - handleDragDropped');
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
    console.log('Attachments - handleAttachmentsAdded');
    this.currentAttachments = evt.detail.currentAttachments;
    this.failedAttachments = evt.detail.failedAttachments;

    console.log('currentAttachments', this.currentAttachments);
    console.log('failedAttachments', this.failedAttachments);

    console.log('Attachments - handleAttachmentsAdded - uploader...');
    const attachmentsUploader = this.shadowRoot.querySelector(
      'temba-attachments-uploader'
    ) as AttachmentsUploader;
    if (attachmentsUploader) {
      console.log('currentAttachments', attachmentsUploader.currentAttachments);
      console.log('failedAttachments', attachmentsUploader.failedAttachments);
    }

    console.log('Attachments - handleAttachmentsAdded - list...');
    const attachmentsList = this.shadowRoot.querySelector(
      'temba-attachments-list'
    ) as AttachmentsList;
    if (attachmentsList) {
      console.log('currentAttachments', attachmentsList.currentAttachments);
      console.log('failedAttachments', attachmentsList.failedAttachments);
    }

    attachmentsList.requestUpdate();
  }

  private handleAttachmentsRemoved(evt: CustomEvent): void {
    console.log('Attachments - handleAttachmentsRemoved');
    this.currentAttachments = evt.detail.currentAttachments;
    this.failedAttachments = evt.detail.failedAttachments;

    console.log('currentAttachments', this.currentAttachments);
    console.log('failedAttachments', this.failedAttachments);

    console.log('Attachments - handleAttachmentsRemoved - uploader...');
    const attachmentsUploader = this.shadowRoot.querySelector(
      'temba-attachments-uploader'
    ) as AttachmentsUploader;
    if (attachmentsUploader) {
      console.log('currentAttachments', attachmentsUploader.currentAttachments);
      console.log('failedAttachments', attachmentsUploader.failedAttachments);
    }

    console.log('Attachments - handleAttachmentsRemoved - list...');
    const attachmentsList = this.shadowRoot.querySelector(
      'temba-attachments-list'
    ) as AttachmentsList;
    if (attachmentsList) {
      console.log('currentAttachments', attachmentsList.currentAttachments);
      console.log('failedAttachments', attachmentsList.failedAttachments);
    }

    attachmentsUploader.requestUpdate();
  }

  public render(): TemplateResult {
    console.log('Attachments - render');
    return html`
      <temba-attachments-drop-zone
        @temba-drag-dropped="${this.handleDragDropped.bind(this)}"
      >
        <div slot="inner-components">
          <div class="items attachments">${this.getAttachments()}</div>
          <div class="items actions">${this.getActions()}</div>
        </div>
      </temba-attachments-drop-zone>
    `;
  }

  private getAttachments(): TemplateResult {
    console.log('Attachments - getAttachments');
    return html`
      <temba-attachments-list
        .currentAttachments="${this.currentAttachments}"
        .failedAttachments="${this.failedAttachments}"
        @temba-content-changed="${this.handleAttachmentsRemoved.bind(this)}"
      >
      </temba-attachments-list>
    `;
  }

  private getActions(): TemplateResult {
    console.log('Attachments - getActions');
    return html`
      <div class="actions-left">${this.getUploader()}</div>
      <div class="actions-center"></div>
      <div class="actions-right"></div>
    `;
  }

  private getUploader(): TemplateResult {
    console.log('Attachments - getUploader');
    return html`
      <temba-attachments-uploader
        .currentAttachments="${this.currentAttachments}"
        .failedAttachments="${this.failedAttachments}"
        @temba-content-changed="${this.handleAttachmentsAdded.bind(this)}"
      >
      </temba-attachments-uploader>
    `;
  }
}
