import { __decorate } from "tslib";
import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { Icon, SVG_FINGERPRINT } from '../Icons';
import { getClasses } from '../utils';
export class VectorIcon extends LitElement {
    static get styles() {
        return css `
      :host {
        align-items: center;
        align-self: center;
      }

      .sheet {
        color: var(--icon-color);
        transform: scale(1);
        transition: fill 100ms ease-in-out,
          background 200ms cubic-bezier(0.68, -0.55, 0.265, 1.55),
          padding 200ms cubic-bezier(0.68, -0.55, 0.265, 1.55),
          margin 200ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
      }

      .sheet.spin {
        transform: rotate(0deg);
      }

      .sheet.spin-1 {
        transform: rotate(180deg);
      }

      .sheet.spin-2 {
        transform: rotate(360deg);
      }

      .sheet.spin-3 {
        transform: rotate(0deg);
        transition-duration: 0ms !important;
      }

      .sheet.pulse {
        transform: scale(1);
      }

      .sheet.pulse-1 {
        transform: scale(1.2);
      }

      .clickable:hover {
        cursor: pointer;
        fill: var(--color-link-primary) !important;
        background: rgb(255, 255, 255);
      }

      .circled {
        background: var(--icon-color-circle);
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

      .spin-forever {
        animation-name: spin;
        animation-duration: var(--test-animation-duration, 2000ms);
        animation-iteration-count: infinite;
        animation-timing-function: linear;
        animation-play-state: var(--test-animation-play-state, running);
      }

      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
    `;
    }
    constructor() {
        super();
        this.size = 1;
        this.animationDuration = 200;
        this.src = '';
        this.steps = 2;
        this.easing = 'cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    }
    firstUpdated(changes) {
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
    handleClicked() {
        if (this.animateClick) {
            this.animationStep = 1;
        }
    }
    updated(changes) {
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
                }
                else {
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
    render() {
        if (!this.name) {
            return null;
        }
        // let icon name mappings take precedence
        let name = this.lastName || this.name;
        // special case our channel icon fallback
        if (name.startsWith('channel_') && !Icon[name]) {
            name = Icon.channel_ex;
        }
        else {
            name = Icon[name.replace('icon.', '')] || name;
        }
        // referencing icons by id is explicit
        if (!name) {
            name = this.id;
        }
        return html `
      <div
        @click=${this.handleClicked}
        class="wrapper ${getClasses({
            clickable: this.clickable,
            circled: this.circled,
            animate: !!this.animateChange || !!this.animateClick,
            'spin-forever': this.spin
        })}"
      >
        <svg
          style="height:${this.size}em;width:${this
            .size}em;transition:transform ${this.animationDuration /
            this.steps}ms
          ${this.easing}"
          class="${getClasses({
            sheet: this.src === '',
            [this.animateChange]: !!this.animateChange,
            [this.animateChange + '-' + this.animationStep]: this.animationStep > 0,
            [this.animateClick]: !!this.animateClick,
            [this.animateClick + '-' + this.animationStep]: this.animationStep > 0
        })}"
        >
          <use
            href="${this.src
            ? this.src
            : `${this.prefix || window.static_url || '/static/'}svg/index.svg?v=${SVG_FINGERPRINT}#${name}`}"
          />
        </svg>
      </div>
    `;
    }
}
__decorate([
    property({ type: String })
], VectorIcon.prototype, "name", void 0);
__decorate([
    property({ type: String })
], VectorIcon.prototype, "prefix", void 0);
__decorate([
    property({ type: String })
], VectorIcon.prototype, "id", void 0);
__decorate([
    property({ type: Number })
], VectorIcon.prototype, "size", void 0);
__decorate([
    property({ type: Boolean })
], VectorIcon.prototype, "spin", void 0);
__decorate([
    property({ type: Boolean })
], VectorIcon.prototype, "clickable", void 0);
__decorate([
    property({ type: Boolean })
], VectorIcon.prototype, "circled", void 0);
__decorate([
    property({ type: String })
], VectorIcon.prototype, "animateChange", void 0);
__decorate([
    property({ type: String })
], VectorIcon.prototype, "animateClick", void 0);
__decorate([
    property({ type: Number })
], VectorIcon.prototype, "animationDuration", void 0);
__decorate([
    property({ type: String })
], VectorIcon.prototype, "src", void 0);
__decorate([
    property({ type: Number, attribute: false })
], VectorIcon.prototype, "steps", void 0);
__decorate([
    property({ type: Number, attribute: false })
], VectorIcon.prototype, "animationStep", void 0);
__decorate([
    property({ type: String })
], VectorIcon.prototype, "easing", void 0);
//# sourceMappingURL=Icon.js.map