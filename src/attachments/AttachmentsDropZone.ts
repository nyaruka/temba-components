import { TemplateResult, html, css } from 'lit';
import { FormElement } from '../FormElement';
import { property } from 'lit/decorators.js';
import { CustomEventType } from '../interfaces';
import { getClasses } from '../utils';

export class AttachmentsDropZone extends FormElement {
  static get styles() {
    return css`
      .container {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;

        border-radius: var(--curvature-widget);
        background: var(--color-widget-bg);
        border: 1px solid var(--color-widget-border);
        transition: all ease-in-out var(--transition-speed);
        box-shadow: var(--widget-box-shadow);
        caret-color: var(--input-caret);
        padding: var(--temba-textinput-padding);
      }

      .container:focus-within {
        border-color: var(--color-focus);
        background: var(--color-widget-bg-focused);
        box-shadow: var(--widget-box-shadow-focused);
      }

      .drop-mask {
        opacity: 0;
        pointer-events: none;
        position: absolute;
        z-index: 1;
        height: 100%;
        width: 100%;
        bottom: 0;
        right: 0;
        background: rgba(210, 243, 184, 0.8);
        border-radius: var(--curvature-widget);
        margin: -0.5em;
        padding: 0.5em;
        transition: opacity ease-in-out var(--transition-speed);
        display: flex;
        align-items: center;
        text-align: center;
      }

      .highlight .drop-mask {
        opacity: 1;
      }

      .drop-mask > div {
        margin: auto;
        border-radius: var(--curvature-widget);
        font-weight: 400;
        color: rgba(0, 0, 0, 0.5);
      }
    `;
  }

  @property({ type: Boolean })
  pendingDrop: boolean;

  public constructor() {
    super();
  }

  private handleDragEnter(evt: DragEvent): void {
    this.highlight(evt);
  }

  private handleDragOver(evt: DragEvent): void {
    this.highlight(evt);
  }

  private handleDragLeave(evt: DragEvent): void {
    this.unhighlight(evt);
  }

  private handleDragDropped(evt: DragEvent): void {
    this.unhighlight(evt);
    this.fireCustomEvent(CustomEventType.DragDropped, { de: evt });
  }

  private preventDefaults(evt: Event): void {
    evt.preventDefault();
    evt.stopPropagation();
  }

  private highlight(evt: DragEvent): void {
    this.pendingDrop = true;
    this.preventDefaults(evt);
  }

  private unhighlight(evt: DragEvent): void {
    this.pendingDrop = false;
    this.preventDefaults(evt);
  }

  public render(): TemplateResult {
    return html`
      <div
        class=${getClasses({ container: true, highlight: this.pendingDrop })}
        @dragenter="${this.handleDragEnter}"
        @dragover="${this.handleDragOver}"
        @dragleave="${this.handleDragLeave}"
        @drop="${this.handleDragDropped}"
      >
        <div class="drop-mask">
          <div>Upload Attachment</div>
        </div>
        <slot name="inner-components"></slot>
      </div>
    `;
  }
}