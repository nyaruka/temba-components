import { __decorate } from "tslib";
import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { getClasses } from '../utils';
import { styleMap } from 'lit-html/directives/style-map.js';
export default class Label extends LitElement {
    static get styles() {
        return css `
      :host {
        display: inline-block;
      }

      slot {
        white-space: nowrap;
        overflow-x: hidden;
        text-overflow: ellipsis;
        display: block;
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
        box-shadow: var(--widget-shadow, 0 0.04em 0.08em rgba(0, 0, 0, 0.15));
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
    render() {
        const labelStyle = {};
        if (this.backgroundColor) {
            labelStyle['background'] = this.backgroundColor;
        }
        if (this.textColor) {
            labelStyle['color'] = this.textColor;
            labelStyle['--icon-color'] = this.textColor;
        }
        return html `
      <div
        class="label ${getClasses({
            clickable: this.clickable,
            primary: this.primary,
            secondary: this.secondary,
            tertiary: this.tertiary,
            shadow: this.shadow,
            danger: this.danger,
            dark: this.dark
        })}"
        style=${styleMap(labelStyle)}
      >
        <div class="mask">
          ${this.icon ? html `<temba-icon name=${this.icon} />` : null}
          <slot></slot>
        </div>
      </div>
    `;
    }
}
__decorate([
    property({ type: Boolean })
], Label.prototype, "clickable", void 0);
__decorate([
    property({ type: Boolean })
], Label.prototype, "primary", void 0);
__decorate([
    property({ type: Boolean })
], Label.prototype, "secondary", void 0);
__decorate([
    property({ type: Boolean })
], Label.prototype, "tertiary", void 0);
__decorate([
    property({ type: Boolean })
], Label.prototype, "danger", void 0);
__decorate([
    property({ type: Boolean })
], Label.prototype, "dark", void 0);
__decorate([
    property({ type: Boolean })
], Label.prototype, "shadow", void 0);
__decorate([
    property({ type: String })
], Label.prototype, "icon", void 0);
__decorate([
    property()
], Label.prototype, "backgroundColor", void 0);
__decorate([
    property()
], Label.prototype, "textColor", void 0);
//# sourceMappingURL=Label.js.map