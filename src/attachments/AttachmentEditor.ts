import { TemplateResult, html, css } from 'lit';
import { FormElement } from '../FormElement';
import { property } from 'lit/decorators.js';
import { Icon } from '../vectoricon';
import { CustomEventType } from '../interfaces';
import {
  formatFileSize,
  formatFileType,
  // getUrl,
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

export class AttachmentEditor extends FormElement {
  static get styles() {
    return css`
      .container {
        display: flex;
        flex-direction: column;
        height: 300px;
      }

      .items {
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
        color: rgb(26, 26, 26);
        font-family: var(--font-family);
        font-size: var(--font-size);
        padding: 0.3em;
        margin: 0.3em 0.3em 0 0.3em;

        display: flex;
      }
      .attachment:hover {
        background: rgba(0, 0, 0, 0.1);
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
      #upload_files {
        display: none;
      }
      .upload_button {
        --button-y: 0.4em;
        --button-x: 1em;
      }
      .upload_text {
        color: var(--color-text-help);
        font-size: var(--help-text-size);
        margin-top: 5px;
      }

      .select-container {
        display: flex;
        flex-flow: row nowrap;
        align-items: center;
        // border: 1px solid var(--color-widget-border);
        transition: all ease-in-out var(--transition-speed);
        cursor: pointer;
        border-radius: var(--curvature-widget);
        background: var(--color-widget-bg);
        padding-top: 1px;
        box-shadow: var(--widget-shadow);
        position: relative;
        z-index: 2;
      }
      .selected {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: stretch;
        user-select: none;
        padding: 0.25em;
      }
      .selected-item {
        vertical-align: middle;
        background: rgba(100, 100, 100, 0.1);
        user-select: none;
        border-radius: 2px;
        align-items: stretch;
        flex-flow: row nowrap;
        margin: 2px;
        display: flex;
        overflow: hidden;
        color: var(--color-widget-text);
        line-height: var(--temba-select-selected-line-height);
        --icon-color: var(--color-text-dark);
      }
      .remove-item {
        cursor: pointer;
        display: inline-block;
        padding: 3px 6px;
        border-right: 1px solid rgba(100, 100, 100, 0.2);
        margin: 0px;
        background: rgba(100, 100, 100, 0.05);
      }
      .option-name {
        flex: 1 1 auto;
        align-self: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 12px;
        padding: 2px 8px;
      }
    `;
  }

  @property({ type: String })
  list_endpoint: string;

  @property({ type: String })
  upload_endpoint: string;

  @property({ type: Boolean })
  uploading: boolean;

  @property({ type: Number })
  counter: number;

  public constructor() {
    super();
    this.counter = 0;
  }

  // todo confirm whether we need to fetch attachments from the RP server
  // private fetchAttachments(): void {
  //   let url = this.list_endpoint;

  //   // todo add uuids to the request
  //   const uuids = this.values.map(({ uuid }) => uuid);
  //   url += '?uuid=' + uuids.join(',');

  //   if (url && uuids.length > 0) {
  //     const headers = {};
  //     getUrl(url, null, headers)
  //       .then((response: WebResponse) => {
  //         const attachments = response.json as Attachment[];

  //         //populate (or initialize) the attachments
  //         if (attachments) {
  //           this.setValues(attachments);
  //         } else {
  //           this.setValues([]);
  //         }

  //         //fire custom loaded event type when we're finished
  //         this.fireCustomEvent(CustomEventType.Loaded, {
  //           values: this.values,
  //         });
  //       })
  //       .catch((error: any) => {
  //         console.error(error);
  //       });
  //   }
  // }

  public updated(changes: Map<string, any>): void {
    super.updated(changes);
    console.log('changes', changes);
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

    // todo remove for final PR
    // const attachment = {
    //   uuid: Math.random().toString(36).slice(2, 6),
    //   content_type: file.type,
    //   type: file.type,
    //   name: file.name,
    //   url: file.name,
    //   size: file.size,
    // };
    // console.log('attachment', attachment);
    // this.addValue(attachment);
    // this.counter = this.values.length;
    // console.log('values', this.values);
    // this.uploading = false;

    const url = this.upload_endpoint;
    const payload = new FormData();
    payload.append('file', file);
    postFormData(url, payload)
      .then((response: WebResponse) => {
        console.log(response);
        const json = response.json;
        console.log(json);
        const attachment = json as Attachment;
        if (attachment) {
          console.log('attachment', attachment);
          this.addValue(attachment);
          this.counter = this.values.length;
          console.log('values', this.values);
          this.fireCustomEvent(CustomEventType.AttachmentUploaded, attachment);
        }
      })
      .catch((error: any) => {
        console.error(error);
      })
      .finally(() => {
        this.uploading = false;
      });
  }

  private handleRemoveAttachment(evt: Event): void {
    console.log('handleRemoveFile evt', evt);
    const target = evt.target as HTMLDivElement;
    const attachment = this.values.find(({ uuid }) => uuid === target.id);
    console.log('handleRemoveFile attachment', attachment);
    // todo confirm whether we need to remove attachment from the RP server
    this.removeValue(attachment);
    this.counter = this.values.length;
    console.log('values', this.values);
    this.fireCustomEvent(CustomEventType.AttachmentRemoved, attachment);
  }

  public render(): TemplateResult {
    return html`
      <div class="container">
        <div class="items uploaders">
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
                      id="upload_files"
                      multiple
                      @change="${this.handleUploadFileChanged}"
                    />
                    <label for="upload_files">
                      <temba-button
                        class="upload_button"
                        name="Select files to attach"
                        @click="${this.handleUploadFileClicked}"
                      >
                      </temba-button>
                    </label>
                    <div class="upload_text">
                      Drag and drop files to attach
                    </div>`}
            </div>
          </div>
        </div>
        ${this.values.length > 0 ? this.getAttachmentList() : null}
      </div>
    `;
  }

  // private getAttachmentList(): TemplateResult {
  //   return html` <div class="items attachments">
  //     ${this.values.map(attachment => {
  //       return html` <div class="attachment">
  //         <div class="detail name">${truncate(attachment.name, 35)}</div>
  //         <div class="detail">(${formatFileSize(attachment.size, 0)})</div>
  //         <div class="detail">${formatFileType(attachment.type)}</div>
  //         <temba-icon
  //           id="${attachment.uuid}"
  //           name="${Icon.delete_small}"
  //           @click="${this.handleRemoveAttachment}"
  //           clickable
  //         />
  //       </div>`;
  //     })}
  //   </div>`;
  // }

  private getAttachmentList(): TemplateResult {
    return html`
      <div class="items attachments">
        <div class="select-container">
          <div class="left-side">
            <div class="selected">
              ${this.values.map(attachment => {
                return html` <div class="selected-item">
                  <div class="remove-item" style="margin-top:1px">
                    <temba-icon
                      id="${attachment.uuid}"
                      name="${Icon.delete_small}"
                      @click="${this.handleRemoveAttachment}"
                      clickable
                    ></temba-icon>
                  </div>
                  <div class="option-name" style="display:flex">
                    <span
                      title="${attachment.name} (${formatFileSize(
                        attachment.size,
                        2
                      )}) ${attachment.type}"
                      >${truncate(attachment.name, 25)}
                      (${formatFileSize(attachment.size, 0)})
                      ${formatFileType(attachment.type)}</span
                    >
                  </div>
                </div>`;
              })}
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
