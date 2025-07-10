import { __decorate } from "tslib";
import { html, css } from 'lit';
import { FormElement } from './FormElement';
import { property } from 'lit/decorators.js';
import { Icon } from '../Icons';
export class Checkbox extends FormElement {
    constructor() {
        super(...arguments);
        this.name = '';
        this.disabled = false;
        this.size = 1.2;
        this.animateChange = 'pulse';
    }
    static get styles() {
        return css `
      :host {
        color: var(--color-text);
        display: inline-block;
      }

      :host([label]) {
        width: 100%;
      }

      .wrapper.label {
        padding: var(--checkbox-padding, 10px);
        border-radius: var(--curvature);
      }

      .wrapper.label:hover {
        background: var(--checkbox-hover-bg, #f9f9f9);
      }

      temba-field {
        --help-text-margin-left: 24px;
        cursor: pointer;
      }

      .checkbox-container {
        cursor: pointer;
        display: flex;
        user-select: none;
        -webkit-user-select: none;
      }

      .checkbox-label {
        font-family: var(--font-family);
        padding: 0px;
        margin-left: 8px;
        font-size: 14px;
        line-height: 19px;
        flex-grow: 1;
      }

      .far {
        height: 16px;
        margin-top: 1px;
      }

      .disabled {
        cursor: not-allowed;
        --icon-color: #ccc;
      }
    `;
    }
    updated(changes) {
        super.updated(changes);
        if (changes.has('checked') || changes.has('value')) {
            if (this.checked || this.partial) {
                this.internals.setFormValue(this.value || '1');
            }
            else {
                this.internals.setFormValue(undefined);
            }
            this.fireEvent('change');
        }
    }
    serializeValue(value) {
        return value;
    }
    handleClick() {
        if (!this.disabled) {
            this.checked = !this.checked;
        }
    }
    click() {
        this.handleClick();
        super.click();
    }
    render() {
        const icon = html `<temba-icon
      name="${this.checked
            ? Icon.checkbox_checked
            : this.partial
                ? Icon.checkbox_partial
                : Icon.checkbox}"
      size="${this.size}"
      animatechange="${this.animateChange}"
    />`;
        this.label = this.label ? this.label.trim() : null;
        return html `
      <div class="wrapper ${this.label ? 'label' : ''}">
        <temba-field
          name=${this.name}
          .helpText=${this.helpText}
          .errors=${this.errors}
          .widgetOnly=${this.widgetOnly}
          .helpAlways=${true}
          ?disabled=${this.disabled}
          @click=${this.handleClick}
        >
          <div class="checkbox-container ${this.disabled ? 'disabled' : ''}">
            ${icon}
            ${this.label
            ? html `<div class="checkbox-label">${this.label}</div>`
            : null}
          </div>
        </temba-field>
      </div>
    `;
    }
}
__decorate([
    property({ type: String })
], Checkbox.prototype, "name", void 0);
__decorate([
    property({ type: Boolean })
], Checkbox.prototype, "checked", void 0);
__decorate([
    property({ type: Boolean })
], Checkbox.prototype, "partial", void 0);
__decorate([
    property({ type: Boolean })
], Checkbox.prototype, "disabled", void 0);
__decorate([
    property({ type: Number })
], Checkbox.prototype, "size", void 0);
__decorate([
    property({ type: String })
], Checkbox.prototype, "animateChange", void 0);
//# sourceMappingURL=Checkbox.js.map