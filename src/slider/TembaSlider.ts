import { css, html, TemplateResult } from 'lit';
import { styleMap } from 'lit-html/directives/style-map';
import { property } from 'lit/decorators';
import { FormElement } from '../FormElement';
import { getClasses } from '../utils';

export class TembaSlider extends FormElement {
  static get styles() {
    return css`
      :host {
        display: block;
      }

      .track {
        height: 0.1em;
        border: 12px solid #fff;
        background: #ddd;
      }

      .circle {
        margin-top: 0.4em;
        margin-left: 1em;
        width: 0.75em;
        height: 0.75em;
        border: 2px solid #999;
        border-radius: 999px;
        position: absolute;
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
        // border-color: #777;
      }

      .grabbed .circle {
        border-color: var(--color-primary-dark);
        background: #fff;
      }

      .grabbed .circle {
        transform: scale(1.2);
      }
    `;
  }

  @property({ type: Number })
  min = 0;

  @property({ type: Number })
  max = 100;

  circleX = 0;
  grabbed = false;
  left = 0;
  gap = 0;

  public firstUpdated(changes: Map<string, any>) {
    super.firstUpdated(changes);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.left = Math.round(this.getBoundingClientRect().left);
    const circle = this.shadowRoot.querySelector('.circle').clientWidth - 4;
    this.left = Math.round(this.getBoundingClientRect().left + circle);
    this.gap = this.offsetWidth * 0.035;
  }

  public updated(changedProperties: Map<string, any>): void {
    if (changedProperties.has('value')) {
      const pct = parseInt(this.value) / this.max;
      const total = this.offsetWidth - this.gap;
      this.updateCircle(total * pct);
    }
  }

  public updateValue(evt: MouseEvent) {
    const left = evt.pageX - this.left;
    const pct = left / (this.offsetWidth - this.gap);
    this.value =
      '' + Math.max(this.min, Math.min(Math.round(this.max * pct), this.max));
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

  public updateCircle(x: number) {
    const circle = this.shadowRoot.querySelector('.circle') as HTMLDivElement;
    this.circleX = Math.round(
      Math.min(
        this.offsetWidth - this.gap,
        Math.max(x + circle.offsetWidth / 2, this.gap)
      )
    );
    this.requestUpdate();
  }

  public render(): TemplateResult {
    return html` <div class="${getClasses({ grabbed: this.grabbed })}">
      <div
        style=${styleMap({ left: this.circleX + 'px' })}
        class="circle"
        @mousedown=${this.handleTrackDown}
      ></div>
      <div class="track" @mousedown=${this.handleTrackDown}></div>
    </div>`;
  }
}
