import { __decorate } from "tslib";
import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { EndpointMonitorElement } from './EndpointMonitorElement';
export class FlowStoreElement extends EndpointMonitorElement {
    constructor() {
        super(...arguments);
        this.endpoint = '/api/v2/flows.json?uuid=';
    }
    prepareData(data) {
        if (data && data.length > 0) {
            data = data[0];
        }
        return data;
    }
    updated(changes) {
        super.updated(changes);
        if (changes.has('flow')) {
            if (this.flow) {
                this.url = `${this.endpoint}${this.flow}`;
            }
            else {
                this.url = null;
            }
        }
    }
    render() {
        if (!this.data) {
            return;
        }
        return html `<div></div>`;
    }
}
__decorate([
    property({ type: String })
], FlowStoreElement.prototype, "flow", void 0);
__decorate([
    property({ type: Object, attribute: false })
], FlowStoreElement.prototype, "data", void 0);
__decorate([
    property({ type: String })
], FlowStoreElement.prototype, "endpoint", void 0);
//# sourceMappingURL=FlowStoreElement.js.map