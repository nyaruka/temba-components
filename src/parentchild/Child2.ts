import { TemplateResult, html, css } from 'lit';
import { FormElement } from '../FormElement';
import { property } from 'lit/decorators.js';
import { CustomEventType } from '../interfaces';
import { Attachment } from '../compose/Compose';

export class Child2 extends FormElement {
  DEBUG = true;
  DEBUG_UPDATES = true;
  DEBUG_EVENTS = true;

  static get styles() {
    return css``;
  }

  @property({ type: Array })
  currentAttachments: Attachment[] = [];

  @property({ type: Array })
  failedAttachments: Attachment[] = [];

  public constructor() {
    super();
  }

  public updated(changes: Map<string, any>): void {
    super.updated(changes);

    if (changes.has('currentAttachments') || changes.has('failedAttachments')) {
      this.fireCustomEvent(CustomEventType.ContentChanged, {
        currentAttachments: this.currentAttachments,
        failedAttachments: this.failedAttachments,
      });
    }
  }

  private handleRemoveCurrentAttachment() {
    this.currentAttachments.pop();
    this.requestUpdate('currentAttachments');
  }
  private handleRemoveFailedAttachment() {
    this.failedAttachments.pop();
    this.requestUpdate('failedAttachments');
  }

  public render(): TemplateResult {
    return html`
      <div class="child2-container">
        <div class="current-attachments">
          List of current attachments:
          ${this.currentAttachments
            ? this.currentAttachments.map(currentAttachment => {
                return html`
                  <div class="current-attachment">
                    ${this.getAttachment(currentAttachment)}
                  </div>
                `;
              })
            : null}
        </div>
        <div class="failed-attachments">
          List of failed attachments:
          ${this.failedAttachments
            ? this.failedAttachments.map(failedAttachment => {
                return html`
                  <div class="current-attachment">
                    ${this.getAttachment(failedAttachment)}
                  </div>
                `;
              })
            : null}
        </div>
        <div>
          <temba-button
            name="Remove current attachment"
            @click=${this.handleRemoveCurrentAttachment}
          ></temba-button>
          <temba-button
            name="Remove failed attachment"
            @click=${this.handleRemoveFailedAttachment}
          ></temba-button>
        </div>
      </div>
    `;
  }

  private getAttachment(attachment: Attachment): TemplateResult {
    return html`${attachment.uuid}, ${attachment.content_type},
    ${attachment.filename}, ${attachment.url}, ${attachment.size},
    ${attachment.error}`;
  }
}
