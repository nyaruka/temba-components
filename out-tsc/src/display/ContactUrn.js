import { __decorate } from "tslib";
import { css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
export class ContactUrn extends RapidElement {
    constructor() {
        super(...arguments);
        this.size = 20;
    }
    static get styles() {
        return css `
      :host {
        display: flex;
        align-items: center;
      }
      .urn {
        box-shadow: 0 0 2px 2px rgba(0, 0, 0, 0.04) inset;
        padding: 3px;
        border: 1px solid #ddd;
        border-radius: 18rem;
        background: #eee;
        margin-right: 0.2em;
      }

      .small {
        padding: 0px;
        border: 0px;
        box-shadow: none;
        margin-right: 0.5em;
      }
    `;
    }
    render() {
        const scheme = this.scheme || this.urn.split(':')[0];
        return html `
      <img
        class="urn ${this.size < 20 ? 'small' : ''}"
        width="${this.size}em"
        height="${this.size}em"
        src="${this.prefix ||
            window.static_url ||
            '/static/'}img/schemes/${scheme}.svg"
      />
    `;
    }
}
__decorate([
    property({ type: String })
], ContactUrn.prototype, "urn", void 0);
__decorate([
    property({ type: String })
], ContactUrn.prototype, "scheme", void 0);
__decorate([
    property({ type: Number })
], ContactUrn.prototype, "size", void 0);
//# sourceMappingURL=ContactUrn.js.map