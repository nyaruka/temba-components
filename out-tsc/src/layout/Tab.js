import { __decorate } from "tslib";
import { css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { getClasses } from '../utils';
export class Tab extends RapidElement {
    constructor() {
        super(...arguments);
        this.borderColor = 'var(--color-widget-border)';
        this.activityColor = `var(--color-link-primary)`;
        this.selected = false;
        this.notify = false;
        this.alert = false;
        this.hidden = false;
        this.hideEmpty = false;
        // show just that there is activity instead of count
        this.activity = false;
        this.count = 0;
        this.checked = false;
        this.dirty = false;
    }
    static get styles() {
        return css `
      :host {
        display: none;
        flex-direction: column;
        min-height: 0;
        pointer-events: none;
      }

      :host(.selected) {
        display: flex;
        flex-grow: 1;
        pointer-events: auto;
      }
    `;
    }
    updated(changes) {
        super.updated(changes);
        if (changes.has('selected')) {
            this.classList.toggle('selected', this.selected);
        }
    }
    hasBadge() {
        return this.count > 0;
    }
    handleDetailsChanged(event) {
        if ('dirty' in event.detail) {
            this.dirty = event.detail.dirty;
        }
        if ('count' in event.detail) {
            this.count = event.detail.count;
            if (this.hideEmpty) {
                this.hidden = this.count === 0;
            }
        }
    }
    render() {
        return html `<slot
      @temba-details-changed=${this.handleDetailsChanged}
      class="${getClasses({ selected: this.selected })}"
    ></slot> `;
    }
}
__decorate([
    property({ type: String })
], Tab.prototype, "name", void 0);
__decorate([
    property({ type: String })
], Tab.prototype, "icon", void 0);
__decorate([
    property({ type: String })
], Tab.prototype, "selectionColor", void 0);
__decorate([
    property({ type: String })
], Tab.prototype, "selectionBackground", void 0);
__decorate([
    property({ type: String })
], Tab.prototype, "borderColor", void 0);
__decorate([
    property({ type: String })
], Tab.prototype, "activityColor", void 0);
__decorate([
    property({ type: Boolean })
], Tab.prototype, "selected", void 0);
__decorate([
    property({ type: Boolean })
], Tab.prototype, "notify", void 0);
__decorate([
    property({ type: Boolean })
], Tab.prototype, "alert", void 0);
__decorate([
    property({ type: Boolean })
], Tab.prototype, "hidden", void 0);
__decorate([
    property({ type: Boolean })
], Tab.prototype, "hideEmpty", void 0);
__decorate([
    property({ type: Boolean })
], Tab.prototype, "activity", void 0);
__decorate([
    property({ type: Number })
], Tab.prototype, "count", void 0);
__decorate([
    property({ type: Boolean })
], Tab.prototype, "checked", void 0);
__decorate([
    property({ type: Boolean })
], Tab.prototype, "dirty", void 0);
//# sourceMappingURL=Tab.js.map