import { __decorate } from "tslib";
import { html, css, LitElement } from 'lit';
import { property } from 'lit/decorators.js';
import { renderMarkdown } from '../markdown';
/**
 * A small wrapper to display labels and help text in a smartmin style.
 * This exists so we can display things consistently before restyling.
 */
export class FormField extends LitElement {
    constructor() {
        super(...arguments);
        this.hideLabel = false;
        this.widgetOnly = false;
        this.errors = [];
        this.hideErrors = false;
        this.helpText = '';
        this.helpAlways = true;
        this.label = '';
        this.name = '';
        this.disabled = false;
    }
    static get styles() {
        return css `
      :host {
        font-family: var(--font-family);
      }

      label {
        margin-bottom: 5px;
        margin-left: 4px;
        display: block;
        font-weight: 400;
        font-size: var(--label-size);
        letter-spacing: 0.05em;
        line-height: normal;
        color: #777;
      }

      .help-text {
        font-size: var(--help-text-size);
        line-height: normal;
        color: var(--color-text-help);
        margin-left: var(--help-text-margin-left);
        margin-top: -16px;
        opacity: 0;
        transition: opacity ease-in-out 100ms, margin-top ease-in-out 200ms;
        pointer-events: none;
      }

      .help-text.help-always {
        opacity: 1;
        margin-top: 6px;
        margin-left: var(--help-text-margin-left);
      }

      .field:focus-within .help-text {
        margin-top: 6px;
        opacity: 1;
      }

      .alert-error {
        background: rgba(255, 181, 181, 0.17);
        border: none;
        border-left: 0px solid var(--color-error);
        color: var(--color-error);
        padding: 10px;
        margin: 15px 0px;
        border-radius: var(--curvature);
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1),
          0 1px 2px 0 rgba(0, 0, 0, 0.06);
      }

      .disabled {
        opacity: var(--disabled-opacity) !important;
        pointer-events: none !important;
      }
    `;
    }
    render() {
        const errors = !this.hideErrors
            ? (this.errors || []).map((error) => {
                return html `
            <div class="alert-error">${renderMarkdown(error)}</div>
          `;
            })
            : [];
        if (this.widgetOnly) {
            return html `
        <div class="${this.disabled ? 'disabled' : ''}"><slot></slot></div>
        ${errors}
      `;
        }
        return html `
      <div class="field ${this.disabled ? 'disabled' : ''}">
        ${!!this.name && !this.hideLabel && !!this.label
            ? html `
              <label class="control-label" for="${this.name}"
                >${this.label}</label
              >
            `
            : null}
        <div class="widget">
          <slot></slot>
        </div>
        ${this.helpText && this.helpText !== 'None'
            ? html `
              <div class="help-text ${this.helpAlways ? 'help-always' : null}">
                ${this.helpText}
              </div>
            `
            : null}
        ${errors}
      </div>
    `;
    }
}
__decorate([
    property({ type: Boolean, attribute: 'hide_label' })
], FormField.prototype, "hideLabel", void 0);
__decorate([
    property({ type: Boolean, attribute: 'widget_only' })
], FormField.prototype, "widgetOnly", void 0);
__decorate([
    property({ type: Array, attribute: false })
], FormField.prototype, "errors", void 0);
__decorate([
    property({ type: Boolean })
], FormField.prototype, "hideErrors", void 0);
__decorate([
    property({ type: String, attribute: 'help_text' })
], FormField.prototype, "helpText", void 0);
__decorate([
    property({ type: Boolean, attribute: 'help_always' })
], FormField.prototype, "helpAlways", void 0);
__decorate([
    property({ type: String })
], FormField.prototype, "label", void 0);
__decorate([
    property({ type: String })
], FormField.prototype, "name", void 0);
__decorate([
    property({ type: Boolean })
], FormField.prototype, "disabled", void 0);
//# sourceMappingURL=FormField.js.map