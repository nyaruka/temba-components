import { TemplateResult, html, css } from 'lit';
import { FormElement } from '../FormElement';
import { property } from 'lit/decorators.js';
import { Icon } from '../vectoricon';
import { CustomEventType } from '../interfaces';
import { getUrl, WebResponse } from '../utils';
import { v4 as uuidv4 } from 'uuid';

export interface Attachment {
  uuid: string;
  name: string;
  size: number;
  type: string;
}

export class Attachments extends FormElement {
  static get styles() {
    return css`
      .container {
        display: flex;
        flex-direction: row;
        height: 200px;
      }

      .item {
        border: 1px solid #ccc;
        border-radius: var(--curvature);
        flex-grow: 1;
        margin: 0.5em;
      }

      .item.attachments {
        display: flex;
        flex-direction: column;
      }
      .attachment {
        border: 1px solid #ccc;
        border-radius: var(--curvature);
        display: flex;
        margin: 0.5em;
      }

      .item.uploaders {
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .drag_and_drop {
        border: 2px dashed #ccc;
        border-radius: var(--curvature);
        flex-grow: 1;
        margin: 0.5em;
      }
      .drag_and_drop.highlight {
        border-color: rgb(var(--primary-rgb));
      }
      .uploader {
        display: flex;
        flex-grow: 1;
        justify-content: center;
        align-items: center;
      }
      .button {
        display: inline-block;
        padding: 10px;
        background: var(--color-button-primary);
        background-image: var(--button-bg-img);
        color: var(--color-button-primary-text);
        box-shadow: var(--button-shadow);
        cursor: pointer;
        border-radius: var(--curvature);
        font-family: var(--font-family);
        font-weight: 400;
        transition: all 100ms ease-in;
        margin: 0.5em;
      }
      .button:hover {
        background: var(--color-button-primary);
      }

      #select_file,
      #drop_files {
        display: none;
      }
    `;
  }

  @property({ type: String })
  endpoint: string;

  public constructor() {
    super();
  }

  private fetchAttachments(): void {
    const url = this.endpoint;
    if (url) {
      const headers = {};
      getUrl(url, null, headers)
        .then((response: WebResponse) => {
          const json = response.json;
          const attachments = json.items as Attachment[];

          //populate (or initialize) the attachments
          if (attachments) {
            this.setValues(attachments);
          } else {
            this.setValues([]);
          }

          //fire custom loaded event type when we're finished
          this.fireCustomEvent(CustomEventType.Loaded, {
            values: this.values,
          });
        })
        .catch((error: any) => {
          console.error(error);
        });
    }
  }

  public refresh(): void {
    // this.fetchAttachments();
  }

  public updated(changes: Map<string, any>): void {
    super.updated(changes);
    console.log('changes', changes);

    // if (changes.has('endpoint')) {
    //     this.fetchAttachments();
    // }
  }

  private handleDragEnter(evt: DragEvent): void {
    console.log('drag enter', evt);
    this.highlight(evt);
  }
  private handleDragOver(evt: DragEvent): void {
    console.log('drag over', evt);
    this.highlight(evt);
  }

  private handleDragLeave(evt: DragEvent): void {
    console.log('drag leave', evt);
    this.unhighlight(evt);
  }
  private handleDrop(evt: DragEvent): void {
    console.log('drag drop', evt);
    this.unhighlight(evt);

    const dt = evt.dataTransfer;
    if (dt) {
      const files = dt.files;
      this.uploadFiles(files);
    }
  }

  private highlight(evt: DragEvent): void {
    console.log('highlight', evt);
    this.preventDefaults(evt);
    const dragAndDropArea = evt.target as HTMLDivElement;
    dragAndDropArea.classList.add('highlight');
  }

  private unhighlight(evt: DragEvent): void {
    console.log('unhighlight', evt);
    this.preventDefaults(evt);
    const dragAndDropArea = evt.target as HTMLDivElement;
    dragAndDropArea.classList.remove('highlight');
  }

  private preventDefaults(evt: DragEvent): void {
    evt.preventDefault();
    evt.stopPropagation();
  }

  private handleUploadFiles(evt: Event): void {
    console.log('handleUploadFiles evt', evt);
    const target = evt.target as HTMLInputElement;
    const files = target.files;
    console.log('handleUploadFiles files', files);
    [...files].map(file => this.uploadFile(file));
  }

  private uploadFiles(files: FileList): void {
    console.log('uploadFiles files', files);
    [...files].map(file => this.uploadFile(file));
  }

  private handleUploadFile(evt: Event): void {
    console.log('handleUploadFile evt', evt);
    const target = evt.target as HTMLInputElement;
    const file = target.files[0];
    console.log('handleUploadFile file', file);
    this.uploadFile(file);
  }

  private uploadFile(file: File): void {
    console.log('uploadFile file', file);
    // todo upload file - send request to RP endpoint
    const attachment = {
      uuid: uuidv4(),
      name: file.name,
      type: file.type,
      size: file.size,
    } as Attachment;
    console.log('attachment', attachment);
    this.addValue(attachment);
    console.log('values', this.values);
    this.fireCustomEvent(CustomEventType.AttachmentUploaded, attachment);
  }

  private handleRemoveFile(evt: Event): void {
    console.log('handleRemoveFile evt', evt);
    const target = evt.target as HTMLDivElement;
    // todo remove file - send request to RP endpoint
    const attachment = this.values.find(({ uuid }) => uuid === target.id);
    console.log('handleRemoveFile attachment', attachment);
    this.removeValue(attachment);
    console.log('values', this.values);
    this.fireCustomEvent(CustomEventType.AttachmentRemoved, attachment);
  }

  public render(): TemplateResult {
    return html`
      <div class="container">
        <div class="item attachments">
          ${this.values.map(attachment => {
            return html` <div class="attachment">
              <div>${attachment.name}</div>
              <div>(${attachment.size})</div>
              <div>${attachment.type}</div>
              <temba-icon
                id="${attachment.uuid}"
                name="${Icon.delete_small}"
                @click="${this.handleRemoveFile}"
                clickable
              />
            </div>`;
          })}
        </div>
        <div class="item uploaders">
          <div
            class="drag_and_drop"
            @dragenter="${this.handleDragEnter}"
            @dragover="${this.handleDragOver}"
            @dragleave="${this.handleDragLeave}"
            @drop="${this.handleDrop}"
          >
            <div class="uploader">
              <input
                type="file"
                id="drop_files"
                multiple
                @change="${this.handleUploadFiles}"
              />
              <label class="button" for="drop_files"
                >Drag and drop to attach files</label
              >
            </div>
          </div>
        </div>
        <div class="item uploaders">
          <input
            type="file"
            id="select_file"
            @change="${this.handleUploadFile}"
          />
          <label class="button" for="select_file">Select a file</label>
        </div>
      </div>
    `;
  }
}
