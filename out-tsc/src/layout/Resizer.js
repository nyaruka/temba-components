import { __decorate } from "tslib";
import { css, html } from 'lit';
import { getClasses } from '../utils';
import { property } from 'lit/decorators.js';
import { CustomEventType } from '../interfaces';
import { ResizeElement } from '../ResizeElement';
export class Resizer extends ResizeElement {
    constructor() {
        super();
        this.minWidth = 200;
        this.maxWidth = 2000;
        this.resizing = false;
        this.startResize = this.startResize.bind(this);
        this.resize = this.resize.bind(this);
        this.stopResize = this.stopResize.bind(this);
    }
    updated(_changedProperties) {
        super.updated(_changedProperties);
        if (_changedProperties.has('currentWidth')) {
            this.style.setProperty('--box-width', `${this.currentWidth}px`);
        }
    }
    setWidth(width) {
        const newWidth = Math.min(Math.max(width, this.minWidth), this.maxWidth);
        this.currentWidth = newWidth;
    }
    startResize(e) {
        this.initialX = e.x;
        this.boxWidth = this.offsetWidth;
        document.body.style.userSelect = 'none';
        this.resizing = true;
        window.addEventListener('mousemove', this.resize);
        window.addEventListener('mouseup', this.stopResize);
        this.requestUpdate();
    }
    resize(event) {
        const dx = event.x - this.initialX;
        this.setWidth(this.boxWidth + dx);
    }
    stopResize() {
        document.body.style.userSelect = 'initial';
        window.removeEventListener('mousemove', this.resize);
        window.removeEventListener('mouseup', this.stopResize);
        this.requestUpdate();
        this.resizing = false;
        this.fireCustomEvent(CustomEventType.Resized, { width: this.currentWidth });
    }
    render() {
        return html `
      <div
        class=${getClasses({ resizer: true, resizing: this.resizing })}
        @mousedown="${this.startResize}"
      >
        <div class=${getClasses({ 'resizer-handle': true })}></div>
      </div>
      <slot></slot>
    `;
    }
}
Resizer.styles = css `
    :host {
      display: block;
      position: relative;
      width: var(--box-width, 200px);
      --resizer-handle-size: 15px;
    }

    .resizer {
      position: absolute;
      right: calc(var(--resizer-handle-size) * -1);
      height: 100%;
      cursor: col-resize;
      padding: 0 calc(var(--resizer-handle-size) / 2);
      z-index: 1;
    }

    .resizer-handle {
      position: relative;
      width: 4px;
      background: rgba(0, 0, 0, 0);
      height: 100%;
    }

    .resizer:hover .resizer-handle {
      background: rgba(0, 0, 0, 0.05);
      width: 3px;
      margin-right: -1px;
    }

    .resizing .resizer-handle {
      background: rgba(0, 0, 0, 0.1) !important;
      width: 3px;
      margin-right: -1px;
    }

    slot {
      margin-right: var(--resizer-handle-size);
      background: red;
    }
  `;
__decorate([
    property({ type: Number })
], Resizer.prototype, "minWidth", void 0);
__decorate([
    property({ type: Number })
], Resizer.prototype, "maxWidth", void 0);
__decorate([
    property({ type: Boolean })
], Resizer.prototype, "resizing", void 0);
__decorate([
    property({ type: Number })
], Resizer.prototype, "currentWidth", void 0);
//# sourceMappingURL=Resizer.js.map