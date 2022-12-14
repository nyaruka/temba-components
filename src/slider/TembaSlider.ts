import { css, html, TemplateResult } from 'lit';
import { styleMap } from 'lit-html/directives/style-map.js';
import { property } from 'lit/decorators.js';
import { FormElement } from '../FormElement';
import { getClasses } from '../utils';

export class TembaSlider extends FormElement {
  static get styles() {
    return css`
      :host {
        display: block;
      }

      .track {
        height: 2px;
        border-top: 0.5em solid #fff;
        border-bottom: 0.5em solid #fff;
        background: #ddd;
        flex-grow: 1;
      }

      .circle {
        margin-bottom: -1.05em;
        margin-left: -0.5em;
        width: 0.75em;
        height: 0.75em;
        border: 2px solid #999;
        border-radius: 999px;
        position: relative;
        background: #fff;
        box-shadow: 0 0 0 4px rgb(255, 255, 255);
        transition: transform 200ms ease-in-out;
      }

      .grabbed .track {
        cursor: pointer;
      }

      :hover .circle {
        border-color: #777;
        cursor: pointer;
      }

      .grabbed .circle {
        border-color: var(--color-primary-dark);
        background: #fff;
      }

      .grabbed .circle {
        transform: scale(1.2);
      }

      .wrapper {
        display: flex;
        align-items: center;
      }

      .pre,
      .post {
        font-size: 0.9em;
        color: #999;
        padding: 0em 1em;
      }
    `;
  }

  @property({ type: Boolean })
  range = false;

  @property({ type: Number })
  min = 0;

  @property({ type: Number })
  max = 100;

  circleX = 0;
  grabbed = false;

  public firstUpdated(changes: Map<string, any>) {
    super.firstUpdated(changes);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
  }

  public updated(changedProperties: Map<string, any>): void {
    if (changedProperties.has('value')) {
      this.updateCircle();
    }
  }

  public updateValue(evt: MouseEvent) {
    const track = this.shadowRoot.querySelector('.track') as HTMLDivElement;
    const left = evt.pageX - track.offsetLeft;
    const pct = left / track.offsetWidth;

    const range = this.max - this.min;
    const pctAsValue = range * pct + this.min;
    this.value =
      '' + Math.max(this.min, Math.min(Math.round(pctAsValue), this.max));
  }

  public handleMouseMove(evt: MouseEvent) {
    if (this.grabbed) {
      this.updateValue(evt);
    }
  }

  public handleTrackDown(evt: MouseEvent) {
    this.grabbed = true;
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
    document.querySelector('html').classList.add('dragging');
    this.updateValue(evt);
    this.requestUpdate();
  }

  public handleMouseUp(evt: MouseEvent) {
    this.grabbed = false;
    this.updateValue(evt);
    this.requestUpdate();

    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.querySelector('html').classList.remove('dragging');
  }

  public updateCircle() {
    const track = this.shadowRoot.querySelector('.track') as HTMLDivElement;
    const pre = this.shadowRoot.querySelector('.pre') as HTMLDivElement;
    const range = this.max - this.min;
    let cValue = parseInt(this.value);
    if (!cValue || cValue < this.min) {
      cValue = this.min;
    } else if (cValue > this.max) {
      cValue = this.max;
    }
    this.value = '' + cValue;
    const pct = (cValue - this.min) / range;
    const pctAsPixels = track.offsetWidth * pct;

    this.circleX = pctAsPixels + (pre ? pre.offsetWidth : 0);
    this.requestUpdate();
  }

  public render(): TemplateResult {
    return html` <div class="${getClasses({ grabbed: this.grabbed })}">
      <div
        style=${styleMap({ left: this.circleX + 'px' })}
        class="circle"
        @mousedown=${this.handleTrackDown}
      ></div>
      <div class="wrapper">
        ${this.range ? html`<div class="pre">${this.min}</div>` : null}
        <div class="track" @mousedown=${this.handleTrackDown}></div>
        ${this.range ? html`<div class="post">${this.max}</div>` : null}
      </div>
    </div>`;
  }
}
