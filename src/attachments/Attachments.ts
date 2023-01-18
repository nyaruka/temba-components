import { TemplateResult, html, css } from 'lit';
import { FormElement } from '../FormElement';
import { property } from 'lit/decorators.js';
import { Icon } from '../vectoricon';
import { CustomEventType } from '../interfaces';
import {
  formatFileSize,
  formatFileType,
  getUrl,
  // postUrl,
  truncate,
  WebResponse,
} from '../utils';
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
        flex: 1;
        margin: 0.5em;
      }

      .attachments {
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
        justify-content: center;
        align-items: center;
      }
      .upload_button {
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
        // margin: 0.5em;
      }
      .upload_button:hover {
        background: var(--color-button-primary);
      }

      #select_file,
      #drop_files {
        display: none;
      }
    `;
  }

  // endpoint = "/msgmedia/upload/"
  @property({ type: String })
  endpoint: string;

  @property({ type: Boolean })
  uploading: boolean;

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
    // todo this.fetchAttachments();
  }

  public updated(changes: Map<string, any>): void {
    super.updated(changes);
    console.log('changes', changes);

    // todo
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
    this.uploading = true;

    window.setTimeout(() => {
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
      this.uploading = false;
    }, 1000);

    // const attachment = {
    //     uuid: uuidv4(),
    //     name: file.name,
    //     type: file.type,
    //     size: file.size,
    //   } as Attachment;
    // console.log('attachment', attachment);
    // this.addValue(attachment);
    // console.log('values', this.values);
    // this.fireCustomEvent(CustomEventType.AttachmentUploaded, attachment);
    // this.uploading = false;

    // todo upload file to RP endpoint
    // const url = "/msgmedia/upload/";
    // const payload = new FormData();
    // payload.append('file', file);
    // const csrf = this.getCookie('csrftoken');
    // const headers: any = csrf ? { 'X-CSRFToken': csrf } : {};
    // // mark us as ajax
    // headers['X-Requested-With'] = 'XMLHttpRequest';
    // postUrl(url, payload, headers, file.type)
    //     .then((response: WebResponse) => {
    //         console.log(response);
    //         this.uploading = false;
    //         const json = response.json;
    //         const uploadedAttachment = json.items[0] as Attachment;
    //         if (uploadedAttachment) {
    //             const attachment = {
    //                 uuid: uploadedAttachment.uuid,
    //                 name: file.name,
    //                 type: file.type,
    //                 size: file.size,
    //             } as Attachment;
    //             console.log('attachment', attachment);
    //             this.addValue(attachment);
    //             console.log('values', this.values);
    //             this.fireCustomEvent(CustomEventType.AttachmentUploaded, attachment);
    //         }
    //     })
    //     .catch((error: any) => {
    //         console.error(error);
    //         this.uploading = false;
    //     });
  }

  //   private getCookie(name: string): string {
  //     for (const cookie of document.cookie.split(';')) {
  //       const idx = cookie.indexOf('=');
  //       let key = cookie.substr(0, idx);
  //       let value = cookie.substr(idx + 1);

  //       // no spaces allowed
  //       key = key.trim();
  //       value = value.trim();

  //       if (key === name) {
  //         return value;
  //       }
  //     }
  //     return null;
  //   };

  private handleRemoveFile(evt: Event): void {
    console.log('handleRemoveFile evt', evt);
    const target = evt.target as HTMLDivElement;
    const attachment = this.values.find(({ uuid }) => uuid === target.id);
    console.log('handleRemoveFile attachment', attachment);
    this.removeValue(attachment);
    console.log('values', this.values);
    this.fireCustomEvent(CustomEventType.AttachmentRemoved, attachment);

    // todo remove file from RP endpoint
  }

  public render(): TemplateResult {
    return html`
      <div class="container">
        <div class="item attachments">
           ${this.values.map(attachment => {
             return html` <div class="attachment">
               <div class="detail name">${truncate(attachment.name, 35)}</div>
               <div class="detail">(${formatFileSize(attachment.size, 0)})</div>
               <div class="detail">${formatFileType(attachment.type)}</div>
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
          <div class="drag_and_drop"
            @dragenter="${this.handleDragEnter}"
            @dragover="${this.handleDragOver}"
            @dragleave="${this.handleDragLeave}"
            @drop="${this.handleDrop}"
          >
            <div class="uploader">
                ${
                  this.uploading
                    ? html`<temba-loading units="3" size="12"></temba-loading>`
                    : html`<input
                          type="file"
                          id="drop_files"
                          multiple
                          @change="${this.handleUploadFiles}"
                        />
                        <label class="upload_button" for="drop_files"
                          >Drag and drop to attach files</label
                        >`
                }
            </div>
          </div>
        </div>
        <!--<div class="item uploaders">
          <div class="uploader">
            ${
              this.uploading
                ? html`<temba-loading units="3" size="12"></temba-loading>`
                : html`<input
                      type="file"
                      id="select_file"
                      @change="${this.handleUploadFile}"
                    />
                    <label class="upload_button" for="select_file"
                      >Select a file</label
                    >`
            }
          </div>
        </div>--!>
      </div>
    `;
  }
}
