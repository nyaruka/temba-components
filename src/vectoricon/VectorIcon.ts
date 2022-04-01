import { LitElement, TemplateResult, html, css } from 'lit';
import { property } from 'lit/decorators';

import { getClasses } from '../utils';

// for cache busting, increase whenever the icon set changes
const ICON_VERSION = 6;

export class VectorIcon extends LitElement {
  @property({ type: String })
  name: string;

  @property({ type: String })
  prefix: string;

  // same as name but without implicit coloring
  @property({ type: String })
  id: string;

  @property({ type: Number })
  size = 1;

  @property({ type: Boolean })
  clickable: boolean;

  @property({ type: Boolean })
  circled: boolean;

  @property({ type: String })
  animateChange: string;

  @property({ type: Number })
  animationDuration = 200;

  @property({ type: Number, attribute: false })
  steps = 2;

  @property({ type: Number, attribute: false })
  animationStep: number;

  @property({ type: String })
  easing = 'cubic-bezier(0.68, -0.55, 0.265, 1.55)';

  static get styles() {
    return css`
      :host {
        margin: auto;
        --color1: var(--icon-color);
      }

      :host([id='flow']),
      :host([name='flow']) {
        padding-bottom: 0.2em;
      }

      svg {
        fill: var(--icon-color);
        transform: scale(1);
        transition: fill 100ms ease-in-out,
          background 200ms cubic-bezier(0.68, -0.55, 0.265, 1.55),
          padding 200ms cubic-bezier(0.68, -0.55, 0.265, 1.55),
          margin 200ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
      }

      svg.spin {
        transform: rotate(0deg);
      }

      svg.spin-1 {
        transform: rotate(180deg);
      }

      svg.spin-2 {
        transform: rotate(360deg);
      }

      svg.spin-3 {
        transform: rotate(0deg);
        transition-duration: 0ms !important;
      }

      svg.pulse {
        transform: scale(1);
      }

      svg.pulse-1 {
        transform: scale(1.2);
      }

      .clickable:hover {
        cursor: pointer;
        fill: var(--color-link-primary);
        background: rgb(255, 255, 255);
      }

      .circled {
        background: rgb(240, 240, 240);
        padding: 0.15em;
        margin: -0.15em;
        box-shadow: var(--shadow);
      }

      .wrapper {
        display: flex;
        flex-direction: column;
        border-radius: 999px;
        transition: background 200ms linear,
          transform 300ms cubic-bezier(0.68, -0.55, 0.265, 1.55),
          padding 150ms linear, margin 150ms linear;
      }

      .wrapper.clickable {
        transform: scale(1);
      }

      .wrapper.clickable:hover {
        --icon-circle-size: 0.35em;
        --icon-background: var(--icon-color-circle-hover);
      }

      .wrapper.clickable {
        padding: var(--icon-circle-size);
        margin: calc(-1 * var(--icon-circle-size));
        background: var(--icon-background);
      }
    `;
  }

  constructor() {
    super();
  }

  private lastName: string;

  public firstUpdated(changes: Map<string, any>) {
    super.firstUpdated(changes);
    if (changes.has('animateChange')) {
      // set our default duration if we need one
      if (!changes.has('animationDuration')) {
        this.animationDuration = this.steps * this.animationDuration;
      }

      if (this.animateChange === 'spin') {
        this.steps = 3;
        this.animationDuration = 400;
        this.easing = 'linear';
      }
    }
  }

  public updated(changes: Map<string, any>) {
    super.updated(changes);

    if (changes.has('animationStep')) {
      // if we are halfway through, change the icon
      if (this.lastName && this.animationStep >= this.steps / 2) {
        this.lastName = null;
        this.requestUpdate();
      }

      setTimeout(() => {
        if (this.animationStep > 0 && this.animationStep < this.steps) {
          this.animationStep++;
        } else {
          this.animationStep = 0;
        }
      }, this.animationDuration / this.steps);
    }

    if (changes.has('name') && this.animateChange) {
      this.lastName = changes.get('name');

      // our name changed, lets animate it
      if (this.lastName && this.animateChange) {
        this.animationStep = 1;
      }
    }
  }

  public render(): TemplateResult {
    return html`
      <div
        class="wrapper ${getClasses({
          clickable: this.clickable,
          circled: this.circled,
          animate: !!this.animateChange,
        })}"
      >
        <svg
          style="height:${this.size}em;width:${this
            .size}em;transition:transform ${this.animationDuration /
          this.steps}ms
          ${this.easing}"
          class="${getClasses({
            [this.animateChange]: !!this.animateChange,
            [this.animateChange + '-' + this.animationStep]:
              this.animationStep > 0,
          })}"
        >
          <use
            href="${this.prefix ||
            (window as any).static_url ||
            '/static/'}icons/symbol-defs.svg?v=${ICON_VERSION}#icon-${this
              .lastName ||
            this.name ||
            this.id}"
          />
        </svg>
      </div>
    `;
  }
}
