import { TemplateResult, html, css } from 'lit';
import { FormElement } from '../FormElement';
import { property } from 'lit/decorators.js';
import { Icon } from '../vectoricon';
import { CustomEventType } from '../interfaces';
import { getUrl, WebResponse } from '../utils';

export interface Attachment {
    name: string;
    url: string;
    size: number;
    type: string;
}

export class Attachments extends FormElement {
    static get styles() {
        return css`
        .container {
            display: flex;
            flex-direction: column;
            flex-wrap: nowrap;
        }

        .attachments {
            width: 500px;
        }

        .uploader {
            
        }

        .drag_and_drop {
            border: 2px dashed #ccc;
            // width: 480px;
            font-family: sans-serif;
            margin: 100px auto;
            padding: 20px;
        }

        .drag_and_drop.highlight {
            border-color: red;
        }

        .button {
            display: inline-block;
            padding: 10px;
            background: #ccc;
            cursor: pointer;
            border-radius: 5px;
            border: 1px solid #ccc;
        }

        .button:hover {
            background: #ddd;
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
        if(url){
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
                    values: this.values
                });
            })
            .catch((error: any) => {
                console.error(error);
            });
        }
    }

    public refresh(): void {
        this.fetchAttachments();
    }

    public updated(changes: Map<string, any>): void {
        super.updated(changes);
        console.log('changes', changes);

        if (changes.has('endpoint')) {
            this.fetchAttachments();
        }
    }

    private handleDragEnter(evt: DragEvent): void {
        console.log('drag enter', evt);
        this.preventDefaults(evt);
        this.highlight(evt);
    }

    private handleDragOver(evt: DragEvent): void {
        console.log('drag over', evt);
        this.preventDefaults(evt);
        this.highlight(evt);

    }

    private handleDragLeave(evt: DragEvent): void {
        console.log('drag leave', evt);
        this.preventDefaults(evt);
        this.unhighlight(evt);

    }

    private handleDrop(evt: DragEvent): void {
        console.log('drag drop', evt);
        this.preventDefaults(evt);
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
        if (evt.target) {
            const dropArea = evt.target as HTMLDivElement;
            dropArea.classList.add('highlight');
        }
    }

    private unhighlight(evt: DragEvent): void {
        if (evt.target) {
            const dropArea = evt.target as HTMLDivElement;
            dropArea.classList.add('active');
        }
    }

    private handleUploadFiles(evt: Event): void {
        const target = evt.target as HTMLInputElement;
        const files = target.files;
        console.log('handleUploadFiles files', files);
        [...files].map(file => this.uploadFile(file))
    }

    private uploadFiles(files: FileList): void {
        console.log('uploadFiles files', files);
        [...files].map(file => this.uploadFile(file))
    }

    private handleUploadFile(evt: Event): void {
        const target = evt.target as HTMLInputElement;
        const file = target.files[0];
        console.log('handleUploadFile file', file);
        this.uploadFile(file);
    }

    private uploadFile(file: File): void {
        console.log('uploadFile file', file);
        // todo upload file - send request to RP endpoint
        const attachment = { name: file.name, url: file.name, type: file.type, size: file.size } as Attachment;
        this.addValue(attachment);
        console.log('values', this.values);
        this.fireCustomEvent(CustomEventType.AttachmentUploaded, attachment);
    }

    private handleRemoveFile(attachment: Attachment): void {
        console.log('handleRemove attachment', attachment);
        // todo remove file - send request to RP endpoint
        this.removeValue(attachment);
        console.log('values', this.values);
        this.fireCustomEvent(CustomEventType.AttachmentRemoved, attachment);
    }

    public render(): TemplateResult {
        return html`
            <div class="container">                
                <div class="attachments">
                    ${this.values.map(attachment => {
                        return html`
                            <div class="attachment">
                                <temba-icon name="${Icon.attachment}" />
                                ${attachment.name}
                                ${attachment.url} 
                                (${attachment.size}) 
                                ${attachment.type}
                                <temba-icon name="${Icon.delete_small}" @click="${this.handleRemoveFile}"/>
                            </div>`
                    })}
                </div>
                <div class="attachments uploader">
                    <input type="file" id="select_file" @change="${this.handleUploadFile}">
                    <label class="button" for="select_file">Select a file</label>
                </div> 
                <div class="attachments uploader drag_and_drop ${this.classList}"
                    @dragenter="${this.handleDragEnter}"
                    @dragover="${this.handleDragOver}"
                    @dragleave="${this.handleDragLeave}"
                    @drop="${this.handleDrop}"
                >
                    <input type="file" id="drop_files" multiple @change="${this.handleUploadFiles}">
                    <temba-icon name="${Icon.download}">
                        <label class="button" for="drop_files">Drag and drop to attach files</label>
                    </temba-icon>
                </div>               
            </div>
        `;
    }
}
