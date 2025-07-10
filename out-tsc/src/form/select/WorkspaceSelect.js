import { __decorate } from "tslib";
import { css, html } from 'lit';
import { Select } from './Select';
import { property } from 'lit/decorators.js';
import { getScrollParent } from '../../utils';
export class WorkspaceSelect extends Select {
    static get styles() {
        return [
            super.styles,
            css `
        :host {
          border: 0px solid blue;
        }
      `
        ];
    }
    constructor() {
        super();
        this.endpoint = '/api/internal/orgs.json';
        this.nameKey = 'name';
        this.valueKey = 'id';
        this.placeholder = 'Choose Workspace';
        this.sorted = true;
        this.shouldExclude = (option) => {
            const selected = this.values[0];
            return option.id === (selected === null || selected === void 0 ? void 0 : selected.id);
        };
        this.searchable = true;
    }
    firstUpdated(changed) {
        super.firstUpdated(changed);
        this.allowAnchor = !!getScrollParent(this);
    }
    prepareOptionsDefault(options) {
        options.forEach((option) => {
            option.type = 'workspace';
        });
        return options;
    }
    renderOptionDefault(option) {
        if (!option) {
            return html ``;
        }
        return html `<temba-user name=${option.name} showname></temba-user>`;
    }
}
__decorate([
    property({ type: String })
], WorkspaceSelect.prototype, "endpoint", void 0);
__decorate([
    property({ type: String })
], WorkspaceSelect.prototype, "nameKey", void 0);
__decorate([
    property({ type: String })
], WorkspaceSelect.prototype, "valueKey", void 0);
__decorate([
    property({ type: String })
], WorkspaceSelect.prototype, "placeholder", void 0);
__decorate([
    property({ type: Boolean })
], WorkspaceSelect.prototype, "sorted", void 0);
__decorate([
    property({ type: Object })
], WorkspaceSelect.prototype, "workspace", void 0);
//# sourceMappingURL=WorkspaceSelect.js.map