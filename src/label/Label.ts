import { LitElement, TemplateResult, html, css } from 'lit';
import { property } from 'lit/decorators';
import { getClasses } from '../utils';
import { styleMap } from 'lit-html/directives/style-map';

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
      }

      .label.clickable .mask:hover {
        background: rgb(0, 0, 0, 0.05);
      }

      .label {
        font-size: 0.8em;
        font-weight: 400;
        border-radius: 12px;
        background: tomato;
        color: #fff;
        box-shadow: 0 0.04em 0.08em rgba(0, 0, 0, 0.15);
      }

      .primary {
        background: var(--color-label-primary);
        color: var(--color-label-primary-text);
        --icon-color: var(--color-label-primary-text);
      }

      .secondary {
        background: var(--color-label-secondary);
        color: var(--color-label-secondary-text);
        --icon-color: var(--color-label-secondary-text);
        text-shadow: none;
      }

      .tertiary {
        background: var(--color-label-tertiary);
        color: var(--color-label-tertiary-text);
        --icon-color: var(--color-label-tertiary-text);
        text-shadow: none;
      }

      .tertiary {
        background: var(--color-label-tertiary);
        color: var(--color-label-tertiary-text);
        --icon-color: var(--color-label-tertiary-text);
        text-shadow: none;
      }

      .tertiary {
        background: var(--color-label-tertiary);
        color: var(--color-label-tertiary-text);
        --icon-color: var(--color-label-tertiary-text);
        text-shadow: none;
      }

      .light {
        background: var(--color-overlay-light);
        color: var(--color-overlay-light-text);
        --icon-color: var(--color-overlay-light-text);
        text-shadow: none;
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
  light: boolean;

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
          light: this.light,
          dark: this.dark,
          shadow: this.shadow,
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
