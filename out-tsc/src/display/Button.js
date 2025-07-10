import { __decorate } from "tslib";
import { LitElement, html, css } from 'lit';
import { getClasses } from '../utils';
import { property } from 'lit/decorators.js';
export class Button extends LitElement {
    constructor() {
        super(...arguments);
        this.v = 1;
    }
    static get styles() {
        return css `
      :host {
        display: flex;
        align-self: stretch;
        font-family: var(--font-family);
        font-weight: 400;
      }

      .small {
        font-size: 0.8em;
        --button-y: 0px;
        --button-x: 0.5em;
      }

      .v-2.button-container {
        background: var(--button-bg);
        background-image: var(--button-bg-img);
        color: var(--button-text);
        box-shadow: var(--button-shadow);
        transition: all calc(var(--transition-speed) / 2) ease-in;
      }

      .button-container {
        color: #fff;
        cursor: pointer;
        display: flex;
        flex-grow: 1;
        border-radius: var(--curvature);
        outline: none;
        transition: background ease-in var(--transition-speed);
        user-select: none;
        -webkit-user-select: none;
        text-align: center;
        border: var(--button-border, none);
      }

      .button-name {
        white-space: nowrap;
      }

      .secondary-button:hover .button-mask {
        border: 1px solid var(--color-button-secondary);
      }

      .button-mask:hover {
        background: rgba(0, 0, 0, 0.05);
      }

      .button-container:focus {
        outline: none;
        margin: 0;
      }

      .button-container:focus {
        box-shadow: var(--widget-box-shadow-focused);
      }

      .button-container.secondary-button:focus .button-mask {
        background: transparent;
      }

      .button-mask {
        padding: var(--button-y) var(--button-x);
        border-radius: var(--curvature);
        border: 1px solid transparent;
        transition: var(--transition-speed);
        background: var(--button-mask);
        display: flex;
        align-items: center;
      }

      .button-container.disabled-button {
        background: rgba(0, 0, 0, 0.05);
        color: rgba(255, 255, 255, 0.45);
        cursor: default;
      }

      .button-container.disabled-button .button-mask {
        box-shadow: 0 0 0px 1px var(--color-button-disabled);
      }

      .button-container.disabled-button:hover .button-mask {
        box-shadow: 0 0 0px 1px var(--color-button-disabled);
        background: rgba(0, 0, 0, 0.05);
      }

      .button-container.active-button .button-mask {
      }

      .secondary-button.active-button {
        background: transparent;
        color: var(--color-text);
      }

      .secondary-button.active-button .button-mask {
        border: none;
      }

      .button-container.secondary-button.active-button:focus .button-mask {
        background: transparent;
        box-shadow: none;
      }

      .primary-button {
        background: var(--color-button-primary);
        color: var(--color-button-primary-text);
      }

      .affirmative {
        background: var(--color-button-attention);
      }

      .light-button {
        background: var(--color-button-light);
        color: var(--color-button-light-text);
      }

      .lined-button {
        border: 1px solid rgba(0, 0, 0, 0.1);
        color: rgba(0, 0, 0, 0.7);
        background: transparent;
      }

      .lined-button .button-mask {
        flex-grow: 1;
      }

      .lined-button .button-mask:hover {
        background: rgba(0, 0, 0, 0.03);
      }

      .icon-button {
        --button-y: 0.2em;
        --button-x: 0em;
      }

      .icon-button temba-icon {
        padding: 0 0.5em;
      }

      .attention-button {
        background: var(--color-button-attention);
        color: var(--color-button-primary-text);
      }

      .secondary-button {
        background: transparent;
        color: var(--color-text);
      }

      .destructive-button {
        background: var(--color-button-destructive);
        color: var(--color-button-destructive-text);
      }

      .button-mask.disabled-button {
        background: rgba(0, 0, 0, 0.1);
      }

      .secondary-button .button-mask:hover {
        background: transparent;
      }

      .submit-animation {
        padding: 1px 4px;
      }

      .submit-animation temba-loading {
        margin-bottom: -3px;
        line-height: normal;
      }
    `;
    }
    handleClick(evt) {
        if (this.disabled) {
            evt.preventDefault();
            evt.stopPropagation();
        }
        if (this.href && !this.disabled) {
            this.ownerDocument.location.href = this.href;
            evt.preventDefault();
            evt.stopPropagation();
        }
    }
    handleKeyUp(event) {
        this.active = false;
        if (event.key === 'Enter') {
            this.click();
        }
    }
    handleMouseDown() {
        if (!this.disabled && !this.submitting) {
            this.active = true;
            this.classList.add('active');
        }
    }
    handleMouseUp() {
        this.active = false;
        this.classList.remove('active');
    }
    render() {
        const buttonName = this.submitting
            ? html `<div class="submit-animation">
          <temba-loading units="3" size="8" color="#eee"></temba-loading>
        </div>`
            : this.name;
        return html `
      <div
        class="button-container 
          v-${this.v}
          ${getClasses({
            'primary-button': this.primary ||
                (!this.primary &&
                    !this.secondary &&
                    !this.attention &&
                    this.v == 1),
            'secondary-button': this.secondary,
            'disabled-button': this.disabled,
            'active-button': this.active,
            'attention-button': this.attention,
            'destructive-button': this.destructive,
            'light-button': this.light,
            'lined-button': this.lined,
            'icon-button': !!this.icon,
            small: this.small
        })}"
        tabindex="0"
        @mousedown=${this.handleMouseDown}
        @mouseup=${this.handleMouseUp}
        @mouseleave=${this.handleMouseUp}
        @keyup=${this.handleKeyUp}
        @click=${this.handleClick}
      >
        <div class="button-mask">
          ${this.icon
            ? html `<temba-icon name="${this.icon}"></temba-icon>`
            : null}
          <div class="button-name"><slot name="name">${buttonName}</slot></div>
        </div>
      </div>
    `;
    }
}
__decorate([
    property({ type: Boolean })
], Button.prototype, "primary", void 0);
__decorate([
    property({ type: Boolean })
], Button.prototype, "secondary", void 0);
__decorate([
    property({ type: Boolean })
], Button.prototype, "attention", void 0);
__decorate([
    property({ type: Number })
], Button.prototype, "v", void 0);
__decorate([
    property({ type: Boolean })
], Button.prototype, "destructive", void 0);
__decorate([
    property({ type: Boolean })
], Button.prototype, "light", void 0);
__decorate([
    property()
], Button.prototype, "name", void 0);
__decorate([
    property({ type: Boolean })
], Button.prototype, "disabled", void 0);
__decorate([
    property({ type: Boolean })
], Button.prototype, "submitting", void 0);
__decorate([
    property({ type: Boolean })
], Button.prototype, "active", void 0);
__decorate([
    property({ type: Boolean })
], Button.prototype, "small", void 0);
__decorate([
    property({ type: Boolean })
], Button.prototype, "lined", void 0);
__decorate([
    property({ type: String })
], Button.prototype, "href", void 0);
__decorate([
    property({ type: Number })
], Button.prototype, "index", void 0);
__decorate([
    property({ type: String })
], Button.prototype, "icon", void 0);
//# sourceMappingURL=Button.js.map