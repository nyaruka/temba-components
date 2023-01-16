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
            min-height: 100px;
        }

        #drag_and_drop_uploader {
            border: 2px dashed #ccc;
            border-radius: 20px;
            width: 480px;
            font-family: sans-serif;
            margin: 100px auto;
            padding: 20px;
        }

        #drag_and_drop_uploader.highlight {
            border-color: purple;
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

        #drag_and_drop_files {
            display: none;
        }
    `;
    }

    @property({ type: String })
    endpoint: string;

    @property({ type: String, attribute: false })
    classList: string;

    public constructor() {
        super();
    }

    private fetchAttachments(){
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

    public refresh() {
        this.fetchAttachments();
    }

    public updated(changes: Map<string, any>) {
        super.updated(changes);

        if (changes.has('endpoint')) {
            this.fetchAttachments();
        }
    }

    private handleDragEnter(evt: DragEvent) {
        this.preventDefaults(evt);
        this.highlight(evt);
    }

    private handleDragOver(evt: DragEvent) {
        this.preventDefaults(evt);
        this.highlight(evt);

    }

    private handleDragLeave(evt: DragEvent) {
        this.preventDefaults(evt);
        this.unhighlight(evt);

    }

    private handleDrop(evt: DragEvent) {
        this.preventDefaults(evt);
        this.unhighlight(evt);

        const dt = evt.dataTransfer;
        if (dt) {
            const files = dt.files;
            const items = dt.items;
            this.handleFiles(files);
        }
    }

    private preventDefaults(evt: DragEvent) {
        evt.preventDefault();
        evt.stopPropagation();
    }

    private highlight(evt: DragEvent) {
        if (evt.target) {
            const dropArea = evt.target as HTMLDivElement;
            dropArea.classList.add('highlight');
        }
    }

    private unhighlight(evt: DragEvent) {
        if (evt.target) {
            const dropArea = evt.target as HTMLDivElement;
            dropArea.classList.add('active');
        }
    }

    private handleFiles(files: FileList) {
        console.log('handleFiles files', files);
        const filesArray = [...files]
        filesArray.map((file) => this.uploadFile(file))
    }

    private handleFile(file: File) {
        console.log('handleFile file', file);
        this.uploadFile(file);
    }

    private uploadFile(file: File) {
        console.log('uploadFile file', file);
        // todo upload file - send request to RP endpoint
        const attachment = { name: file.name, url: file.name, type: file.type, size: file.size } as Attachment;
        this.addValue(attachment);
        this.fireCustomEvent(CustomEventType.AttachmentUploaded, attachment);
    }

    private handleRemove(attachment: Attachment) {
        // todo remove file - send request to RP endpoint
        this.removeValue(attachment);
        this.fireCustomEvent(CustomEventType.AttachmentRemoved, attachment);
    }

    // public render(): TemplateResult{
    //     return html`
    //         <div class="container">
    //             Hello?
    //         </div>`;
    // }

    public render(): TemplateResult {
        return html`
            <div class="container">
                Hello?
                <div class="attachments">
                    ${this.values.map(attachment => {
                        return html`
                            <div class="attachment">
                                <temba-icon name="${Icon.attachment}" />
                                ${attachment.name}
                                ${attachment.url} 
                                (${attachment.size}) 
                                ${attachment.type}
                                <temba-icon name="${Icon.delete_small}" class="clear-icon" @click=${this.handleRemove}/>
                            </div>`
                    })}
                </div>
                <div id="vanilla_uploader">
                    <input type="file" id="vanilla_file" onchange="${this.handleFile}">
                    <label class="button" for="vanilla_file">Select a file</label>
                </div>
                <div id="drag_and_drop_uploader"
                    class="${this.classList}"
                    dragenter="${this.handleDragEnter}"
                    dragover="${this.handleDragOver}"
                    dragleave="${this.handleDragLeave}"
                    drop="${this.handleDrop}"
                >
                    <input type="file" id="drag_and_drop_files" multiple onchange="${this.handleFiles}">
                    <label class="button" for="drag_and_drop_files">Select some files</label>
                </div>
            </div>
        `;
    }
}
