import { __decorate } from "tslib";
import { css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { styleMap } from 'lit-html/directives/style-map.js';
import { RapidElement } from '../RapidElement';
import { getClasses, getMiddle, getCenter } from '../utils';
export class Tip extends RapidElement {
    constructor() {
        super(...arguments);
        this.visible = false;
        this.position = 'auto';
        this.lastEnter = 0;
        this.failSafe = 0;
    }
    static get styles() {
        return css `
      .tip {
        transition: opacity 200ms ease-in-out;
        margin: 0px;
        position: fixed;
        opacity: 0;
        background: #fff;
        padding: 4px 8px;
        pointer-events: none;
        border-radius: var(--curvature-widget);
        box-shadow: 0 1px 10px 10px rgba(0, 0, 0, 0.035),
          0 1px 3px 0px rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
        font-size: 14px;
        z-index: 10000;
        color: #333;
      }

      .tip.hide-on-change {
        transition: none;
      }

      .show {
        opacity: 1;
      }

      .slot {
        display: flex;
        flex-direction: column;
      }

      .arrow {
        position: absolute;
        color: #fff;
        font-size: 10px;
        line-height: 0px;
      }

      .◀ {
        text-shadow: -1px 2px 2px rgba(0, 0, 0, 0.1);
      }

      .▶ {
        text-shadow: 1px 2px 2px rgba(0, 0, 0, 0.1);
      }

      .▼ {
        text-shadow: 0px 3px 3px rgba(0, 0, 0, 0.1);
      }

      .▲ {
        text-shadow: 0px -1px 1px rgba(0, 0, 0, 0.1);
      }
    `;
    }
    updated(changed) {
        if ((changed.has('visible') || changed.has('text')) && this.visible) {
            this.calculatePosition();
        }
        if (changed.has('text') && this.hideOnChange) {
            this.visible = false;
        }
    }
    calculatePosition() {
        if (this.visible) {
            const tipBounds = this.getDiv('.tip').getBoundingClientRect();
            const anchorBounds = this.getDiv('.slot').getBoundingClientRect();
            // TODO: pick a direction automatically
            let tipSide = this.position;
            if (tipSide === 'auto') {
                tipSide = 'left';
            }
            this.arrowLeft = 0;
            this.arrowTop = 0;
            if (tipSide === 'left') {
                this.left = anchorBounds.left - tipBounds.width - 16;
                this.top = getMiddle(anchorBounds, tipBounds);
                // position our arrow
                this.arrowTop = tipBounds.height / 2;
                this.arrowLeft = tipBounds.width - 1;
                this.arrow = '▶';
            }
            else if (tipSide === 'right') {
                this.left = anchorBounds.right + 12;
                this.top = getMiddle(anchorBounds, tipBounds);
                this.arrowTop = tipBounds.height / 2;
                this.arrowLeft = -8;
                this.arrow = '◀';
            }
            else if (tipSide === 'top') {
                this.top = anchorBounds.top - tipBounds.height - 12;
                this.left = getCenter(anchorBounds, tipBounds);
                this.arrowTop = tipBounds.height + 2;
                this.arrowLeft = tipBounds.width / 2 - 4;
                this.arrow = '▼';
            }
            else if (tipSide === 'bottom') {
                this.top = anchorBounds.bottom + 10;
                this.left = getCenter(anchorBounds, tipBounds);
                this.arrowTop = -2;
                this.arrowLeft = tipBounds.width / 2 - 3;
                this.arrow = '▲';
            }
        }
    }
    handleMouseEnter() {
        this.lastEnter = window.setTimeout(() => {
            this.visible = true;
            this.failSafe = window.setTimeout(() => {
                this.visible = false;
            }, 2000);
        }, 600);
    }
    handleMouseLeave() {
        window.clearTimeout(this.lastEnter);
        window.clearTimeout(this.failSafe);
        this.visible = false;
    }
    render() {
        const tipStyle = {
            top: this.top ? `${this.top}px` : '0px',
            left: this.left ? `${this.left}px` : '0px'
        };
        const arrowStyle = {
            top: this.arrowTop ? `${this.arrowTop}px` : '0px',
            left: this.arrowLeft ? `${this.arrowLeft}px` : '0px'
        };
        if (this.width) {
            tipStyle.width = `${this.width}px`;
        }
        const classes = getClasses({
            tip: true,
            show: this.visible,
            top: this.poppedTop,
            'hide-on-change': this.hideOnChange
        });
        return html `
      <div
        class="slot"
        @click=${this.handleMouseLeave}
        @mouseenter=${this.handleMouseEnter}
        @mouseleave=${this.handleMouseLeave}
      >
        <slot></slot>
      </div>
      <div class="${classes}" style=${styleMap(tipStyle)}>
        ${this.text}
        <div class="arrow ${this.arrow}" style=${styleMap(arrowStyle)}>
          ${this.arrow}
        </div>
      </div>
    `;
    }
}
__decorate([
    property({ type: String })
], Tip.prototype, "text", void 0);
__decorate([
    property({ type: Boolean })
], Tip.prototype, "visible", void 0);
__decorate([
    property({ type: String })
], Tip.prototype, "position", void 0);
__decorate([
    property({ type: Boolean })
], Tip.prototype, "hideOnChange", void 0);
__decorate([
    property({ type: Number, attribute: false })
], Tip.prototype, "top", void 0);
__decorate([
    property({ type: Number, attribute: false })
], Tip.prototype, "left", void 0);
__decorate([
    property({ type: Number, attribute: false })
], Tip.prototype, "width", void 0);
__decorate([
    property({ type: Boolean, attribute: false })
], Tip.prototype, "poppedTop", void 0);
//# sourceMappingURL=Tip.js.map