import { __decorate } from "tslib";
import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { CustomEventType } from '../interfaces';
import { RapidElement } from '../RapidElement';
/**
 * StoreMonitorElement notifies when the store is updated and with what url
 */
export class StoreMonitorElement extends RapidElement {
    constructor() {
        super(...arguments);
        this.showLoading = false;
        this.dirty = false;
    }
    markDirty() {
        this.dirty = true;
        this.store.markDirty(this);
        this.fireCustomEvent(CustomEventType.DetailsChanged, {
            dirty: true
        });
    }
    markClean() {
        this.dirty = false;
        this.store.markClean(this);
        this.fireCustomEvent(CustomEventType.DetailsChanged, {
            dirty: false
        });
    }
    handleStoreUpdated(event) {
        this.storeUpdated(event);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
    storeUpdated(event) { }
    connectedCallback() {
        super.connectedCallback();
        this.store = document.querySelector('temba-store');
        this.handleStoreUpdated = this.handleStoreUpdated.bind(this);
        if (this.store) {
            this.store.addEventListener(CustomEventType.StoreUpdated, this.handleStoreUpdated);
        }
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        if (this.store) {
            this.store.removeEventListener(CustomEventType.StoreUpdated, this.handleStoreUpdated);
            this.store.markClean(this);
        }
    }
    render() {
        if (!this.store.ready && this.showLoading) {
            return html `<temba-loading></temba-loading>`;
        }
    }
}
__decorate([
    property({ type: String })
], StoreMonitorElement.prototype, "url", void 0);
__decorate([
    property({ type: Boolean })
], StoreMonitorElement.prototype, "showLoading", void 0);
__decorate([
    property({ type: Boolean })
], StoreMonitorElement.prototype, "dirty", void 0);
__decorate([
    property({ type: String })
], StoreMonitorElement.prototype, "dirtyMessage", void 0);
//# sourceMappingURL=StoreMonitorElement.js.map