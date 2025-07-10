import { __decorate } from "tslib";
import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
export class Anchor extends LitElement {
    static get styles() {
        return css `
      :host {
        color: var(--color-link-primary);
        display: inline-block;
      }

      slot:hover {
        cursor: pointer;
        text-decoration: underline;
      }
    `;
    }
    handleClick(evt) {
        // TODO: fire event instead to be handled upstream
        window.goto(evt);
    }
    render() {
        return html `<slot href="${this.href}" @click="${this.handleClick}"></slot>`;
    }
}
__decorate([
    property({ type: String })
], Anchor.prototype, "href", void 0);
//# sourceMappingURL=Anchor.js.map