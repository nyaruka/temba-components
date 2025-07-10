import { __decorate } from "tslib";
import { html, css, LitElement } from 'lit';
import { property } from 'lit/decorators.js';
import { styleMap } from 'lit-html/directives/style-map.js';
import { range } from '../utils';
export class Loading extends LitElement {
    constructor() {
        super(...arguments);
        this.color = 'var(--color-primary-dark)';
        this.size = 5;
        this.units = 5;
        this.direction = 'row';
    }
    static get styles() {
        return css `
      :host {
        display: block;
      }

      .loading-unit {
        border: 1px inset rgba(0, 0, 0, 0.05);
        animation: loading-pulse 0.9s cubic-bezier(0.3, 0, 0.7, 1) infinite;
      }

      .loading-container {
        display: flex;
      }

      @keyframes loading-pulse {
        0% {
          transform: scale(0.2);
          opacity: 0.1;
        }
        20% {
          transform: scale(1);
          opacity: 1;
        }
        100% {
          transform: scale(0.2);
          opacity: 0.1;
        }
      }
    `;
    }
    render() {
        const margin = this.size / 2;
        return html `
      <div class="loading-container" style="flex-direction:${this.direction}">
        ${range(0, this.units).map((num) => {
            const ballStyle = {
                'border-radius': this.square ? '0' : '50%',
                width: this.size + 'px',
                height: this.size + 'px',
                margin: margin + 'px',
                animationDelay: `-${1 - num * (1 / this.units)}s`,
                background: this.color
            };
            return html `
            <div class="loading-unit" style=${styleMap(ballStyle)}></div>
          `;
        })}
      </div>
    `;
    }
}
__decorate([
    property({ type: String })
], Loading.prototype, "color", void 0);
__decorate([
    property({ type: Number })
], Loading.prototype, "size", void 0);
__decorate([
    property({ type: Number })
], Loading.prototype, "units", void 0);
__decorate([
    property({ type: Boolean })
], Loading.prototype, "square", void 0);
__decorate([
    property({ type: String })
], Loading.prototype, "direction", void 0);
//# sourceMappingURL=Loading.js.map