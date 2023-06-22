import { LitElement, TemplateResult, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { getClasses } from '../utils';
import { styleMap } from 'lit-html/directives/style-map.js';

export default class Label extends LitElement {
  static get styles() {
    return css`
      :host {
        display: inline-block;
      }

      slot {
        white-space: nowrap;
      }

      .mask {
        padding: 3px 8px;
        border-radius: 12px;
        display: flex;
      }

      temba-icon {
        margin-right: 0.3em;
        padding-bottom: 0.1em;
      }

      .label.clickable .mask:hover {
        background: var(--color-background-hover, rgb(0, 0, 0, 0.05));
      }

      .label {
        font-size: 0.8em;
        font-weight: 400;
        border-radius: 12px;
        box-shadow: 0 0.04em 0.08em rgba(0, 0, 0, 0.15);
        background: var(--color-overlay-light);
        color: var(--color-overlay-light-text);
        --icon-color: var(--color-overlay-light-text);
        text-shadow: none;
      }

      .danger {
        background: tomato;
        color: #fff;
        --icon-color: #fff;
      }

      .primary {
        background: var(--color-primary-dark);
        color: var(--color-text-light);
        --icon-color: var(--color-text-light);
      }

      .secondary {
        background: var(--color-secondary-dark);
        color: var(--color-text-light);
        --icon-color: var(--color-text-light);
      }

      .tertiary {
        background: var(--color-tertiary);
        color: var(--color-text-light);
        --icon-color: var(--color-text-light);
      }

      .dark {
        background: var(--color-overlay-dark);
        color: var(--color-overlay-dark-text);
        --icon-color: var(--color-overlay-dark-text);
        text-shadow: none;
      }

      .clickable {
        cursor: pointer;
      }

      .shadow {
        box-shadow: 1px 1px 2px 1px rgba(0, 0, 0, 0.1);
      }
    `;
  }

  @property({ type: Boolean })
  clickable: boolean;

  @property({ type: Boolean })
  primary: boolean;

  @property({ type: Boolean })
  secondary: boolean;

  @property({ type: Boolean })
  tertiary: boolean;

  @property({ type: Boolean })
  danger: boolean;

  @property({ type: Boolean })
  dark: boolean;

  @property({ type: Boolean })
  shadow: boolean;

  @property({ type: String })
  icon: string;

  @property()
  backgroundColor: string;

  @property()
  textColor: string;

  public render(): TemplateResult {
    const labelStyle = {};

    if (this.backgroundColor) {
      labelStyle['background'] = this.backgroundColor;
    }

    if (this.textColor) {
      labelStyle['color'] = this.textColor;
      labelStyle['--icon-color'] = this.textColor;
    }

    return html`
      <div
        class="label ${getClasses({
          clickable: this.clickable,
          primary: this.primary,
          secondary: this.secondary,
          tertiary: this.tertiary,
          shadow: this.shadow,
          danger: this.danger,
        })}"
        style=${styleMap(labelStyle)}
      >
        <div class="mask">
          ${this.icon ? html`<temba-icon name=${this.icon} />` : null}
          <slot></slot>
        </div>
      </div>
    `;
  }
}
