import { PropertyValueMap, css, html } from 'lit';
import { RapidElement } from '../RapidElement';
import { getClasses } from '../utils';
import { property } from 'lit/decorators.js';
import { CustomEventType } from '../interfaces';

export class Resizer extends RapidElement {
  static styles = css`
    :host {
      display: block;
      position: relative;
      width: var(--box-width, 200px);
      max-width: var(--box-width, 700px);
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
      width: 1px;
      background: rgba(0, 0, 0, 0);
      height: 100%;
    }

    .resizer:hover .resizer-handle {
      background: rgba(0, 0, 0, 0.1);
    }

    .resizing .resizer-handle {
      background: rgba(0, 0, 0, 0.3) !important;
      width: 3px;
      margin-right: -1px;
    }

    slot {
      margin-right: var(--resizer-handle-size);
      background: red;
    }
  `;

  initialX: number;
  boxWidth: number;
  minWidth = 200;
  maxWidth = 2000;

  @property({ type: Boolean })
  resizing = false;

  @property({ type: Number })
  currentWidth: number;

  constructor() {
    super();
    this.startResize = this.startResize.bind(this);
    this.resize = this.resize.bind(this);
    this.stopResize = this.stopResize.bind(this);
  }

  protected updated(
    _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(_changedProperties);
    if (_changedProperties.has('currentWidth')) {
      console.log('width changed', this.currentWidth);
      this.style.setProperty('--box-width', `${this.currentWidth}px`);
    }
  }

  startResize(e: MouseEvent) {
    this.initialX = e.x;
    this.boxWidth = this.offsetWidth;
    document.body.style.userSelect = 'none';
    this.resizing = true;
    window.addEventListener('mousemove', this.resize);
    window.addEventListener('mouseup', this.stopResize);
    this.requestUpdate();
  }

  resize(event: MouseEvent) {
    const dx = event.x - this.initialX;
    const newWidth = Math.min(
      Math.max(this.boxWidth + dx, this.minWidth),
      this.maxWidth
    );

    this.currentWidth = newWidth;
    this.style.setProperty('--box-width', `${newWidth}px`);
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
    return html`
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
