import { __decorate } from "tslib";
import { property } from 'lit/decorators.js';
import { CustomEventType } from './interfaces';
import { RapidElement } from './RapidElement';
export class RefreshElement extends RapidElement {
    updated(properties) {
        if (properties.has('endpoint')) {
            this.refresh();
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    refreshComplete(results) {
        // noop
    }
    refresh(force = false) {
        const store = document.querySelector('temba-store');
        if (store) {
            store.getResults(this.endpoint, { force }).then((results) => {
                this.fireCustomEvent(CustomEventType.Refreshed, results);
                this.refreshComplete(results);
            });
        }
    }
}
__decorate([
    property({ type: String })
], RefreshElement.prototype, "endpoint", void 0);
//# sourceMappingURL=RefreshElement.js.map