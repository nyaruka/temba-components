import { __decorate } from "tslib";
import { css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
export class ContactName extends RapidElement {
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

      temba-urn {
        margin-right: 0.2em;
      }

      .name {
        font-size: var(--contact-name-font-size, 1.5rem);
        overflow: hidden;
        max-height: 2rem;
        line-height: 2rem;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 1;
        text-overflow: ellipsis;
      }
    `;
    }
    render() {
        const urn = this.urn
            ? html `<temba-urn size=${this.size} urn=${this.urn}></temba-urn>`
            : null;
        return html `
      ${urn}
      <div class="name">
        ${this.name ? this.name : this.urn ? this.urn.split(':')[1] : ''}
      </div>
      <slot></slot>
    `;
    }
}
__decorate([
    property({ type: String })
], ContactName.prototype, "name", void 0);
__decorate([
    property({ type: String })
], ContactName.prototype, "urn", void 0);
__decorate([
    property({ type: Number, attribute: 'icon-size' })
], ContactName.prototype, "size", void 0);
//# sourceMappingURL=ContactName.js.map