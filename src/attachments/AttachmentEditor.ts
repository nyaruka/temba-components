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
        justify-content: space-between;
      }
      .items {
        // flex: 1;
        margin-top: 0.5em;
      }
      .attachments {
        display: flex;
        flex-direction: column;
      }
      .uploaders {
        // flex: 2;
        display: flex;
      }
      #upload-files {
        display: none;
      }
      .upload-icon {
        color: rgb(102, 102, 102);
      }
      .upload-error {
        color: red;
        font-size: var(--help-text-size);
        margin-left: 7px;
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
        padding: 0.25em 0.25em 0.25em 0;
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

  // @property({ type: String })
  // list_endpoint: string;

  @property({ type: String })
  endpoint = '/msgmedia/upload/';

  @property({ type: String })
  accept: string; //e.g. ".xls,.xlsx"

  @property({ type: String })
  dropzone: string;

  // @property({ type: Number })
  // counter: number;

  @property({ type: HTMLDivElement, attribute: false })
  dropZoneElement: HTMLDivElement;

  @property({ type: Object })
  dropZoneOriginalStyles: Map<string, string>;

  @property({ type: Object })
  dropZoneHighlightStyles: Map<string, string>;

  @property({ type: Boolean })
  uploading: boolean;

  @property({ type: String })
  uploadError: string;

  public constructor() {
    super();
    this.dropZoneOriginalStyles = new Map();
    console.log('dropZoneOriginalStyles', this.dropZoneOriginalStyles);

    this.dropZoneHighlightStyles = new Map();
    this.dropZoneHighlightStyles.set('opacity', '0.5');
  }

  public updated(changes: Map<string, any>): void {
    super.updated(changes);
    console.log('changes', changes);
  }

  public firstUpdated(changes: Map<string, any>) {
    super.firstUpdated(changes);

    let root = (this as any).getRootNode().host;
    if (root) {
      root = root.shadowRoot;
    } else {
      root = document;
    }
    this.dropZoneElement = root.querySelector(
      '.' + this.dropzone
    ) as HTMLDivElement;

    const opacity = this.dropZoneElement.style['opacity'];
    this.dropZoneOriginalStyles.set('opacity', !opacity ? null : opacity);
    console.log('dropZoneOriginalStyles', this.dropZoneOriginalStyles);

    this.dropZoneElement.addEventListener(
      'dragenter',
      this.handleDragEnter.bind(this)
    );
    this.dropZoneElement.addEventListener(
      'dragover',
      this.handleDragOver.bind(this)
    );
    this.dropZoneElement.addEventListener(
      'dragleave',
      this.handleDragLeave.bind(this)
    );
    this.dropZoneElement.addEventListener('drop', this.handleDrop.bind(this));
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

  private preventDefaults(evt: DragEvent): void {
    evt.preventDefault();
    evt.stopPropagation();
  }

  private highlight(evt: DragEvent): void {
    console.log('highlight', evt);
    this.preventDefaults(evt);

    this.dropZoneElement.style['opacity'] = '0.5';
  }

  private unhighlight(evt: DragEvent): void {
    console.log('unhighlight', evt);
    this.preventDefaults(evt);

    const opacity = this.dropZoneOriginalStyles['opacity'];
    this.dropZoneElement.style['opacity'] = !opacity ? null : opacity;
  }

  private handleUploadFileClicked(evt: Event): void {
    console.log('handleUploadFileClicked evt', evt);
    this.dispatchEvent(new Event('change'));
  }

  private handleUploadFileChanged(evt: Event): void {
    console.log('handleUploadFileChanged evt', evt);
    const target = evt.target as HTMLInputElement;
    const files = target.files;
    this.uploadFiles(files);
  }

  private uploadFiles(files: FileList): void {
    console.log('uploadFiles files', files);
    if (this.values && this.values.length) {
      [...files].map(file => {
        const index = this.values.findIndex(
          value => value.name === file.name && value.size === file.size
        );
        if (index == -1) {
          this.uploadFile(file);
        }
      });
    } else {
      [...files].map(file => this.uploadFile(file));
    }
  }

  private uploadFile(file: File): void {
    console.log('uploadFile file', file);
    this.uploading = true;
    this.uploadError = '';

    // todo remove for final PR
    // window.setTimeout(() => {
    //   const attachment = {
    //     uuid: Math.random().toString(36).slice(2, 6),
    //     content_type: file.type,
    //     type: file.type,
    //     name: file.name,
    //     url: file.name,
    //     size: file.size,
    //   };
    //   console.log('attachment', attachment);
    //   this.addValue(attachment);
    //   // this.counter = this.values.length;
    //   console.log('values', this.values);
    //   this.uploading = false;
    // }, 5000);

    const url = this.endpoint;
    console.log('url', url);
    const payload = new FormData();
    payload.append('file', file);
    postFormData(url, payload)
      .then((response: WebResponse) => {
        console.log(response);
        if (response.json.error) {
          console.log(response.json.error);
          this.uploadError = response.json.error;
        } else {
          console.log(response.json);
          const attachment = response.json as Attachment;
          if (attachment) {
            console.log('attachment', attachment);
            this.addValue(attachment);
            console.log('values', this.values);
            this.fireCustomEvent(
              CustomEventType.AttachmentUploaded,
              attachment
            );
          }
        }
      })
      .catch((error: string) => {
        console.log(error);
        this.uploadError = error;
      })
      .finally(() => {
        if (this.uploadError && this.uploadError.length > 0) {
          this.uploadError += ', please try again';
        }
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
    // this.counter = this.values.length;
    console.log('values', this.values);
    this.fireCustomEvent(CustomEventType.AttachmentRemoved, attachment);
  }

  public render(): TemplateResult {
    return html`
      <div class="container">
        <div class="items attachments">
          ${this.values.length > 0 ? this.getAttachmentList() : null}
        </div>
        <div class="items uploaders">
          ${this.uploading
            ? html` <temba-loading
                class="upload-icon"
                units="3"
                size="12"
              ></temba-loading>`
            : html`
                <input
                  type="file"
                  id="upload-files"
                  multiple
                  accept="${this.accept}"
                  @change="${this.handleUploadFileChanged}"
                />
                <label for="upload-files">
                  <temba-icon
                    class="upload-icon"
                    name="${Icon.attachment}"
                    @click="${this.handleUploadFileClicked}"
                    clickable
                  >
                  </temba-icon>
                </label>
                ${this.uploadError
                  ? html` <div class="upload-error">${this.uploadError}</div>`
                  : null}
              `}
        </div>
      </div>
    `;
  }

  private getAttachmentList(): TemplateResult {
    return html`
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
    `;
  }
}
