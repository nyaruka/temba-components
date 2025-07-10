import { __decorate } from "tslib";
import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { styleMap } from 'lit-html/directives/style-map.js';
import { Select } from './Select';
import { Icon } from '../../Icons';
var OmniType;
(function (OmniType) {
    OmniType["Group"] = "group";
    OmniType["Contact"] = "contact";
})(OmniType || (OmniType = {}));
const postNameStyle = {
    color: 'var(--color-text-dark)',
    padding: '0px 6px',
    fontSize: '12px'
};
export class Omnibox extends Select {
    constructor() {
        super(...arguments);
        this.valueKey = 'uuid';
        this.groups = false;
        this.contacts = false;
        this.placeholder = 'Select recipients';
        this.multi = true;
        this.searchable = true;
        this.searchOnFocus = true;
        this.queryParam = 'search';
    }
    update(changes) {
        super.update(changes);
        if ((changes.has('groups') || changes.has('contacts')) &&
            (this.groups || this.contacts)) {
            let types = '&types=';
            if (this.groups) {
                types += 'g';
            }
            if (this.contacts) {
                types += 'c';
            }
            this.endpoint = this.endpoint + types;
        }
    }
    /** An option in the drop down */
    renderOptionDefault(option) {
        return html `
      <div style="display:flex;">
        <div style="margin-right: 8px">${this.getIcon(option)}</div>
        <div style="flex: 1">${option.name}</div>
        <div
          style="background: rgba(50, 50, 50, 0.15); margin-left: 5px; display: flex; align-items: center; border-radius: 4px"
        >
          ${this.getPostName(option)}
        </div>
      </div>
    `;
    }
    getPostName(option) {
        const style = { ...postNameStyle };
        if (option.urn && option.type === OmniType.Contact) {
            if (option.urn !== option.name) {
                return html `<div style=${styleMap(style)}>${option.urn}</div>`;
            }
        }
        if (option.type === OmniType.Group) {
            return html `
        <div style=${styleMap(style)}>${option.count.toLocaleString()}</div>
      `;
        }
        return null;
    }
    /** Selection in the multi-select select box */
    renderSelectedItemDefault(option) {
        return html `
      <div
        style="flex:1 1 auto; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; display: flex; align-items: stretch; color: var(--color-text-dark); font-size: 12px;"
      >
        <div style="align-self: center; padding: 0px 7px; color: #bbb">
          ${this.getIcon(option)}
        </div>
        <div
          class="name"
          style="align-self: center; padding: 0px; font-size: 12px;"
        >
          ${option.name}
        </div>
        <div
          style="background: rgba(100, 100, 100, 0.05); border-left: 1px solid rgba(100, 100, 100, 0.1); margin-left: 12px; display: flex; align-items: center"
        >
          ${this.getPostName(option)}
        </div>
      </div>
    `;
    }
    getIcon(option) {
        if (option.type === OmniType.Group) {
            return html `<temba-icon name="${Icon.group}"></temba-icon>`;
        }
        if (option.type === OmniType.Contact) {
            return html `<temba-icon name="${Icon.contact}"></temba-icon>`;
        }
    }
}
__decorate([
    property({ type: String })
], Omnibox.prototype, "valueKey", void 0);
__decorate([
    property({ type: Boolean })
], Omnibox.prototype, "groups", void 0);
__decorate([
    property({ type: Boolean })
], Omnibox.prototype, "contacts", void 0);
__decorate([
    property({ type: String })
], Omnibox.prototype, "placeholder", void 0);
__decorate([
    property({ type: Boolean })
], Omnibox.prototype, "multi", void 0);
__decorate([
    property({ type: Boolean })
], Omnibox.prototype, "searchable", void 0);
__decorate([
    property({ type: Boolean })
], Omnibox.prototype, "searchOnFocus", void 0);
__decorate([
    property({ type: Boolean })
], Omnibox.prototype, "queryParam", void 0);
//# sourceMappingURL=Omnibox.js.map