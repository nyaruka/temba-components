import { __decorate } from "tslib";
import { property } from 'lit/decorators.js';
import { EndpointMonitorElement } from '../store/EndpointMonitorElement';
export class ContactStoreElement extends EndpointMonitorElement {
    constructor() {
        super(...arguments);
        this.endpoint = '/api/v2/contacts.json?uuid=';
    }
    prepareData(data) {
        if (data && data.length > 0) {
            data = data[0];
            data.groups.forEach((group) => {
                group.is_dynamic = this.store.isDynamicGroup(group.uuid);
            });
            data.groups.sort((a, b) => {
                if (!a.is_dynamic || !b.is_dynamic) {
                    if (a.is_dynamic) {
                        return -1;
                    }
                    if (b.is_dynamic) {
                        return 1;
                    }
                }
                return a.name.localeCompare(b.name);
            });
            return data;
        }
        return null;
    }
    postChanges(payload) {
        // clear our cache so we don't have any races
        this.store.removeFromCache(`${this.endpoint}${this.contact}`);
        return this.store
            .postJSON(`${this.endpoint}${this.contact}`, payload)
            .then((response) => {
            this.setContact(response.json);
        });
    }
    setContact(contact) {
        // make sure contact data is properly prepped
        this.data = this.prepareData([contact]);
        this.store.updateCache(`${this.endpoint}${this.contact}`, this.data);
    }
    updated(changes) {
        super.updated(changes);
        if (changes.has('contact')) {
            if (this.contact) {
                this.url = `${this.endpoint}${this.contact}`;
            }
            else {
                this.url = null;
            }
        }
    }
}
__decorate([
    property({ type: String })
], ContactStoreElement.prototype, "contact", void 0);
__decorate([
    property({ type: Object, attribute: false })
], ContactStoreElement.prototype, "data", void 0);
__decorate([
    property({ type: String })
], ContactStoreElement.prototype, "endpoint", void 0);
//# sourceMappingURL=ContactStoreElement.js.map