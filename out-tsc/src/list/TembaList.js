import { __decorate } from "tslib";
import { css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { CustomEventType } from '../interfaces';
import { RapidElement } from '../RapidElement';
import { fetchResultsPage } from '../utils';
const DEFAULT_REFRESH = 10000;
export class TembaList extends RapidElement {
    static get styles() {
        return css `
      temba-options {
        display: block;
        width: 100%;
        flex-grow: 1;
      }
    `;
    }
    constructor() {
        super();
        this.items = [];
        this.cursorIndex = -1;
        this.tabIndex = 1;
        this.valueKey = 'id';
        this.loading = false;
        this.paused = false;
        this.internalFocusDisabled = false;
        // changes to the refresh key force a refresh
        this.refreshKey = '0';
        this.reverseRefresh = true;
        // our next page from our endpoint
        this.nextPage = null;
        this.pages = 0;
        this.pending = [];
        this.refreshInterval = null;
        this.store = document.querySelector('temba-store');
        this.handleSelection.bind(this);
    }
    reset() {
        this.selected = null;
        this.nextPage = null;
        this.cursorIndex = -1;
        this.mostRecentItem = null;
        this.items = [];
    }
    connectedCallback() {
        super.connectedCallback();
        this.refreshInterval = setInterval(() => {
            if (!this.paused) {
                this.refreshKey = 'default_' + new Date().getTime();
            }
        }, DEFAULT_REFRESH);
    }
    disconnectedCallback() {
        clearInterval(this.refreshInterval);
    }
    updated(changedProperties) {
        super.updated(changedProperties);
        if (changedProperties.has('endpoint') && this.endpoint) {
            this.reset();
            this.loading = true;
            this.fetchItems();
        }
        if (changedProperties.has('loading')) {
            if (!this.loading) {
                this.fireCustomEvent(CustomEventType.FetchComplete);
            }
        }
        if (changedProperties.has('refreshKey') &&
            !changedProperties.has('endpoint')) {
            this.refreshTop();
        }
        if (changedProperties.has('mostRecentItem') && this.mostRecentItem) {
            this.fireCustomEvent(CustomEventType.Refreshed);
        }
        if (changedProperties.has('cursorIndex')) {
            if (this.cursorIndex > -1) {
                this.selected = this.items[this.cursorIndex];
                this.handleSelected(this.selected);
            }
        }
        if (changedProperties.has('items')) {
            //
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    handleSelected(selected) {
        const evt = new Event('change', { bubbles: true });
        this.dispatchEvent(evt);
    }
    getValue(obj) {
        if (!obj) {
            return null;
        }
        const path = this.valueKey.split('.');
        let current = obj;
        while (path.length > 0) {
            const key = path.shift();
            current = current[key];
        }
        return current;
    }
    setSelection(value) {
        const index = this.items.findIndex((item) => {
            return this.getValue(item) === value;
        });
        this.cursorIndex = index;
        this.selected = this.items[index];
        const evt = new Event('change', { bubbles: true });
        this.dispatchEvent(evt);
    }
    getItemIndex(value) {
        return this.items.findIndex((option) => this.getValue(option) === value);
    }
    removeItem(value) {
        const index = this.getItemIndex(value);
        this.items.splice(index, 1);
        this.items = [...this.items];
        if (this.cursorIndex === index) {
            this.cursorIndex = -1;
        }
        // request a change even if it is the same, the item is different
        this.requestUpdate('cursorIndex');
        this.requestUpdate('items');
    }
    getSelection() {
        return this.selected;
    }
    refresh() {
        this.refreshKey = 'requested_' + new Date().getTime();
    }
    setEndpoint(endpoint, nextSelection = null) {
        this.endpoint = endpoint;
        this.nextSelection = nextSelection;
    }
    getRefreshEndpoint() {
        return this.endpoint;
    }
    sanitizeResults(results) {
        return Promise.resolve(results);
    }
    /**
     * Refreshes the first page, updating any found items in our list
     */
    async refreshTop() {
        const refreshEndpoint = this.getRefreshEndpoint();
        if (!refreshEndpoint) {
            return;
        }
        // cancel any outstanding requests
        while (this.pending.length > 0) {
            const pending = this.pending.pop();
            pending.abort();
        }
        const controller = new AbortController();
        this.pending.push(controller);
        const prevItem = this.items[this.cursorIndex];
        try {
            const page = await fetchResultsPage(this.getRefreshEndpoint(), controller);
            const sanitizedResults = await this.sanitizeResults(page.results);
            const items = [...this.items];
            // remove any dupes already in our list
            if (sanitizedResults) {
                sanitizedResults.forEach((newOption) => {
                    if (this.sanitizeOption) {
                        this.sanitizeOption(newOption);
                    }
                    const newValue = this.getValue(newOption);
                    const removeIndex = items.findIndex((option) => this.getValue(option) === newValue);
                    if (removeIndex > -1) {
                        items.splice(removeIndex, 1);
                    }
                });
                // insert our new items at the front
                let results = sanitizedResults;
                if (this.reverseRefresh) {
                    results = sanitizedResults.reverse();
                }
                const newItems = [...results, ...items];
                const topItem = newItems[0];
                if (!this.mostRecentItem ||
                    JSON.stringify(this.mostRecentItem) !== JSON.stringify(topItem)) {
                    this.mostRecentItem = topItem;
                }
                if (prevItem) {
                    const newItem = newItems[this.cursorIndex];
                    const prevValue = this.getValue(prevItem);
                    if (prevValue !== this.getValue(newItem)) {
                        const newIndex = newItems.findIndex((option) => this.getValue(option) === prevValue);
                        this.cursorIndex = newIndex;
                        // make sure our focused item is visible
                        window.setTimeout(() => {
                            const options = this.shadowRoot.querySelector('temba-options');
                            if (options) {
                                const option = options.shadowRoot.querySelector('.option.focused');
                                if (option) {
                                    option.scrollIntoView({ block: 'end', inline: 'nearest' });
                                }
                            }
                        }, 0);
                    }
                }
                this.items = newItems;
            }
        }
        catch (error) {
            this.paused = true;
        }
    }
    async fetchItems() {
        // cancel any outstanding requests
        while (this.pending.length > 0) {
            const pending = this.pending.pop();
            pending.abort();
        }
        let endpoint = this.endpoint;
        let pagesToFetch = this.pages || 1;
        let pages = 0;
        let nextPage = null;
        let fetchedItems = [];
        while (pagesToFetch > 0 && endpoint) {
            const controller = new AbortController();
            this.pending.push(controller);
            try {
                const page = await fetchResultsPage(endpoint, controller);
                const sanitizedResults = await this.sanitizeResults(page.results);
                // sanitize our options if necessary
                if (this.sanitizeOption) {
                    sanitizedResults.forEach(this.sanitizeOption);
                }
                if (sanitizedResults) {
                    fetchedItems = fetchedItems.concat(sanitizedResults);
                }
                // save our next pages
                nextPage = page.next;
                endpoint = nextPage;
                pagesToFetch--;
                pages++;
            }
            catch (error) {
                // aborted
                this.reset();
                this.paused = true;
                this.loading = false;
                return;
            }
            this.nextPage = nextPage;
        }
        this.pages = pages;
        const topItem = fetchedItems[0];
        if (!this.mostRecentItem ||
            JSON.stringify(this.mostRecentItem) !== JSON.stringify(topItem)) {
            this.mostRecentItem = topItem;
        }
        // see if our cursor needs to move to stay on the same item
        const newItem = fetchedItems[this.cursorIndex];
        if (!this.nextSelection &&
            this.selected &&
            newItem &&
            this.getValue(newItem) !== this.getValue(this.selected)) {
            const index = fetchedItems.findIndex((item) => {
                return this.getValue(item) === this.getValue(this.selected);
            });
            // old selection is in the new fetch
            if (index > -1) {
                this.cursorIndex = index;
            }
            // old selection is missing from the new fetch
            else {
                // if our index didn't change, our item still did, fire change
                if (this.cursorIndex === 0) {
                    this.requestUpdate('cursorIndex');
                }
                // otherwise select the first item
                else {
                    this.cursorIndex = 0;
                }
            }
        }
        // save our results
        this.items = fetchedItems;
        this.loading = false;
        this.pending = [];
        if (this.nextSelection) {
            this.setSelection(this.nextSelection);
            this.nextSelection = false;
        }
        else {
            if (this.cursorIndex === -1 && !this.isMobile()) {
                this.cursorIndex = 0;
            }
        }
        if (this.value) {
            this.setSelection(this.value);
            this.value = null;
        }
        else if (this.isMobile() && !this.selected) {
            this.cursorIndex = -1;
            this.value = null;
            this.selected = null;
            const evt = new Event('change', { bubbles: true });
            this.dispatchEvent(evt);
        }
        return Promise.resolve();
    }
    handleScrollThreshold() {
        if (this.nextPage && !this.loading) {
            this.loading = true;
            fetchResultsPage(this.nextPage).then((page) => {
                this.sanitizeResults(page.results).then((sanitizedResults) => {
                    if (this.sanitizeOption) {
                        sanitizedResults.forEach(this.sanitizeOption);
                    }
                    this.items = [...this.items, ...sanitizedResults];
                    this.nextPage = page.next;
                    this.pages++;
                    this.loading = false;
                });
            });
        }
    }
    renderHeader() {
        return null;
    }
    renderFooter() {
        return null;
    }
    getListStyle() {
        return '';
    }
    handleSelection(event) {
        let index = event.detail.index;
        const selected = event.detail.selected;
        if (index === -1) {
            index = 0;
        }
        this.selected = selected;
        this.cursorIndex = index;
        event.stopPropagation();
        event.preventDefault();
    }
    render() {
        return html `
      ${this.renderHeader()}
      <temba-options
        style="${this.getListStyle()}"
        visible
        block
        cursorSelection
        ?hideShadow=${this.hideShadow}
        ?collapsed=${this.collapsed}
        ?loading=${this.loading}
        ?internalFocusDisabled=${this.internalFocusDisabled}
        .renderOption=${this.renderOption}
        .renderOptionDetail=${this.renderOptionDetail}
        @temba-scroll-threshold=${this.handleScrollThreshold}
        @temba-selection=${this.handleSelection.bind(this)}
        .options=${this.items}
        .cursorIndex=${this.cursorIndex}
      >
        <slot></slot>
      </temba-options>
      ${this.renderFooter()}
    `;
    }
}
__decorate([
    property({ type: Array, attribute: false })
], TembaList.prototype, "items", void 0);
__decorate([
    property({ type: Object, attribute: false })
], TembaList.prototype, "selected", void 0);
__decorate([
    property({ type: Number })
], TembaList.prototype, "cursorIndex", void 0);
__decorate([
    property({ type: String })
], TembaList.prototype, "endpoint", void 0);
__decorate([
    property({ type: String })
], TembaList.prototype, "nextSelection", void 0);
__decorate([
    property({ type: Number })
], TembaList.prototype, "tabIndex", void 0);
__decorate([
    property({ type: String })
], TembaList.prototype, "valueKey", void 0);
__decorate([
    property({ type: String })
], TembaList.prototype, "value", void 0);
__decorate([
    property({ type: Boolean })
], TembaList.prototype, "loading", void 0);
__decorate([
    property({ type: Boolean })
], TembaList.prototype, "collapsed", void 0);
__decorate([
    property({ type: Boolean })
], TembaList.prototype, "hideShadow", void 0);
__decorate([
    property({ type: Boolean })
], TembaList.prototype, "paused", void 0);
__decorate([
    property({ type: Boolean })
], TembaList.prototype, "internalFocusDisabled", void 0);
__decorate([
    property({ attribute: false })
], TembaList.prototype, "getNextRefresh", void 0);
__decorate([
    property({ attribute: false })
], TembaList.prototype, "sanitizeOption", void 0);
__decorate([
    property({ attribute: false })
], TembaList.prototype, "renderOption", void 0);
__decorate([
    property({ attribute: false })
], TembaList.prototype, "renderOptionDetail", void 0);
__decorate([
    property({ attribute: false, type: Object })
], TembaList.prototype, "mostRecentItem", void 0);
__decorate([
    property({ type: String })
], TembaList.prototype, "refreshKey", void 0);
//# sourceMappingURL=TembaList.js.map