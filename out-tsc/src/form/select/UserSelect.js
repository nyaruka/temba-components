import { __decorate } from "tslib";
import { css, html } from 'lit';
import { Select } from './Select';
import { property } from 'lit/decorators.js';
import { getFullName } from '../../display/TembaUser';
export class UserSelect extends Select {
    static get styles() {
        return [
            super.styles,
            css `
        :host {
          width: 150px;
          display: block;
        }
      `
        ];
    }
    constructor() {
        super();
        this.endpoint = '/api/v2/users.json';
        this.nameKey = 'name';
        this.valueKey = 'email';
        this.placeholder = 'Select a user';
        this.sorted = true;
        this.shouldExclude = (option) => {
            const selected = this.values[0];
            return option.email === (selected === null || selected === void 0 ? void 0 : selected.email);
        };
    }
    prepareOptionsDefault(options) {
        options.forEach((option) => {
            option.name = getFullName(option);
        });
        return options;
    }
    renderOptionDefault(option) {
        if (!option) {
            return html ``;
        }
        return html `<temba-user
      email=${option.email}
      name=${option.name}
      avatar=${option.avatar}
      showname
    ></temba-user>`;
    }
}
__decorate([
    property({ type: String })
], UserSelect.prototype, "endpoint", void 0);
__decorate([
    property({ type: String })
], UserSelect.prototype, "nameKey", void 0);
__decorate([
    property({ type: String })
], UserSelect.prototype, "valueKey", void 0);
__decorate([
    property({ type: String })
], UserSelect.prototype, "placeholder", void 0);
__decorate([
    property({ type: Boolean })
], UserSelect.prototype, "sorted", void 0);
__decorate([
    property({ type: Object })
], UserSelect.prototype, "user", void 0);
//# sourceMappingURL=UserSelect.js.map