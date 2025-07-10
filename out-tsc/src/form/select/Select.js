import { __decorate } from "tslib";
/* eslint-disable @typescript-eslint/no-empty-function */
import { html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { getUrl, getClasses, fetchResults, postJSON } from '../../utils';
import '../../display/Options';
import '../../list/SortableList';
import { FormElement } from '../../form/FormElement';
import { lru } from 'tiny-lru';
import { CustomEventType } from '../../interfaces';
import { renderCompletionOption, updateInputElementWithCompletion, executeCompletionQuery } from '../../excellent/helpers';
import { styleMap } from 'lit-html/directives/style-map.js';
import { Icon } from '../../Icons';
import { msg } from '@lit/localize';
const LOOK_AHEAD = 20;
export class Select extends FormElement {
    static get styles() {
        return css `
      :host {
        --transition-speed: 0;
        font-family: var(--font-family);
        transition: all ease-in-out var(--transition-speed);
        display: inline;
        line-height: normal;
        outline: none;
        position: relative;
        --icon-color: var(--color-text-dark-secondary);
      }

      temba-options {
        --temba-options-font-size: var(--temba-select-selected-font-size);
        --icon-color: var(--color-text-dark);
        --color-options-bg: #fff;
      }

      :host:focus {
        outline: none;
      }

      #anchor {
        position: absolute;
        visibility: hidden;
        width: 250px;
        height: 25px;
      }

      .remove-item {
        cursor: pointer;
        display: inline-block;
        padding: 3px 6px;
        border-right: 1px solid rgba(100, 100, 100, 0.2);
        margin: 0;
        background: rgba(100, 100, 100, 0.05);
      }

      . selected-item.multi .remove-item {
        display: none;
      }

      .remove-item:hover {
        background: rgba(100, 100, 100, 0.1);
      }

      input:focus {
        outline: none;
        box-shadow: none;
        cursor: text;
      }

      .wrapper-bg {
        background: var(--select-wrapper-bg, #fff);
        box-shadow: var(
          --select-wrapper-shadow,
          inset 0px 0px 4px rgb(0 0 0 / 10%)
        );
        border-radius: var(--curvature-widget);
      }

      .select-container {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        align-items: center;
        border: 1px solid var(--color-widget-border);
        transition: all ease-in-out var(--transition-speed);
        cursor: pointer;
        border-radius: var(--curvature-widget);
        background: var(--color-widget-bg);
        padding-top: 1px;
        box-shadow: var(--widget-box-shadow);
        position: relative;
        min-height: var(--temba-select-min-height, 2.4em);
      }

      temba-icon.select-open:hover,
      .clear-button:hover {
        --icon-color: var(--color-text-dark);
      }

      .select-container:focus {
        outline: none;
      }

      .select-container.multi {
        /* background: var(--color-widget-bg); */
      }

      .select-container.focused {
        background: var(--color-widget-bg-focused);
        border-color: var(--color-focus);
        box-shadow: var(--widget-box-shadow-focused);
      }

      .left-side {
        flex: 1;
        overflow: hidden;
      }

      .empty .placeholder {
        display: block;
      }

      .selected {
        display: flex;
        flex-direction: row;
        align-items: stretch;
        user-select: none;
        padding: var(--temba-select-selected-padding, 0px 4px);
      }

      .searchable .selected {
        padding: 4px !important;
      }

      .multi .selected {
        flex-wrap: wrap;
        padding: 4px;
      }

      .multi.empty .selected {
        padding: var(--temba-select-selected-padding);
      }

      .selected .selected-item {
        display: flex;
        overflow: hidden;
        color: var(--color-widget-text);
        line-height: var(--temba-select-selected-line-height);
        --icon-color: var(--color-text-dark);
      }

      .multi .selected .selected-item {
        vertical-align: middle;
        background: rgba(100, 100, 100, 0.1);
        user-select: none;
        border-radius: 2px;
        align-items: stretch;
        flex-direction: row;
        flex-wrap: nowrap;
        margin: 2px 2px;
      }

      .option-name > span {
        text-align: left;
      }

      .selected-item .option-name {
        padding: 0px;
        font-size: var(--temba-select-selected-font-size);
        align-self: center;
      }

      .multi .selected-item .option-name {
        flex: 1 1 auto;
        align-self: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 12px;
        padding: 2px 8px;
      }

      .multi .selected .selected-item.focused {
        background: rgba(100, 100, 100, 0.3);
      }

      .multi .selected-item.sortable {
        cursor: move;
      }

      .multi .selected-item.dragging {
        opacity: 0.5;
      }

      .multi temba-sortable-list {
        margin: 0 !important;
      }

      input {
        font-size: 13px;
        width: 0px;
        cursor: pointer;
        background: none;
        resize: none;
        border: none !important;
        visibility: visible;
        line-height: inherit !important;
        height: var(--search-input-height) !important;
        margin: 0px !important;
        padding: 0px !important;
        box-shadow: none !important;
        font-family: var(--font-family);
        caret-color: var(--input-caret);
        border: 0px solid purple !important;
      }

      .input-wrapper:focus-within {
        min-width: 1px;
      }

      .input-wrapper {
        min-width: 1px;
        margin-left: 6px;
        margin-right: -6px;
        display: flex;
      }

      .multi .input-wrapper {
        margin-left: 2px !important;
      }

      .input-wrapper:focus-within .placeholder {
        display: none;
      }

      input:focus {
        box-shadow: none !important;
        flex-grow: 1;
      }

      .searchable.search-input .input-wrapper {
        flex-grow: 1;
        min-width: 1px !important;
      }

      .searchable.single.search-input .selected .selected-item {
        display: none;
      }

      .searchable input {
        visibility: visible;
        cursor: pointer;
        background: none;
        color: var(--color-text);
        resize: none;
        box-shadow: none !important;
        border: none;
        caret-color: var(--input-caret);
      }

      .searchable input:focus {
        box-shadow: none !important;
      }

      .multi .input-wrapper {
        flex-shrink: 0;
        min-width: 100px;
      }

      .input-wrapper .searchbox {
      }

      .searchbox {
        border: 0px;
      }

      .placeholder {
        font-size: var(--temba-select-selected-font-size);
        color: var(--color-placeholder);
        display: none;
        line-height: var(--temba-select-selected-line-height);
        margin-left: 6px;
      }

      .footer {
        padding: 5px 10px;
        background: var(--color-primary-light);
        color: rgba(0, 0, 0, 0.5);
        font-size: 80%;
        border-bottom-left-radius: var(--curvature-widget);
        border-bottom-right-radius: var(--curvature-widget);
      }

      .small {
        --temba-select-selected-padding: 7px;
        --temba-select-selected-line-height: 13px;
        --temba-select-selected-font-size: 12px;
        --search-input-height: 7px !important;
      }

      .info-text {
        opacity: 1;
        transition: padding-top var(--transition-speed) ease-in-out,
          padding-bottom var(--transition-speed) ease-in-out;
        margin-bottom: 16px;
        padding: 0.5em 1em;
        border-radius: var(--curvature);
        font-size: 0.9em;
        color: rgba(0, 0, 0, 0.5);
        position: relative;
      }

      .info-text.focused {
        opacity: 1;
      }

      .info-text.hide {
        opacity: 0;
        max-height: 0;
        margin-bottom: 0px;
        pointer-events: none;
        padding: 0px;
      }

      .ghost .remove-item {
        display: none !important;
      }
    `;
    }
    constructor() {
        super();
        this.hiddenInputs = [];
        this.inputStyle = {};
        this.multi = false;
        this.searchOnFocus = false;
        this.placeholder = '';
        this.name = '';
        this.allowCreate = false;
        this.nameKey = 'name';
        this.valueKey = 'value';
        this.maxItems = 0;
        this.maxItemsText = 'Maximum items reached';
        this.queryParam = null;
        this.input = '';
        this.visibleOptions = [];
        this.completionOptions = [];
        this.quietMillis = 0;
        this.searchable = false;
        this.cache = true;
        this.cacheKey = '';
        this.focused = false;
        this.disabled = false;
        this.attemptedOpen = false;
        this.selectedIndex = -1;
        this.anchorPosition = { left: 0, top: 0 };
        this.tags = false;
        this.flavor = 'default';
        this.infoText = '';
        this.values = [];
        this.getName = (option) => option[this.nameKey || 'name'];
        this.isMatch = this.isMatchDefault;
        this.getValue = (option) => option[this.valueKey || 'value'] || option.id;
        this.sortFunction = null;
        this.renderOptionDetail = () => html ``;
        this.renderSelectedItem = this.renderSelectedItemDefault;
        this.createArbitraryOption = this.createArbitraryOptionDefault;
        this.getOptions = this.getOptionsDefault;
        this.prepareOptions = this.prepareOptionsDefault;
        this.isComplete = this.isCompleteDefault;
        this.staticOptions = [];
        this.allowAnchor = true;
        this.alphaSort = (a, b) => {
            // by default, all endpoint values are sorted by name
            if (this.endpoint) {
                return this.getName(a).localeCompare(this.getName(b));
            }
            return 0;
        };
        this.next = null;
        this.lruCache = lru(20, 60000);
        this.getNameInternal = (option) => {
            return this.getName(option);
        };
        this.renderOptionDefault = this.renderOptionDefault.bind(this);
        this.renderSelectedItemDefault = this.renderSelectedItemDefault.bind(this);
        this.prepareOptionsDefault = this.prepareOptionsDefault.bind(this);
        this.isMatchDefault = this.isMatchDefault.bind(this);
        this.handleOrderChanged = this.handleOrderChanged.bind(this);
    }
    prepareOptionsDefault(options) {
        return options;
    }
    isMatchDefault(option, q) {
        const name = this.getName(option) || '';
        return name.toLowerCase().indexOf(q) > -1;
    }
    handleSlotChange() {
        if (this.staticOptions && this.staticOptions.length === 0) {
            for (const child of this.children) {
                if (child.tagName === 'TEMBA-OPTION') {
                    const option = {};
                    for (const attribute of child.attributes) {
                        option[attribute.name] = attribute.value;
                    }
                    if (option) {
                        let selected = false;
                        // if the option is marked as selected then accept it
                        if (option['selected'] !== undefined) {
                            delete option['selected'];
                            selected = true;
                        }
                        // the option value might also match the widget value
                        const selectValue = this.value || this.getAttribute('value');
                        if (selectValue) {
                            const optionValue = this.getValue(option);
                            if (optionValue == selectValue) {
                                selected = true;
                            }
                        }
                        this.staticOptions.push(option);
                        if (selected) {
                            if (this.multi) {
                                this.addValue(option);
                            }
                            else {
                                this.setValues([option]);
                            }
                        }
                    }
                }
            }
        }
        if (this.searchable && this.staticOptions.length === 0) {
            this.quietMillis = 200;
        }
    }
    checkSelectedOption() {
        // see if we need fetch to select an option
        if (this.value &&
            this.values.length == 0 &&
            this.staticOptions.length == 0 &&
            this.endpoint) {
            const value = this.value;
            this.resolving = true;
            fetchResults(this.endpoint).then((results) => {
                if (results && results.length > 0) {
                    if (value) {
                        // if we started with a value, see if we can find it in the results
                        const existing = results.find((option) => {
                            return this.getValue(option) === value;
                        });
                        if (existing) {
                            this.resolving = false;
                            this.fetching = false;
                            this.setValues([existing]);
                            return;
                        }
                    }
                    this.setValues([results[0]]);
                    this.resolving = false;
                }
            });
        }
        else if (this.staticOptions.length > 0) {
            if (this.getAttribute('multi') !== null) {
                this.addValue(this.staticOptions[0]);
            }
            else {
                if (this.getAttribute('value')) {
                    this.setSelectedValue(this.getAttribute('value'));
                }
                else {
                    this.setValues([this.staticOptions[0]]);
                }
            }
        }
    }
    firstUpdated(changedProperties) {
        super.firstUpdated(changedProperties);
        this.anchorElement = this.shadowRoot.querySelector('.select-container');
        this.anchorExpressions = this.shadowRoot.querySelector('#anchor');
        this.shadowRoot.addEventListener('slotchange', this.handleSlotChange.bind(this));
    }
    async createOptionPost(payload) {
        return postJSON(this.endpoint, payload).then((response) => {
            if (response.status >= 200 && response.status < 300) {
                return {
                    json: response.json,
                    payload
                };
            }
        });
    }
    updated(changes) {
        super.updated(changes);
        if (changes.has('sorted')) {
            this.sortFunction = this.sorted ? this.alphaSort : null;
        }
        if (changes.has('value')) {
            if (this.value && !this.values.length) {
                this.setSelectedValue(this.value);
            }
        }
        if (changes.has('values')) {
            this.updateInputs();
            if (this.hasChanges(changes.get('values'))) {
                const materialized = [];
                // see if we need to materialize anything
                if (this.allowCreate) {
                    // arbitrary values need to be posted
                    const arbitraryValues = this.values.filter((value) => {
                        return value.arbitrary;
                    });
                    for (const value of arbitraryValues) {
                        if (value.arbitrary) {
                            materialized.push(this.createOptionPost(value));
                        }
                    }
                    // update our created values
                    Promise.all(materialized).then((responses) => {
                        for (const response of responses) {
                            if (response) {
                                // find the value that matches our payload
                                const original = arbitraryValues.find((value) => {
                                    return value === response.payload;
                                });
                                if (original) {
                                    // remove our arbitrary flag
                                    delete original.arbitrary;
                                    // add in the new values from our respones.json
                                    if (response.json) {
                                        for (const key in response.json) {
                                            original[key] = response.json[key];
                                        }
                                    }
                                }
                            }
                        }
                        // remove any arbitrary values
                        this.values = this.values.filter((value) => {
                            return !value.arbitrary;
                        });
                        // reset our cache
                        this.cacheKey = new Date().getTime().toString();
                        this.fireEvent('change');
                    });
                }
                else {
                    this.fireEvent('change');
                }
            }
        }
        // if our cache key changes, clear it out
        if (changes.has('cacheKey')) {
            this.lruCache.clear();
        }
        if (changes.has('input') &&
            !changes.has('values') &&
            !changes.has('options') &&
            this.focused) {
            if (this.lastQuery) {
                window.clearTimeout(this.lastQuery);
            }
            this.lastQuery = window.setTimeout(() => {
                if (this.expressions && this.input.indexOf('@') > -1) {
                    this.fetchExpressions();
                }
                else {
                    this.fetchOptions(this.input);
                }
            }, this.quietMillis);
        }
        if (this.endpoint && changes.has('fetching')) {
            if (!this.fetching && !this.isPastFetchThreshold()) {
                this.fireCustomEvent(CustomEventType.FetchComplete);
            }
        }
        // if our cursor changed, lets make sure our scrollbox is showing it
        if ((changes.has('cursorIndex') || changes.has('visibleOptions')) &&
            this.endpoint &&
            !this.fetching) {
            if (this.isPastFetchThreshold()) {
                if (this.next) {
                    this.fetchOptions(null, null, this.next);
                }
                else {
                    this.fetchOptions(this.query, this.page + 1);
                }
            }
        }
        // default to the first option if we don't have a placeholder
        if (this.values.length === 0 &&
            !this.placeholder &&
            this.staticOptions.length > 0) {
            this.setValues([this.staticOptions[0]]);
        }
    }
    hasChanges(prev) {
        // This will compare values to see if there is a change
        // Note: make sure value is populated or valueKey is set
        if (prev === undefined) {
            return false;
        }
        let prevValues = undefined;
        if (prev !== undefined) {
            prevValues = (prev || [])
                .map((option) => {
                return this.getValue(option);
            })
                .join(',');
        }
        const newValues = (this.values || [])
            .map((option) => {
            return option.arbitrary || this.getValue(option);
        })
            .join(',');
        return prevValues !== newValues;
    }
    setSelectedValue(value) {
        if (this.staticOptions.length > 0) {
            const existing = this.staticOptions.find((option) => {
                return this.getValue(option) === value;
            });
            if (existing) {
                this.setValues([existing]);
            }
        }
        else {
            this.checkSelectedOption();
        }
    }
    updateInputs() {
        for (let ele = null; (ele = this.hiddenInputs.pop());) {
            ele.remove();
        }
        if (this.values.length === 0) {
            this.value = null;
        }
        else {
            const name = this.getAttribute('name');
            if (name) {
                if (!this.multi && this.values.length === 1) {
                    this.selection = this.values[0];
                    this.value = this.serializeValue(this.values[0]);
                }
                else {
                    if (this.inputRoot.parentElement) {
                        this.values.forEach((value) => {
                            const ele = document.createElement('input');
                            ele.setAttribute('type', 'hidden');
                            ele.setAttribute('name', name);
                            ele.setAttribute('value', this.serializeValue(value));
                            this.hiddenInputs.push(ele);
                            this.inputRoot.parentElement.appendChild(ele);
                        });
                    }
                }
            }
        }
    }
    setSelectedOption(option) {
        if (this.multi) {
            this.addValue(option);
        }
        else {
            this.setValues([option]);
        }
        if (!this.multi || !this.searchable) {
            this.blur();
            this.focused = false;
        }
        this.visibleOptions = [];
        this.attemptedOpen = false;
        this.input = '';
        this.next = null;
        this.complete = true;
        this.selectedIndex = -1;
    }
    isPastFetchThreshold() {
        return ((this.visibleOptions.length > 0 || this.next) &&
            !this.complete &&
            (this.cursorIndex || 0) > this.visibleOptions.length - LOOK_AHEAD);
    }
    handleOptionSelection(event) {
        if (this.multi &&
            this.maxItems > 0 &&
            this.values.length >= this.maxItems) {
            this.infoText = this.maxItemsText;
            return;
        }
        else {
            this.infoText = '';
        }
        const selected = event.detail.selected;
        // check if we should post it
        if (selected.post && this.endpoint) {
            postJSON(this.endpoint, selected).then((response) => {
                if (response.status >= 200 && response.status < 300) {
                    this.setSelectedOption(response.json);
                    this.lruCache = lru(20, 60000);
                }
                else {
                    // TODO: find a way to share inline errors
                    this.blur();
                }
            });
        }
        else {
            this.setSelectedOption(selected);
        }
    }
    handleExpressionSelection(evt) {
        const option = evt.detail.selected;
        const tabbed = evt.detail.tabbed;
        const ele = this.shadowRoot.querySelector('.searchbox');
        updateInputElementWithCompletion(this.query, ele, option);
        this.query = '';
        this.completionOptions = [];
        if (tabbed) {
            this.fetchExpressions();
        }
        else if (this.input.indexOf('(') === -1) {
            this.addInputAsValue();
        }
    }
    getOptionsDefault(response) {
        return response.json['results'];
    }
    isCompleteDefault(newestOptions, response) {
        const json = response.json;
        return !json['more'] && !json['next'];
    }
    handleRemoveSelection(selectionToRemove) {
        this.removeValue(selectionToRemove);
        this.visibleOptions = [];
    }
    createArbitraryOptionDefault() {
        return null;
    }
    open() {
        this.shadowRoot.querySelector('.select-container').click();
    }
    isOpen() {
        return (this.visibleOptions.length > 0 || (this.attemptedOpen && this.focused));
    }
    setOptions(options) {
        this.staticOptions = options;
    }
    setVisibleOptions(options) {
        // if we have an exclusion filter apply it
        options = options.filter((option) => {
            // exclude unnamed
            if (!this.getNameInternal(option)) {
                return false;
            }
            if (this.shouldExclude) {
                return !this.shouldExclude(option);
            }
            return true;
        });
        if (this.input) {
            // if we are searching locally, filter for the query
            if (this.searchable && !this.queryParam) {
                const q = this.input.trim().toLowerCase();
                options = options.filter((option) => this.isMatch(option, q));
            }
            const arbitraryOption = this.createArbitraryOption(this.input, options);
            if (arbitraryOption) {
                // set our arbitrary flag so we never have more than one
                arbitraryOption.arbitrary = true;
                // make sure our id is not already present
                const exists = options.find((option) => this.getValue(option) === this.getValue(arbitraryOption));
                if (!exists) {
                    if (options.length > 0) {
                        if (options[0].arbitrary) {
                            options[0] = arbitraryOption;
                        }
                        else {
                            options.unshift(arbitraryOption);
                        }
                    }
                    else {
                        options.unshift(arbitraryOption);
                    }
                }
            }
        }
        // filter out any options already selected by id
        // TODO: should maybe be doing a deep equals here with option to optimize
        if (this.values.length > 0) {
            if (this.multi) {
                options = options.filter((option) => !this.values.find((selected) => this.getValue(selected) === this.getValue(option)));
            }
            else {
                // if no search, single select should set our cursor to the selected item
                if (!this.input) {
                    this.cursorIndex = options.findIndex((option) => this.getValue(option) === this.getValue(this.values[0]));
                }
                else {
                    this.cursorIndex = 0;
                }
                this.requestUpdate('cursorIndex');
            }
        }
        if (this.multi &&
            this.maxItems > 0 &&
            this.values.length >= this.maxItems) {
            options = [];
            this.infoText = this.maxItemsText;
        }
        // finally sort
        if (this.sortFunction) {
            options.sort(this.sortFunction);
        }
        this.visibleOptions = options;
        this.fireCustomEvent(CustomEventType.ContentChanged, {
            options: this.visibleOptions
        });
    }
    fetchExpressions() {
        const store = document.querySelector('temba-store');
        if (this.expressions && store) {
            const ele = this.shadowRoot.querySelector('.searchbox');
            const result = executeCompletionQuery(ele, this.expressions === 'session');
            this.query = result.query;
            this.completionOptions = result.options;
            this.visibleOptions = [];
            this.anchorPosition = result.anchorPosition;
            this.fireCustomEvent(CustomEventType.FetchComplete);
            return;
        }
    }
    // TODO: do we still need to support page numbers?
    fetchOptions(query, page = 0, next = null) {
        this.completionOptions = [];
        if (!this.fetching) {
            this.fetching = true;
            const options = [...this.staticOptions];
            const q = (query || '').trim().toLowerCase();
            if (this.tags && q) {
                if (!options.find((option) => this.getValue(option) && this.getValue(option).toLowerCase() === q)) {
                    options.splice(0, 0, { name: query, value: query });
                }
            }
            if (this.endpoint) {
                let url = this.endpoint;
                if (next) {
                    url = next;
                }
                else {
                    if (query && this.queryParam) {
                        if (url.indexOf('?') > -1) {
                            url += '&';
                        }
                        else {
                            url += '?';
                        }
                        url += this.queryParam + '=' + encodeURIComponent(query);
                    }
                    if (page) {
                        if (url.indexOf('?') > -1) {
                            url += '&';
                        }
                        else {
                            url += '?';
                        }
                        url += 'page=' + page;
                    }
                }
                const cache = this.lruCache.get(url);
                if (this.cache && !this.tags && cache) {
                    if (page === 0 && !this.next) {
                        this.cursorIndex = 0;
                        this.setVisibleOptions([...options, ...cache.options]);
                    }
                    else {
                        this.setVisibleOptions([...this.visibleOptions, ...cache.options]);
                    }
                    this.complete = cache.complete;
                    this.next = cache.next;
                    this.fetching = false;
                    return;
                }
                // if we are searchable, but doing it locally, fetch all the options
                if (this.searchable && !this.queryParam) {
                    fetchResults(url).then((results) => {
                        results = this.prepareOptions(results);
                        if (this.cache && !this.tags) {
                            this.lruCache.set(url, {
                                options: results,
                                complete: true,
                                next: null
                            });
                            this.complete = true;
                            this.next = null;
                            this.setVisibleOptions([...options, ...results]);
                            this.fetching = false;
                        }
                    });
                }
                else {
                    getUrl(url)
                        .then((response) => {
                        let results = this.getOptions(response).filter((option) => {
                            return this.isMatch(option, q);
                        });
                        results = this.prepareOptions(results);
                        this.next = null;
                        const json = response.json;
                        if (json['next']) {
                            this.next = json['next'];
                        }
                        if (page === 0 && !this.next) {
                            this.cursorIndex = 0;
                            this.setVisibleOptions([...options, ...results]);
                            this.query = query;
                            this.complete = this.isComplete(this.visibleOptions, response);
                        }
                        else {
                            if (results.length > 0) {
                                this.setVisibleOptions([...this.visibleOptions, ...results]);
                            }
                            this.complete = this.isComplete(results, response);
                        }
                        if (this.cache && !this.tags) {
                            this.lruCache.set(url, {
                                options: results,
                                complete: this.complete,
                                next: this.next
                            });
                        }
                        this.fetching = false;
                        this.page = page;
                    })
                        .catch((reason) => {
                        // cancelled
                        this.fetching = false;
                        console.error(reason);
                    });
                }
            }
            else {
                this.fetching = false;
                this.setVisibleOptions(options);
            }
        }
    }
    handleFocus() {
        if (!this.focused && this.visibleOptions.length === 0) {
            this.focused = true;
        }
    }
    handleBlur() {
        this.focused = false;
        this.attemptedOpen = false;
        if (this.visibleOptions.length > 0) {
            this.input = '';
            this.next = null;
            this.complete = true;
            this.visibleOptions = [];
            this.cursorIndex = 0;
        }
        if (this.multi &&
            this.maxItems > 0 &&
            this.values.length >= this.maxItems) {
            this.infoText = '';
        }
    }
    handleClick() {
        this.selectedIndex = -1;
        this.requestUpdate('input');
    }
    addInputAsValue() {
        const ele = this.shadowRoot.querySelector('.searchbox');
        const expression = {
            name: ele.value,
            value: ele.value,
            expression: true
        };
        if (this.multi) {
            if (!this.values.find((option) => {
                return (option.expression &&
                    option.value &&
                    expression.value &&
                    option.value.toLowerCase().trim() ==
                        expression.value.toLowerCase().trim());
            })) {
                this.addValue(expression);
            }
        }
        else {
            this.setValues([expression]);
        }
        this.input = '';
        if (!this.multi) {
            this.blur();
        }
    }
    handleKeyDown(evt) {
        // if we are completing an expression, select it
        if (evt.key === 'Enter' &&
            this.expressions &&
            this.completionOptions.length === 0 &&
            this.input.indexOf('@') > -1) {
            this.addInputAsValue();
        }
        // see if we should open our options on a key event
        if (evt.key === 'Enter' ||
            evt.key === 'ArrowDown' ||
            (evt.key === 'n' && evt.ctrlKey)) {
            if (this.visibleOptions.length === 0 &&
                this.completionOptions.length === 0 &&
                !this.input) {
                this.attemptedOpen = true;
                this.requestUpdate('input');
                return;
            }
        }
        // focus our last item on delete
        if (this.multi && evt.key === 'Backspace' && !this.input) {
            if (this.visibleOptions.length > 0) {
                this.visibleOptions = [];
                return;
            }
            if (this.selectedIndex === -1) {
                this.selectedIndex = this.values.length - 1;
                this.visibleOptions = [];
            }
            else {
                this.popValue();
                this.selectedIndex = -1;
            }
        }
        else {
            this.selectedIndex = -1;
        }
    }
    getStaticOptions() {
        return this.staticOptions;
    }
    handleInput(evt) {
        const ele = evt.currentTarget;
        this.input = ele.value;
    }
    handleCancel() {
        this.visibleOptions = [];
        this.attemptedOpen = false;
    }
    handleCursorChanged(event) {
        this.cursorIndex = event.detail.index;
    }
    handleContainerClick(event) {
        if (this.disabled) {
            // prevent opening dropdown right after drag-and-drop
            event.stopPropagation();
            event.preventDefault();
            return;
        }
        this.focused = true;
        if (event.target.tagName !== 'INPUT') {
            const input = this.shadowRoot.querySelector('input');
            if (input) {
                input.click();
                input.focus();
                return;
            }
            // Check if dropdown is currently open (either with options or showing "No options")
            if (this.isOpen()) {
                this.visibleOptions = [];
                this.attemptedOpen = false;
            }
            else {
                this.attemptedOpen = true;
                this.requestUpdate('input');
                // Also trigger an immediate update to show empty dropdown
                this.requestUpdate();
            }
        }
    }
    getEventHandlers() {
        return [
            { event: CustomEventType.Canceled, method: this.handleCancel },
            {
                event: CustomEventType.CursorChanged,
                method: this.handleCursorChanged
            },
            { event: 'blur', method: this.handleBlur },
            { event: 'focus', method: this.handleFocus }
        ];
    }
    handleArrowClick(event) {
        if (this.disabled) {
            return;
        }
        if (this.isOpen()) {
            event.preventDefault();
            event.stopPropagation();
            this.blur();
        }
    }
    renderOptionDefault(option) {
        if (!option) {
            return null;
        }
        // special case for icons on any option type
        const icon = option.icon;
        return html `
      <div
        class="option-name"
        style="flex: 1 1 auto;
        align-self: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        padding: 2px 8px;
        display: flex;"
      >
        ${icon
            ? html `<temba-icon
              name="${icon}"
              style="margin-right:0.5em;"
            ></temba-icon>`
            : null}<span>${this.getName(option)}</span>
      </div>
    `;
    }
    renderSelectedItemDefault(option) {
        const renderFn = this.renderOption || this.renderOptionDefault;
        return renderFn(option, true);
    }
    serializeValue(value) {
        // static options just use their value
        if (!this.jsonValue && (this.staticOptions.length > 0 || this.tags)) {
            return value.value;
        }
        return super.serializeValue(value);
    }
    setSelection(value) {
        for (const option of this.staticOptions) {
            if (this.getValue(option) === value) {
                if (this.values.length === 0 || this.values[0].value != '' + value) {
                    this.setValues([option]);
                }
                return;
            }
        }
    }
    handleClear(evt) {
        evt.preventDefault();
        evt.stopPropagation();
        this.setValues([]);
        if (this.visibleOptions.length > 0) {
            this.visibleOptions = [];
            this.requestUpdate();
        }
        this.fireCustomEvent(CustomEventType.Selection, {
            selected: null
        });
    }
    setValues(values) {
        const oldValues = this.values;
        this.values = values;
        this.requestUpdate('values', oldValues);
    }
    addValue(value) {
        const oldValues = [...this.values];
        this.values.push(value);
        this.requestUpdate('values', oldValues);
    }
    removeValue(valueToRemove) {
        const oldValues = [...this.values];
        const idx = this.values.indexOf(valueToRemove);
        if (idx > -1) {
            this.values.splice(idx, 1);
            // Also remove the 'selected' attribute from the corresponding temba-option element
            const valueToMatch = this.getValue(valueToRemove);
            for (const child of this.children) {
                if (child.tagName === 'TEMBA-OPTION') {
                    const childValue = child.getAttribute('value');
                    if (childValue === valueToMatch) {
                        child.removeAttribute('selected');
                        break;
                    }
                }
            }
        }
        this.requestUpdate('values', oldValues);
        this.infoText = '';
    }
    popValue() {
        const oldValues = [...this.values];
        this.values.pop();
        this.requestUpdate('values', oldValues);
        this.infoText = '';
    }
    clear() {
        const oldValues = this.values;
        this.values = [];
        this.requestUpdate('values', oldValues);
    }
    shouldShowEmptyMessage() {
        return (this.attemptedOpen &&
            this.focused &&
            this.visibleOptions.length === 0 &&
            !this.input &&
            this.staticOptions.length === 0 &&
            !this.endpoint);
    }
    handleOrderChanged(event) {
        const detail = event.detail;
        // Handle new swap-based format
        if (detail.swap && Array.isArray(detail.swap) && detail.swap.length === 2) {
            const [fromIdx, toIdx] = detail.swap;
            // Only reorder if the indexes are different and valid
            if (fromIdx !== toIdx &&
                fromIdx >= 0 &&
                toIdx >= 0 &&
                fromIdx < this.values.length &&
                toIdx < this.values.length) {
                const oldValues = [...this.values];
                // Move the item from fromIdx to toIdx
                const movedItem = this.values.splice(fromIdx, 1)[0];
                this.values.splice(toIdx, 0, movedItem);
                this.requestUpdate('values', oldValues);
            }
        }
    }
    render() {
        const placeholder = this.values.length === 0 ? this.placeholder : '';
        const placeholderDiv = html `
      <div class="placeholder">${placeholder}</div>
    `;
        const clear = this.clearable && this.values.length > 0 && !this.multi
            ? html `<temba-icon
            name="${Icon.select_clear}"
            size="1.1"
            class="clear-button"
            @click=${this.handleClear}
          />`
            : null;
        const classes = getClasses({
            multi: this.multi,
            single: !this.multi,
            searchable: this.searchable,
            empty: this.values.length === 0,
            options: this.visibleOptions.length > 0,
            focused: this.focused,
            'search-input': this.input.length > 0,
            'no-search-input': this.input.length === 0,
            [this.flavor]: this.flavor !== null,
            disabled: this.disabled
        });
        const anchorStyles = this.anchorPosition
            ? {
                top: '0px',
                left: `${this.anchorPosition.left - 10}px`
            }
            : {};
        const input = this.searchable
            ? html `
          <div class="input-wrapper">
            <input
              class="searchbox"
              style=${this.inputStyle ? styleMap(this.inputStyle) : ''}
              @input=${this.handleInput}
              @keydown=${this.handleKeyDown}
              @click=${this.handleClick}
              type="text"
              .value=${this.input}
            />
            <div id="anchor" style=${styleMap(anchorStyles)}></div>
            ${placeholderDiv}
          </div>
        `
            : placeholderDiv;
        return html `
            
      <temba-field
        name=${this.name}
        .label=${this.label}
        .helpText=${this.helpText}
        .errors=${this.errors}
        .widgetOnly=${this.widgetOnly}
        .hideErrors=${this.hideErrors}
        ?disabled=${this.disabled}
      >
        <slot></slot>
        <div class="wrapper-bg">
        
        <div
          tabindex="0"
          class="select-container ${classes}"
          @click=${this.handleContainerClick}
        > 
          <div class="left-side" >
          <slot name="prefix"></slot>
            <div class="selected" >
              ${this.resolving
            ? html `<temba-loading
                      style="margin-left:1em"
                    ></temba-loading>`
            : null}
              ${!this.multi && !this.resolving ? input : null}
              ${this.multi && this.values.length > 1
            ? html `
                      <temba-sortable-list
                        horizontal
                        @temba-order-changed=${this.handleOrderChanged}
                        .prepareGhost=${(item) => {
                item.style.transform = 'scale(1)';
                item.querySelector('.remove-item').style.display =
                    'none';
            }}
                      >
                        ${this.values.map((selected, index) => html `
                            <div
                              class="selected-item sortable ${index ===
                this.selectedIndex
                ? 'focused'
                : ''} ${this.draggingId === `selected-${index}`
                ? 'dragging'
                : ''}"
                              id="selected-${index}"
                              style="
                                vertical-align: middle;
                                background: rgba(100,100,100,0.1);
                                user-select: none;
                                border-radius: 2px;
                                align-items: center;
                                flex-direction: row;
                                flex-wrap: nowrap;
                                margin: 2px 2px;
                                display: flex;
                                overflow: hidden;
                                color: var(--color-widget-text);
                                line-height: var(--temba-select-selected-line-height);
                                --icon-color: var(--color-text-dark);
                                ${index === this.selectedIndex
                ? 'background: rgba(100,100,100,0.3);'
                : ''}
                                ${this.draggingId === `selected-${index}`
                ? 'opacity: 0.5;'
                : ''}
                              "
                            >
                              ${this.multi
                ? html `
                                    <div
                                      class="remove-item"
                                      style="
                                        cursor: pointer;
                                        display: inline-block;
                                        padding: 3px 6px;
                                        border-right: 1px solid rgba(100,100,100,0.2);
                                        margin: 0;
                                        background: rgba(100,100,100,0.05);
                                        margin-top:1px;
                                      "
                                      @click=${(evt) => {
                    evt.preventDefault();
                    evt.stopPropagation();
                    this.handleRemoveSelection(selected);
                }}
                                    >
                                      <temba-icon
                                        name="${Icon.delete_small}"
                                        size="1"
                                      ></temba-icon>
                                    </div>
                                  `
                : null}
                              ${this.renderSelectedItem(selected)}
                            </div>
                          `)}
                      </temba-sortable-list>
                    `
            : this.values.map((selected, index) => html `
                        <div
                          class="selected-item ${index === this.selectedIndex
                ? 'focused'
                : ''}"
                          style="
                            display: flex;
                            overflow: hidden;
                            color: var(--color-widget-text);
                            line-height: var(--temba-select-selected-line-height);
                            --icon-color: var(--color-text-dark);
                            ${index === this.selectedIndex
                ? 'background: rgba(100,100,100,0.3);'
                : ''}
                          "
                        >
                          ${this.multi
                ? html `
                                <div
                                  class="remove-item"
                                  style="
                                    cursor: pointer;
                                    display: inline-block;
                                    padding: 3px 6px;
                                    border-right: 1px solid rgba(100,100,100,0.2);
                                    margin: 0;
                                    background: rgba(100,100,100,0.05);
                                    margin-top:1px;
                                  "
                                  @click=${(evt) => {
                    evt.preventDefault();
                    evt.stopPropagation();
                    this.handleRemoveSelection(selected);
                }}
                                >
                                  <temba-icon
                                    name="${Icon.delete_small}"
                                    size="1"
                                  ></temba-icon>
                                </div>
                              `
                : null}
                          ${!this.input || this.multi
                ? this.renderSelectedItem(selected)
                : null}
                        </div>
                      `)}
              ${this.multi ? input : null}
            </div>

          </div>

          ${clear}

          <slot name="right"></slot>
          ${!this.tags
            ? html `<div
                  class="right-side arrow"
                  style="display:block;margin-right:5px"
                  @click=${this.handleArrowClick}
                >
                  <temba-icon
                    size="1.5"
                    name="${Icon.select_open}"
                    class="select-open ${this.visibleOptions.length > 0
                ? 'open'
                : ''}"
                  ></temba-icon>
                </div>`
            : null}
          </div>
          
        
        <div class="info-text ${!this.infoText ? 'hide' : ''} ${this.focused ? 'focused' : ''}">${this.infoText}</div></div></div>

    
    <temba-options
    @temba-selection=${this.handleOptionSelection}
    .cursorIndex=${this.cursorIndex}
    .renderOptionDetail=${this.renderOptionDetail}
    .renderOptionName=${this.renderOptionName}
    .renderOption=${this.renderOption || this.renderOptionDefault}
    .anchorTo=${this.allowAnchor ? this.anchorElement : null}
    .options=${this.visibleOptions}
    .spaceSelect=${this.spaceSelect}
    .nameKey=${this.nameKey}
    .getName=${this.getNameInternal}
    ?static-width=${this.optionWidth}
    ?anchor-right=${this.anchorRight}
    ?visible=${this.visibleOptions.length > 0 || this.shouldShowEmptyMessage()}
    ?showEmptyMessage=${this.shouldShowEmptyMessage()}
    ></temba-options>

    <temba-options
    @temba-selection=${this.handleExpressionSelection}
    @temba-canceled=${() => { }}
    .anchorTo=${this.allowAnchor ? this.anchorExpressions : null}
    .options=${this.completionOptions}
    .renderOption=${renderCompletionOption}
    ?visible=${this.completionOptions.length > 0}
    >
      ${this.currentFunction
            ? html `
              <div class="current-fn">
                ${renderCompletionOption(this.currentFunction, true)}
              </div>
            `
            : null}
      ${this.completionOptions.length > 0
            ? html `<div class="footer">
              ${msg('Tab to complete, enter to select')}
            </div>`
            : null}
    </temba-options>
  </temba-field>
  `;
    }
}
__decorate([
    property({ type: Object })
], Select.prototype, "inputStyle", void 0);
__decorate([
    property({ type: Boolean })
], Select.prototype, "multi", void 0);
__decorate([
    property({ type: Boolean })
], Select.prototype, "searchOnFocus", void 0);
__decorate([
    property({ type: String })
], Select.prototype, "placeholder", void 0);
__decorate([
    property()
], Select.prototype, "name", void 0);
__decorate([
    property()
], Select.prototype, "endpoint", void 0);
__decorate([
    property({ type: Boolean })
], Select.prototype, "allowCreate", void 0);
__decorate([
    property({ type: String })
], Select.prototype, "nameKey", void 0);
__decorate([
    property({ type: String })
], Select.prototype, "valueKey", void 0);
__decorate([
    property({ type: Number })
], Select.prototype, "maxItems", void 0);
__decorate([
    property({ type: String })
], Select.prototype, "maxItemsText", void 0);
__decorate([
    property({ attribute: false })
], Select.prototype, "currentFunction", void 0);
__decorate([
    property({ type: String })
], Select.prototype, "queryParam", void 0);
__decorate([
    property({ type: String })
], Select.prototype, "input", void 0);
__decorate([
    property({ type: Array })
], Select.prototype, "visibleOptions", void 0);
__decorate([
    property({ type: Array })
], Select.prototype, "completionOptions", void 0);
__decorate([
    property({ type: Number })
], Select.prototype, "quietMillis", void 0);
__decorate([
    property({ type: Boolean })
], Select.prototype, "fetching", void 0);
__decorate([
    property({ type: Boolean })
], Select.prototype, "resolving", void 0);
__decorate([
    property({ type: Boolean })
], Select.prototype, "searchable", void 0);
__decorate([
    property({ type: String })
], Select.prototype, "expressions", void 0);
__decorate([
    property({ type: Boolean })
], Select.prototype, "cache", void 0);
__decorate([
    property({ type: String })
], Select.prototype, "cacheKey", void 0);
__decorate([
    property({ type: Boolean })
], Select.prototype, "focused", void 0);
__decorate([
    property({ type: Boolean })
], Select.prototype, "disabled", void 0);
__decorate([
    state()
], Select.prototype, "attemptedOpen", void 0);
__decorate([
    property({ attribute: false })
], Select.prototype, "selectedIndex", void 0);
__decorate([
    property({ type: Number })
], Select.prototype, "cursorIndex", void 0);
__decorate([
    property({ attribute: false })
], Select.prototype, "anchorElement", void 0);
__decorate([
    property({ attribute: false })
], Select.prototype, "anchorExpressions", void 0);
__decorate([
    property({ type: Object })
], Select.prototype, "anchorPosition", void 0);
__decorate([
    property({ type: Boolean })
], Select.prototype, "tags", void 0);
__decorate([
    property({ type: Boolean, attribute: 'space_select' })
], Select.prototype, "spaceSelect", void 0);
__decorate([
    property({ type: Boolean })
], Select.prototype, "jsonValue", void 0);
__decorate([
    property({ type: Boolean })
], Select.prototype, "hideErrors", void 0);
__decorate([
    property({ type: Boolean })
], Select.prototype, "clearable", void 0);
__decorate([
    property({ type: Boolean })
], Select.prototype, "sorted", void 0);
__decorate([
    property({ type: String })
], Select.prototype, "flavor", void 0);
__decorate([
    property({ type: String, attribute: 'info_text' })
], Select.prototype, "infoText", void 0);
__decorate([
    property({ type: Array })
], Select.prototype, "values", void 0);
__decorate([
    property({ type: Object })
], Select.prototype, "selection", void 0);
__decorate([
    property({ attribute: false })
], Select.prototype, "getName", void 0);
__decorate([
    property({ attribute: false })
], Select.prototype, "isMatch", void 0);
__decorate([
    property({ attribute: false })
], Select.prototype, "getValue", void 0);
__decorate([
    property({ type: Number, attribute: 'option-width' })
], Select.prototype, "optionWidth", void 0);
__decorate([
    property({ type: Boolean, attribute: 'anchor-right' })
], Select.prototype, "anchorRight", void 0);
__decorate([
    property({ attribute: false })
], Select.prototype, "shouldExclude", void 0);
__decorate([
    property({ attribute: false })
], Select.prototype, "sortFunction", void 0);
__decorate([
    property({ attribute: false })
], Select.prototype, "renderOption", void 0);
__decorate([
    property({ attribute: false })
], Select.prototype, "renderOptionName", void 0);
__decorate([
    property({ attribute: false })
], Select.prototype, "renderOptionDetail", void 0);
__decorate([
    property({ attribute: false })
], Select.prototype, "renderSelectedItem", void 0);
__decorate([
    property({ attribute: false })
], Select.prototype, "createArbitraryOption", void 0);
__decorate([
    property({ attribute: false })
], Select.prototype, "getOptions", void 0);
__decorate([
    property({ attribute: false })
], Select.prototype, "prepareOptions", void 0);
__decorate([
    property({ attribute: false })
], Select.prototype, "isComplete", void 0);
__decorate([
    property({ type: Array, attribute: 'options' })
], Select.prototype, "staticOptions", void 0);
__decorate([
    property({ type: Boolean })
], Select.prototype, "allowAnchor", void 0);
__decorate([
    property({ type: String })
], Select.prototype, "draggingId", void 0);
//# sourceMappingURL=Select.js.map