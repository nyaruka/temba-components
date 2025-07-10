import { __decorate } from "tslib";
import { css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { ContactStoreElement } from './ContactStoreElement';
export class ContactNameFetch extends ContactStoreElement {
    constructor() {
        super(...arguments);
        this.size = 20;
    }
    static get styles() {
        return css `
      :host {
        display: flex;
      }

      temba-urn {
        margin-right: 0.2em;
        margin-top: 2px;
      }
    `;
    }
    render() {
        if (this.data) {
            return html ` <temba-contact-name
          name=${this.data.name || this.data.anon_display}
          urn=${this.data.urns.length > 0 ? this.data.urns[0] : null}
        ></temba-contact-name>
        <slot></slot>`;
        }
        return super.render();
    }
}
__decorate([
    property({ type: Number, attribute: 'icon-size' })
], ContactNameFetch.prototype, "size", void 0);
//# sourceMappingURL=ContactNameFetch.js.map