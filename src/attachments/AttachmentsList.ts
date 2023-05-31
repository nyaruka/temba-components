import { TemplateResult, html, css } from 'lit';
import { FormElement } from '../FormElement';
import { property } from 'lit/decorators.js';
import { Icon } from '../vectoricon';
import { CustomEventType } from '../interfaces';
import { formatFileSize, formatFileType, truncate } from '../utils';
import { Attachment } from './attachments';

export class AttachmentsList extends FormElement {
  static get styles() {
    return css`
      .attachments-list {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
      }
      .attachment-item {
        background: rgba(100, 100, 100, 0.1);
        border-radius: 2px;
        margin: 0.3em;
        display: flex;
        color: var(--color-widget-text);
      }
      .attachment-item.error {
        background: rgba(250, 0, 0, 0.1);
        color: rgba(250, 0, 0, 0.75);
      }
      .remove-item {
        cursor: pointer !important;
        padding: 3px 6px;
        border-right: 1px solid rgba(100, 100, 100, 0.2);
        margin-top: 1px;
        background: rgba(100, 100, 100, 0.05);
      }
      .remove-item:hover {
        background: rgba(100, 100, 100, 0.1);
      }
      .remove-item.error:hover {
        background: rgba(250, 0, 0, 0.1);
      }
      .remove-item.error {
        background: rgba(250, 0, 0, 0.05);
        color: rgba(250, 0, 0, 0.75);
      }
      .attachment-name {
        align-self: center;
        font-size: 12px;
        padding: 2px 8px;
      }
    `;
  }

  @property({ type: String })
  removeIcon = 'delete_small';

  @property({ type: Array })
  currentAttachments: Attachment[];

  @property({ type: Array })
  failedAttachments: Attachment[];

  public constructor() {
    super();
  }

  public firstUpdated(changes: Map<string, any>): void {
    super.firstUpdated(changes);
  }

  public updated(changes: Map<string, any>): void {
    super.updated(changes);

    if (changes.has('currentAttachments') || changes.has('failedAttachments')) {
      if (
        changes.get('currentAttachments') !== undefined &&
        changes.get('failedAttachments') !== undefined
      ) {
        this.fireCustomEvent(CustomEventType.ContentChanged, {
          currentAttachments: this.currentAttachments,
          failedAttachments: this.failedAttachments,
        });
      }
    }
  }

  private handleRemoveFileClicked(evt: Event): void {
    const target = evt.target as HTMLDivElement;

    const currentAttachmentToRemove = this.currentAttachments.find(
      ({ uuid }) => uuid === target.id
    );
    if (currentAttachmentToRemove) {
      this.removeCurrentAttachment(currentAttachmentToRemove);
    }

    const failedAttachmentToRemove = this.failedAttachments.find(
      ({ uuid }) => uuid === target.id
    );
    if (failedAttachmentToRemove) {
      this.removeFailedAttachment(failedAttachmentToRemove);
    }
  }

  private removeCurrentAttachment(attachmentToRemove: any) {
    this.currentAttachments = this.currentAttachments.filter(
      currentAttachment => currentAttachment !== attachmentToRemove
    );
    this.requestUpdate('currentAttachments');
  }

  private removeFailedAttachment(attachmentToRemove: any) {
    this.failedAttachments = this.failedAttachments.filter(
      (failedAttachment: any) => failedAttachment !== attachmentToRemove
    );
    this.requestUpdate('failedAttachments');
  }

  public render(): TemplateResult {
    return html`
      ${(this.currentAttachments && this.currentAttachments.length > 0) ||
      (this.failedAttachments && this.failedAttachments.length > 0)
        ? html` <div class="attachments-list">
            ${this.currentAttachments.map(validAttachment => {
              return html` <div class="attachment-item">
                <div class="remove-item" @click=${this.handleRemoveFileClicked}>
                  <temba-icon
                    id="${validAttachment.uuid}"
                    name="icon.${this.removeIcon}"
                  ></temba-icon>
                </div>
                <div class="attachment-name">
                  <span
                    title="${validAttachment.filename} (${formatFileSize(
                      validAttachment.size,
                      2
                    )}) ${validAttachment.content_type}"
                    >${truncate(validAttachment.filename, 25)}
                    (${formatFileSize(validAttachment.size, 0)})
                    ${formatFileType(validAttachment.content_type)}</span
                  >
                </div>
              </div>`;
            })}
            ${this.failedAttachments.map(invalidAttachment => {
              return html` <div class="attachment-item error">
                <div
                  class="remove-item error"
                  @click=${this.handleRemoveFileClicked}
                >
                  <temba-icon
                    id="${invalidAttachment.uuid}"
                    name="${Icon.delete_small}"
                  ></temba-icon>
                </div>
                <div class="attachment-name">
                  <span
                    title="${invalidAttachment.filename} (${formatFileSize(
                      0,
                      0
                    )}) - Attachment failed - ${invalidAttachment.error}"
                    >${truncate(invalidAttachment.filename, 25)}
                    (${formatFileSize(0, 0)}) - Attachment failed</span
                  >
                </div>
              </div>`;
            })}
          </div>`
        : null}
    `;
  }
}
