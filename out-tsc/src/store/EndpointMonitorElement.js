import { __decorate } from "tslib";
import { property } from 'lit/decorators.js';
import { CustomEventType } from '../interfaces';
import { StoreMonitorElement } from './StoreMonitorElement';
/**
 * StoreElement is a listener for a given endpoint that re-renders
 * when the underlying store element changes
 */
export class EndpointMonitorElement extends StoreMonitorElement {
    constructor() {
        super(...arguments);
        this.showLoading = false;
    }
    connectedCallback() {
        super.connectedCallback();
        this.prepareData = this.prepareData.bind(this);
    }
    prepareData(data) {
        return data;
    }
    refresh() {
        this.store.makeRequest(this.url, {
            prepareData: this.prepareData,
            force: true
        });
    }
    storeUpdated(event) {
        if (event.detail.url === this.url) {
            const previous = this.data;
            this.data = event.detail.data;
            this.fireCustomEvent(CustomEventType.Refreshed, {
                data: event.detail.data,
                previous
            });
        }
    }
    updated(properties) {
        super.updated(properties);
        if (properties.has('url')) {
            if (this.url) {
                this.store.makeRequest(this.url, { prepareData: this.prepareData });
            }
            else {
                this.data = null;
            }
        }
    }
}
__decorate([
    property({ type: String })
], EndpointMonitorElement.prototype, "url", void 0);
__decorate([
    property({ type: Boolean })
], EndpointMonitorElement.prototype, "showLoading", void 0);
__decorate([
    property({ type: Object, attribute: false })
], EndpointMonitorElement.prototype, "data", void 0);
//# sourceMappingURL=EndpointMonitorElement.js.map