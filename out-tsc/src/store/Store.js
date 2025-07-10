import { __decorate } from "tslib";
import { property } from 'lit/decorators.js';
import { fetchResults, getUrl, getAssets, postUrl, postJSON, postForm, getCookie } from '../utils';
import { CustomEventType } from '../interfaces';
import { RapidElement } from '../RapidElement';
import { lru } from 'tiny-lru';
import { DateTime } from 'luxon';
import { css, html } from 'lit';
import { configureLocalization } from '@lit/localize';
import { sourceLocale, targetLocales } from '../locales/locale-codes';
import { getFullName } from '../display/TembaUser';
import { zustand } from './AppState';
const { setLocale } = configureLocalization({
    sourceLocale,
    targetLocales,
    loadLocale: (locale) => import(`./locales/${locale}.js`)
});
export const getStore = () => {
    return document.querySelector('temba-store');
};
export class Store extends RapidElement {
    constructor() {
        super(...arguments);
        this.settings = {};
        this.ttl = 60000;
        this.max = 20;
        this.ready = false;
        this.loader = false;
        this.keyedAssets = {};
        this.locale = [...navigator.languages];
        this.fields = {};
        this.groups = {};
        this.shortcuts = [];
        this.languages = {};
        this.featuredFields = [];
        this.dirtyElements = [];
        this.pendingResolves = {};
        this.fetching = {};
    }
    static get styles() {
        return css `
      :host {
        position: fixed;
        z-index: 1000;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        top: 0.5em;
      }
    `;
    }
    markDirty(ele) {
        if (!this.dirtyElements.includes(ele)) {
            this.dirtyElements.push(ele);
        }
    }
    cleanAll() {
        this.dirtyElements.forEach((ele) => ele.markClean());
        this.dirtyElements = [];
    }
    markClean(ele) {
        this.dirtyElements = this.dirtyElements.filter((el) => el !== ele);
    }
    getDirtyMessage() {
        if (this.dirtyElements.length > 0) {
            return (this.dirtyElements[0].dirtyMessage ||
                'You have unsaved changes, are you sure you want to continue?');
        }
    }
    getLocale() {
        return this.locale[0];
    }
    clearCache() {
        this.cache = lru(this.max, this.ttl);
    }
    reset() {
        const appState = this.getState();
        this.ready = false;
        this.clearCache();
        this.settings = JSON.parse(getCookie('settings') || '{}');
        /*
        // This will create a shorthand unit
        this.humanizer.addLanguage("en", {
          y: () => "y",
          mo: () => "mo",
          w: () => "w",
          d: () => "d",
          h: () => "h",
          m: () => "m",
          s: () => "s",
          ms: () => "ms",
          decimal: ".",
        });
        */
        const fetches = [];
        if (this.completionEndpoint) {
            fetches.push(getUrl(this.completionEndpoint).then((response) => {
                this.schema = response.json['context'];
                this.fnOptions = response.json['functions'];
            }));
        }
        if (this.fieldsEndpoint) {
            fetches.push(this.refreshFields());
        }
        if (this.globalsEndpoint) {
            fetches.push(getAssets(this.globalsEndpoint).then((assets) => {
                this.keyedAssets['globals'] = assets.map((asset) => asset.key);
            }));
        }
        if (this.languagesEndpoint) {
            appState.fetchAllLanguages(this.languagesEndpoint);
            fetches.push(getAssets(this.languagesEndpoint).then((results) => {
                // convert array of objects to lookup
                this.languages = results.reduce(function (languages, result) {
                    languages[result.value] = result.name;
                    return languages;
                }, {});
            }));
        }
        if (this.groupsEndpoint) {
            fetches.push(getAssets(this.groupsEndpoint).then((groups) => {
                groups.forEach((group) => {
                    this.groups[group.uuid] = group;
                });
            }));
        }
        if (this.workspaceEndpoint) {
            appState.fetchWorkspace(this.workspaceEndpoint);
            fetches.push(getUrl(this.workspaceEndpoint).then((response) => {
                this.workspace = response.json;
                const lang = response.headers.get('content-language');
                if (lang) {
                    this.locale = [lang, ...this.locale];
                }
            }));
        }
        if (this.shortcutsEndpoint) {
            fetches.push(this.refreshShortcuts());
        }
        this.initialHttpComplete = Promise.all(fetches);
        this.initialHttpComplete.then(() => {
            this.ready = true;
        });
    }
    getShortcuts() {
        return this.shortcuts || [];
    }
    firstUpdated() {
        this.reset();
    }
    getLanguageCode() {
        if (this.locale.length > 0) {
            return this.locale[0].split('-')[0];
        }
        return 'en';
    }
    async refreshGlobals() {
        return getAssets(this.globalsEndpoint).then((assets) => {
            this.keyedAssets['globals'] = assets.map((asset) => asset.key);
        });
    }
    async refreshShortcuts() {
        return getAssets(this.shortcutsEndpoint).then((shortcuts) => {
            this.shortcuts = shortcuts;
        });
    }
    async refreshFields() {
        return getAssets(this.fieldsEndpoint).then((assets) => {
            this.keyedAssets['fields'] = [];
            this.featuredFields = [];
            assets.forEach((field) => {
                this.keyedAssets['fields'].push(field.key);
                this.fields[field.key] = field;
                if (field.featured) {
                    this.featuredFields.push(field);
                }
            });
            this.featuredFields.sort((a, b) => {
                return b.priority - a.priority;
            });
            this.keyedAssets['fields'].sort();
            this.fireCustomEvent(CustomEventType.StoreUpdated, {
                url: this.fieldsEndpoint,
                data: this.keyedAssets['fields']
            });
        });
    }
    shiftAndRound(duration, unit, singular) {
        const value = Math.round(duration.shiftTo(unit).get(unit));
        if (value == 1) {
            return `1 ${singular}`;
        }
        else {
            return `${value} ${unit}`;
        }
    }
    getCountdown(futureDate) {
        const duration = futureDate.diff(DateTime.now());
        const comps = duration.rescale();
        if (comps.months > 0) {
            return '> 1 month';
        }
        if (comps.days > 1) {
            return `~ ${this.shiftAndRound(comps, 'days', 'day')}`;
        }
        if (comps.hours > 0) {
            return `~ ${this.shiftAndRound(comps, 'hours', 'hour')}`;
        }
        return `~ ${this.shiftAndRound(comps, 'minutes', 'minute')}`;
    }
    getShortDuration(scheduled, compareDate = null) {
        const now = compareDate || DateTime.now();
        return scheduled
            .setLocale(this.locale[0])
            .toRelative({ base: now, style: 'long' });
    }
    getShortDurationFromIso(isoDateA, isoDateB = null) {
        const scheduled = DateTime.fromISO(isoDateA);
        const now = isoDateB ? DateTime.fromISO(isoDateB) : DateTime.now();
        return this.getShortDuration(scheduled, now);
    }
    setKeyedAssets(name, values) {
        this.keyedAssets[name] = values;
    }
    updated(changedProperties) {
        super.updated(changedProperties);
        if (changedProperties.has('ready') && this.ready) {
            const locale = this.getLanguageCode();
            const target = targetLocales.find((targetLocale) => targetLocale === locale);
            if (target) {
                setLocale(target);
            }
        }
    }
    getCompletionSchema() {
        return this.schema;
    }
    getFunctions() {
        return this.fnOptions;
    }
    getKeyedAssets() {
        return this.keyedAssets;
    }
    getFieldKeys() {
        return this.keyedAssets['fields'] || [];
    }
    getContactField(key) {
        return this.fields[key];
    }
    getFeaturedFields() {
        return this.featuredFields;
    }
    getLanguageName(iso) {
        return this.languages[iso];
    }
    isDynamicGroup(uuid) {
        const group = this.groups[uuid];
        // we treat missing groups as dynamic since the
        // api excludes initializing groups
        if (!group) {
            // console.warn('No group for ' + uuid);
        }
        if (!group || group.query) {
            return true;
        }
        return false;
    }
    getWorkspace() {
        return this.workspace;
    }
    formatDate(dateString) {
        return DateTime.fromISO(dateString)
            .setLocale(this.getLocale())
            .toLocaleString(DateTime.DATETIME_SHORT);
    }
    postJSON(url, payload = '') {
        return postJSON(url, payload);
    }
    postForm(url, payload, headers = {}) {
        return postForm(url, payload, headers);
    }
    postUrl(url, payload = '', headers = {}, contentType = null) {
        return postUrl(url, payload, headers, contentType);
    }
    getUrl(url, options) {
        options = options || {};
        if (!options.force && this.cache.has(url)) {
            return new Promise((resolve) => {
                resolve(this.cache.get(url));
            });
        }
        return getUrl(url, options.controller, options.headers || {}).then((response) => {
            return new Promise((resolve, reject) => {
                if (response.status >= 200 && response.status <= 300) {
                    if (!options.skipCache) {
                        this.cache.set(url, response);
                    }
                    resolve(response);
                }
                else {
                    reject('Status: ' + response.status);
                }
            });
        });
    }
    /**
     * Fetches all of the results for a given API endpoint with caching
     * @param url
     */
    getResults(url, options) {
        options = options || {};
        const key = 'results_' + url;
        const results = this.cache.get(key);
        if (!options.force && results) {
            return new Promise((resolve) => {
                resolve(results);
            });
        }
        return new Promise((resolve) => {
            const pending = this.pendingResolves[url] || [];
            pending.push(resolve);
            this.pendingResolves[url] = pending;
            if (pending.length <= 1) {
                fetchResults(url).then((results) => {
                    this.cache.set(key, results);
                    const pending = this.pendingResolves[url] || [];
                    while (pending.length > 0) {
                        const resolve = pending.pop();
                        resolve(results);
                    }
                });
            }
        });
    }
    updateCache(url, data) {
        this.cache.set(url, data);
        this.fireCustomEvent(CustomEventType.StoreUpdated, { url, data });
    }
    removeFromCache(url) {
        this.cache.delete(url);
    }
    resolveUsers(items, keys) {
        return new Promise((resolve) => {
            const emails = new Set();
            // keys are dot notation paths to user fields
            items.forEach((item) => {
                keys.forEach((key) => {
                    const parts = key.split('.');
                    let value = item;
                    for (let i = 0; i < parts.length; i++) {
                        value = value[parts[i]];
                        if (!value) {
                            break;
                        }
                    }
                    if (value && value.email) {
                        emails.add(value.email);
                    }
                });
            });
            const promises = [];
            // we don't want to fetch all users at once so we can benefit from caching
            emails.forEach((email) => {
                promises.push(this.getUrl(`/api/v2/users.json?email=${encodeURIComponent(email)}`, {
                    force: true
                }));
            });
            // wait for all of our user fetches to complete
            Promise.all(promises).then((promises) => {
                promises.forEach((response) => {
                    if (response && response.json) {
                        const results = response.json.results;
                        if (results && results.length === 1) {
                            const user = results[0];
                            items.forEach((item) => {
                                // replace each key with a matching user
                                keys.forEach((key) => {
                                    const parts = key.split('.');
                                    let value = item;
                                    let last = value;
                                    for (let i = 0; i < parts.length; i++) {
                                        last = value;
                                        value = value[parts[i]];
                                        if (!value) {
                                            break;
                                        }
                                    }
                                    if (value && value.email === user.email) {
                                        // only care about avatars for now
                                        const orginalUser = last[parts[parts.length - 1]];
                                        orginalUser.avatar = user.avatar;
                                        orginalUser.name = getFullName(user);
                                        orginalUser.uuid = user.uuid;
                                        last[parts[parts.length - 1]].avatar = user.avatar;
                                    }
                                });
                            });
                        }
                    }
                });
                resolve();
            });
        });
    }
    makeRequest(url, options) {
        const previousRequest = this.fetching[url];
        const now = new Date().getTime();
        // if the request was recently made, don't do anything
        if (previousRequest) {
            setTimeout(() => {
                this.makeRequest(url, options);
            }, 500);
            return;
        }
        let cached = this.cache.get(url);
        if (cached && !options.force) {
            cached = options.prepareData ? options.prepareData(cached) : cached;
            this.fireCustomEvent(CustomEventType.StoreUpdated, { url, data: cached });
        }
        else {
            options = options || {};
            this.fetching[url] = now;
            fetchResults(url).then((data) => {
                if (!data) {
                    delete this.fetching[url];
                    return;
                }
                this.cache.set(url, data);
                delete this.fetching[url];
                data = options.prepareData ? options.prepareData(data) : data;
                this.fireCustomEvent(CustomEventType.StoreUpdated, { url, data });
            });
        }
    }
    get(key, defaultValue = null) {
        return this.settings[key] || defaultValue;
    }
    set(key, value) {
        this.settings[key] = value;
        // not sure yet if we really want to perist these
        // setCookie(COOKIE_KEYS.SETTINGS, JSON.stringify(this.settings), '/');
    }
    render() {
        if (!this.ready && this.loader) {
            return html `<temba-loading size="10" units="8"></temba-loading>`;
        }
    }
    getCompletions(type) {
        const info = this.getState().flowInfo;
        if (type === 'results') {
            return info.results.map((result) => result.key);
        }
        else if (type === 'locals') {
            return info.locals;
        }
        return this.keyedAssets[type] || [];
    }
    getApp() {
        return zustand;
    }
    getState() {
        return zustand.getState();
    }
}
__decorate([
    property({ type: Number })
], Store.prototype, "ttl", void 0);
__decorate([
    property({ type: Number })
], Store.prototype, "max", void 0);
__decorate([
    property({ type: Boolean })
], Store.prototype, "ready", void 0);
__decorate([
    property({ type: Boolean })
], Store.prototype, "loader", void 0);
__decorate([
    property({ type: String, attribute: 'completion' })
], Store.prototype, "completionEndpoint", void 0);
__decorate([
    property({ type: String, attribute: 'fields' })
], Store.prototype, "fieldsEndpoint", void 0);
__decorate([
    property({ type: String, attribute: 'groups' })
], Store.prototype, "groupsEndpoint", void 0);
__decorate([
    property({ type: String, attribute: 'globals' })
], Store.prototype, "globalsEndpoint", void 0);
__decorate([
    property({ type: String, attribute: 'languages' })
], Store.prototype, "languagesEndpoint", void 0);
__decorate([
    property({ type: String, attribute: 'workspace' })
], Store.prototype, "workspaceEndpoint", void 0);
__decorate([
    property({ type: String, attribute: 'shortcuts' })
], Store.prototype, "shortcutsEndpoint", void 0);
__decorate([
    property({ type: Object, attribute: false })
], Store.prototype, "schema", void 0);
__decorate([
    property({ type: Object, attribute: false })
], Store.prototype, "fnOptions", void 0);
__decorate([
    property({ type: Object, attribute: false })
], Store.prototype, "keyedAssets", void 0);
//# sourceMappingURL=Store.js.map