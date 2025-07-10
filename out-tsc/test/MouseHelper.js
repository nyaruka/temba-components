import { __decorate } from "tslib";
import { css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { RapidElement } from '../src/RapidElement';
let MouseHelper = class MouseHelper extends RapidElement {
    static get styles() {
        return css `
      :host {
        position: absolute;
      }

      .pointer {
        position: absolute;
        width: 6px;
        height: 6px;
        z-index: 1000;
        background: rgba(0, 250, 0, 0.3);
        border-radius: 20px;
        margin-left: -3px;
        margin-top: -3px;
        pointer-events: none;
      }
    `;
    }
    connectedCallback() {
        super.connectedCallback();
        this.updateCursor = this.updateCursor.bind(this);
        document.addEventListener('mousemove', this.updateCursor);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('mousemove', this.updateCursor);
    }
    updateCursor(event) {
        const pointer = this.shadowRoot.querySelector('.pointer');
        pointer.style.left = event.offsetX + 'px';
        pointer.style.top = event.offsetY + 'px';
    }
    render() {
        return html `<div class="pointer"></div>`;
    }
};
MouseHelper = __decorate([
    customElement('mouse-helper')
], MouseHelper);
export default MouseHelper;
//# sourceMappingURL=MouseHelper.js.map