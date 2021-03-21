import {
  customElement,
  property,
  LitElement,
  TemplateResult,
  html,
  css,
} from 'lit-element';
import { getClasses } from '../utils';

export class VectorIcon extends LitElement {
  @property({ type: String })
  name: string;

  // same as name but without implicit coloring
  @property({ type: String })
  id: string;

  @property({ type: Number })
  size: number = 1;

  @property({ type: Boolean })
  spin: boolean;

  @property({ type: Boolean })
  clickable: boolean;

  static get styles() {
    return css`
      :host {
        margin: auto;
        --icon-color: var(--text-color);
        --icon-color-hover: var(--icon-color);
      }

      :host([id='flow']),
      :host([name='flow']) {
        padding-bottom: 0.2em;
      }

      svg {
        display: block;
        fill: var(--icon-color);
        transform: rotate(360deg);
        transition: transform 600ms cubic-bezier(0.68, -0.55, 0.265, 1.55),
          fill 100ms ease-in-out;
      }

      svg.clickable:hover {
        cursor: pointer;
        fill: var(--color-link-primary);
      }

      .spin {
        transform: rotate(0deg);
      }
    `;
  }

  constructor() {
    super();
  }

  lastName: string;

  public updated(changes: Map<string, any>) {
    super.updated(changes);
    if (changes.has('name')) {
      this.lastName = changes.get('name');
      if (this.lastName) {
        this.spin = !this.spin;
        setTimeout(() => {
          this.lastName = null;
          this.requestUpdate();
        }, 300);
      }
    }
  }

  public render(): TemplateResult {
    return html`
      <svg style="height:${this.size}em;width:${
      this.size
    }em;" class="${getClasses({ spin: this.spin, clickable: this.clickable })}">
        <use href="/sitestatic/icons/symbol-defs.svg?#icon-${
          this.lastName || this.name || this.id
        }"></i>
      </span>
    `;
  }
}
