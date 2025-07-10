import { __decorate } from "tslib";
import { LitElement } from 'lit';
import { Color, log } from './utils';
import { property } from 'lit/decorators.js';
const showUpdates = (ele, changes, firstUpdated = false) => {
    if (ele['DEBUG_UPDATES'] || ele['DEBUG']) {
        if (changes.size > 0) {
            const fromto = {};
            for (const key of changes.keys()) {
                fromto[key] = [changes[key], ele[key]];
            }
            log(ele.tagName, Color.PURPLE, [
                firstUpdated ? '<first-updated>' : '<updated>',
                fromto
            ]);
        }
    }
};
const showEvent = (ele, type, details = undefined) => {
    if (ele['DEBUG_EVENTS'] || ele['DEBUG']) {
        if (details !== undefined) {
            log(ele.tagName, Color.GREEN, [type, details]);
        }
        else {
            log(ele.tagName, Color.GREEN, [type]);
        }
    }
};
export class RapidElement extends LitElement {
    constructor() {
        super(...arguments);
        this.DEBUG = false;
        this.DEBUG_UPDATES = false;
        this.DEBUG_EVENTS = false;
        this.eles = {};
    }
    getEventHandlers() {
        return [];
    }
    connectedCallback() {
        super.connectedCallback();
        for (const handler of this.getEventHandlers()) {
            if (handler.isDocument) {
                document.addEventListener(handler.event, handler.method.bind(this));
            }
            else if (handler.isWindow) {
                window.addEventListener(handler.event, handler.method.bind(this));
            }
            else {
                this.addEventListener(handler.event, handler.method.bind(this));
            }
        }
    }
    disconnectedCallback() {
        for (const handler of this.getEventHandlers()) {
            if (handler.isDocument) {
                document.removeEventListener(handler.event, handler.method);
            }
            else if (handler.isWindow) {
                window.removeEventListener(handler.event, handler.method);
            }
            else {
                this.removeEventListener(handler.event, handler.method);
            }
        }
        super.disconnectedCallback();
    }
    firstUpdated(changes) {
        super.firstUpdated(changes);
        showUpdates(this, changes, true);
    }
    updated(changes) {
        super.updated(changes);
        showUpdates(this, changes, false);
    }
    getHeaders() {
        if (!this.service) {
            return {};
        }
        return {
            'X-Temba-Service-Org': this.service
        };
    }
    fireEvent(type) {
        showEvent(this, type);
        return this.dispatchEvent(new Event(type, {
            bubbles: true,
            composed: true
        }));
    }
    swallowEvent(event) {
        event.stopPropagation();
        event.preventDefault();
    }
    fireCustomEvent(type, detail = {}) {
        if (this['DEBUG_EVENTS']) {
            showEvent(this, type, detail);
        }
        const event = new CustomEvent(type, {
            detail,
            bubbles: true,
            composed: true
        });
        return this.dispatchEvent(event);
    }
    dispatchEvent(event) {
        super.dispatchEvent(event);
        const ele = event.target;
        if (ele) {
            // lookup events with - prefix and try to invoke them
            const eventFire = ele['-' + event.type];
            if (eventFire) {
                return eventFire(event);
            }
            else {
                const func = new Function('event', `
          with(document) {
            with(this) {
              let handler = ${ele.getAttribute('-' + event.type)};
              if(typeof handler === 'function') { 
                handler(event);
              }
            }
          }
        `);
                return func.call(ele, event);
            }
        }
    }
    closestElement(selector, base = this) {
        function __closestFrom(el) {
            if (!el || el === document || el === window)
                return null;
            if (el.assignedSlot)
                el = el.assignedSlot;
            const found = el.closest(selector);
            return found
                ? found
                : __closestFrom(el.getRootNode().host);
        }
        return __closestFrom(base);
    }
    getDiv(selector) {
        let ele = this.eles[selector];
        if (ele) {
            return ele;
        }
        ele = this.shadowRoot.querySelector(selector);
        if (ele) {
            this.eles[selector] = ele;
        }
        return ele;
    }
    stopEvent(event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
    }
    isMobile() {
        const win = window;
        if (win.isMobile) {
            return win.isMobile();
        }
        return false;
    }
}
__decorate([
    property({ type: String })
], RapidElement.prototype, "service", void 0);
//# sourceMappingURL=RapidElement.js.map