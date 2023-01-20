import { TemplateResult, html, css } from 'lit';
import { FormElement } from '../FormElement';
import { property } from 'lit/decorators.js';
import { Icon } from '../vectoricon';
import { Dialog } from '../dialog/Dialog';
import { AttachmentEditor } from './AttachmentEditor';

export class Attachments extends FormElement {
  static get styles() {
    return css`
      .container {
        display: flex;
        height: 55px;
      }
      .items {
        display: flex;
        flex-direction: column;
      }
      .attachment_icon {
        color: #404040;
        padding: 20px 20px;
        border: 1px solid #d9d9d9;
        border-radius: var(--curvature);
      }
      .attachment_counter {
        font-size: 10px;
        border: 1px solid #d9d9d9;
        color: #404040;
        background: #f3f3f3;
        padding: 2px 4px;
        margin-left: 50px;
        margin-top: -10px;
        border-radius: 4px;
        vertical-align: super;
      }
    `;
  }

  @property({ type: String })
  list_endpoint: string;

  @property({ type: String })
  upload_endpoint: string;

  public constructor() {
    super();
  }

  public refresh(): void {
    // todo
  }

  public updated(changes: Map<string, any>): void {
    super.updated(changes);
    console.log('changes', changes);
  }

  public handleOpenClicked(): void {
    const attachmentEditor = this.shadowRoot.querySelector(
      '#attachment_editor'
    ) as AttachmentEditor;
    attachmentEditor.list_endpoint = this.list_endpoint;
    attachmentEditor.upload_endpoint = this.upload_endpoint;
    const dialog = this.shadowRoot.querySelector(
      '#attachment_editor_dialog'
    ) as Dialog;
    dialog.header = 'Select files to attach';
    dialog.open = true;
  }

  public render(): TemplateResult {
    return html`
      <div class="container">
        <temba-dialog id="attachment_editor_dialog">
          <temba-attachment-editor id="attachment_editor">
          </temba-attachment-editor>
        </temba-dialog>
        <div class="items">
          <temba-icon
            class="attachment_icon"
            name="${Icon.attachment}"
            @click="${this.handleOpenClicked}"
            clickable
          >
          </temba-icon>
          <div class="attachment_counter">4</div>
        </div>
      </div>
    `;
  }
}
