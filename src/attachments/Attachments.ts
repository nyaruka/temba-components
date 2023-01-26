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
        flex-direction: row;
        align-items: baseline;
      }
      .attachment_icon {
        background: var(--color-widget-bg);
        border: 1px solid var(--color-widget-border);
        color: rgb(170, 170, 170);
        padding: 20px 20px;
        border-radius: var(--curvature);
      }
      .attachment_icon:hover {
        background-color: rgb(240, 240, 240);
        color: #000;
        color: rgb(102, 102, 102);
        cursor: pointer;
      }
      .attachment_counter {
        font-size: 10px;
        border: 1px solid #d9d9d9;
        color: #404040;
        background: #f3f3f3;
        padding: 2px 4px;
        border-radius: 4px;
        margin-left: -7px;
        margin-top: -7px;
      }
    `;
  }

  @property({ type: String })
  list_endpoint: string;

  @property({ type: String })
  upload_endpoint: string;

  @property({})
  counter: number;

  public constructor() {
    super();
    this.counter = 0;
  }

  public updated(changes: Map<string, any>): void {
    super.updated(changes);
    console.log('changes', changes);
  }

  public handleIconClicked(): void {
    const attachmentEditor = this.shadowRoot.querySelector(
      '#attachment_editor'
    ) as AttachmentEditor;
    // attachmentEditor.list_endpoint = this.list_endpoint;
    attachmentEditor.endpoint = this.upload_endpoint;
    const dialog = this.shadowRoot.querySelector(
      '#attachment_editor_dialog'
    ) as Dialog;
    dialog.header = 'Select files to attach';
    dialog.open = true;
  }

  private handleDialogClicked(evt: CustomEvent) {
    const button = evt.detail.button;
    const attachmentEditor = this.shadowRoot.querySelector(
      '#attachment_editor'
    ) as AttachmentEditor;
    // this.counter = attachmentEditor.counter;

    if (button.name === 'Ok') {
      // this.counter = attachmentEditor.counter;
      const dialog = this.shadowRoot.querySelector(
        '#attachment_editor_dialog'
      ) as Dialog;
      dialog.open = false;
    }

    if (button.name === 'Cancel') {
      // clear out attachments list and reset the counter?
    }
  }

  public render(): TemplateResult {
    return html`
      <div class="container">
        <temba-dialog
          id="attachment_editor_dialog"
          @temba-button-clicked=${this.handleDialogClicked.bind(this)}
        >
          <temba-attachment-editor id="attachment_editor">
          </temba-attachment-editor>
        </temba-dialog>
        <div class="items">
          <temba-icon
            class="attachment_icon"
            name="${Icon.attachment}"
            @click="${this.handleIconClicked}"
            clickable
          >
          </temba-icon>
          <div class="attachment_counter">${this.counter}</div>
        </div>
      </div>
    `;
  }
}
