import { TemplateResult, html, css } from 'lit';
import { FormElement } from '../FormElement';
import { property } from 'lit/decorators.js';
import { Icon } from '../vectoricon';
import { CustomEventType } from '../interfaces';
import {
  formatFileSize,
  formatFileType,
  getUrl,
  postFormData,
  truncate,
  WebResponse,
} from '../utils';

export interface Attachment {
  uuid: string;
  content_type: string;
  type: string; //deprecated
  url: string;
  name: string;
  size: number;
}

export class Attachments extends FormElement {
  static get styles() {
    return css`
      .container {
        display: flex;
        flex-direction: column;
        height: 300px;
      }

      .item {
        border: 1px solid #ccc;
        border-radius: var(--curvature);
        flex: 1;
        margin: 0.5em;
      }

      .attachments {
        overflow-y: auto;

        display: flex;
        flex-direction: column;
      }
      .attachment {
        background: rgba(0, 0, 0, 0.05);
        // border: 1px solid rgba(237, 237, 237, 1);
        // border-radius: var(--curvature);
        // color: rgb(102, 102, 102);
        color: rgb(26, 26, 26);
        font-family: var(--font-family);
        font-size: var(--font-size);
        padding: 0.3em;
        margin: 0.3em 0.3em 0 0.3em;

        display: flex;
      }
      .attachment:hover {
        background: rgba(0, 0, 0, 0.1);
        // border-radius: var(--curvature);
        // color: rgb(136, 136, 136);
      }
      .detail {
        flex: 1;
      }
      .detail.name {
        flex: 2;
      }

      .uploaders {
        flex: 2;

        display: flex;
      }
      .drag_and_drop {
        border: 2px dashed #ccc;
        border-radius: var(--curvature);
        flex: 1;
        margin: 0.25em;

        display: flex;
        justify-content: center;
        align-items: center;
      }
      .drag_and_drop.highlight {
        border-color: rgb(var(--primary-rgb));
      }
      .uploader {
        flex: 1;

        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      }
      #drop_files,
      #select_file {
        display: none;
      }
      .upload_button {
        --button-y: 0.4em;
        --button-x: 1em;
      }
      .help_text {
        color: var(--color-text-help);
        font-size: var(--help-text-size);
        margin-top: 5px;
      }
    `;
  }

  @property({ type: String })
  list_endpoint: string;

  @property({ type: String })
  upload_endpoint: string;

  @property({ type: Boolean })
  uploading: boolean;

  public constructor() {
    super();
  }

  private fetchAttachments(): void {
    let url = this.list_endpoint;

    // todo add uuids to the request
    const uuids = this.values.map(({ uuid }) => uuid);
    url += '?uuid=' + uuids.join(',');

    if (url && uuids.length > 0) {
      const headers = {};
      getUrl(url, null, headers)
        .then((response: WebResponse) => {
          const attachments = response.json as Attachment[];

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
    // todo this.fetchAttachments();
  }

  public updated(changes: Map<string, any>): void {
    super.updated(changes);
    console.log('changes', changes);

    // todo
    // if (changes.has('list_endpoint')) {
    // }
    // if (changes.has('upload_endpoint')) {
    // }
    // if(changes.has('values')){
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

  // handles when files are selected manually
  private handleUploadFileClicked(evt: Event): void {
    console.log('handleUploadFileClicked evt', evt);
    const input = this.shadowRoot.querySelector(
      '#drop_files'
    ) as HTMLInputElement;
    this.dispatchEvent(new Event('change'));
  }

  // handles when files are selected manually
  private handleUploadFileChanged(evt: Event): void {
    console.log('handleUploadFileChanged evt', evt);
    const target = evt.target as HTMLInputElement;
    const files = target.files;
    console.log('handleUploadFiles files', files);
    [...files].map(file => this.uploadFile(file));
  }

  // handles when files are dragged and dropped
  private uploadFiles(files: FileList): void {
    console.log('uploadFiles files', files);
    [...files].map(file => this.uploadFile(file));
  }

  private uploadFile(file: File): void {
    console.log('uploadFile file', file);
    this.uploading = true;

    const url = this.upload_endpoint;
    const payload = new FormData();
    payload.append('file', file);

    postFormData(url, payload)
      .then((response: WebResponse) => {
        console.log(response);
        this.uploading = false;
        const json = response.json;
        console.log(json);
        const attachment = json as Attachment;
        if (attachment) {
          console.log('attachment', attachment);
          this.addValue(attachment);
          console.log('values', this.values);
          this.fireCustomEvent(CustomEventType.AttachmentUploaded, attachment);
        }
      })
      .catch((error: any) => {
        console.error(error);
        this.uploading = false;
      });
  }

  private handleRemoveAttachment(evt: Event): void {
    console.log('handleRemoveFile evt', evt);
    const target = evt.target as HTMLDivElement;
    const attachment = this.values.find(({ uuid }) => uuid === target.id);
    console.log('handleRemoveFile attachment', attachment);
    // todo confirm whether we need to remove attachment from RP endpoint
    this.removeValue(attachment);
    console.log('values', this.values);
    this.fireCustomEvent(CustomEventType.AttachmentRemoved, attachment);
  }

  public render(): TemplateResult {
    return html`
      <div class="container">
        <div class="item uploaders">
          <div
            class="drag_and_drop"
            @dragenter="${this.handleDragEnter}"
            @dragover="${this.handleDragOver}"
            @dragleave="${this.handleDragLeave}"
            @drop="${this.handleDrop}"
          >
            <div class="uploader">
              ${this.uploading
                ? html`<temba-loading units="3" size="12"></temba-loading>`
                : html` <input
                      type="file"
                      id="drop_files"
                      multiple
                      @change="${this.handleUploadFileChanged}"
                    />
                    <label for="drop_files">
                      <temba-button
                        class="upload_button"
                        name="Select files to attach"
                        @click="${this.handleUploadFileClicked}"
                      >
                      </temba-button>
                    </label>
                    <div class="help_text">Drag and drop files to attach</div>`}
            </div>
          </div>
        </div>
        ${this.values.length > 0
          ? html`<div class="item attachments">
              ${this.values.map(attachment => {
                return html` <div class="attachment">
                  <div class="detail name">
                    ${truncate(attachment.name, 35)}
                  </div>
                  <div class="detail">
                    (${formatFileSize(attachment.size, 0)})
                  </div>
                  <div class="detail">${formatFileType(attachment.type)}</div>
                  <temba-icon
                    id="${attachment.uuid}"
                    name="${Icon.delete_small}"
                    @click="${this.handleRemoveAttachment}"
                    clickable
                  />
                </div>`;
              })}
            </div>`
          : null}
      </div>
    `;
  }
}
