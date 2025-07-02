import { property } from 'lit/decorators.js';
import {
  fetchResults,
  getUrl,
  getAssets,
  Asset,
  WebResponse,
  postUrl,
  postJSON,
  postForm,
  getCookie
} from '../utils';
import {
  ContactField,
  ContactGroup,
  CompletionOption,
  CompletionSchema,
  KeyedAssets,
  CustomEventType,
  Workspace,
  Shortcut
} from '../interfaces';
import { RapidElement } from '../RapidElement';
import { lru } from 'tiny-lru';
import { DateTime } from 'luxon';
import { css, html } from 'lit';
import { configureLocalization } from '@lit/localize';
import { sourceLocale, targetLocales } from '../locales/locale-codes';
import { StoreMonitorElement } from './StoreMonitorElement';
import { getFullName } from '../display/TembaUser';
import { AppState, zustand } from './AppState';
import { StoreApi } from 'zustand/vanilla';

const { setLocale } = configureLocalization({
  sourceLocale,
  targetLocales,
  loadLocale: (locale) => import(`./locales/${locale}.js`)
});

export const getStore = () => {
  return document.querySelector('temba-store') as Store;
};

export class Store extends RapidElement {
  public static get styles() {
    return css`
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

  settings = {};

  @property({ type: Number })
  ttl = 60000;

  @property({ type: Number })
  max = 20;

  @property({ type: Boolean })
  ready = false;

  @property({ type: Boolean })
  loader = false;

  @property({ type: String, attribute: 'completion' })
  completionEndpoint: string;

  @property({ type: String, attribute: 'fields' })
  fieldsEndpoint: string;

  @property({ type: String, attribute: 'groups' })
  groupsEndpoint: string;

  @property({ type: String, attribute: 'globals' })
  globalsEndpoint: string;

  @property({ type: String, attribute: 'languages' })
  languagesEndpoint: string;

  @property({ type: String, attribute: 'workspace' })
  workspaceEndpoint: string;

  @property({ type: String, attribute: 'shortcuts' })
  shortcutsEndpoint: string;

  @property({ type: Object, attribute: false })
  private schema: CompletionSchema;

  @property({ type: Object, attribute: false })
  private fnOptions: CompletionOption[];

  @property({ type: Object, attribute: false })
  private keyedAssets: KeyedAssets = {};

  private locale = [...navigator.languages];

  private fields: { [key: string]: ContactField } = {};
  private groups: { [uuid: string]: ContactGroup } = {};
  private shortcuts: Shortcut[] = [];
  private languages: any = {};
  private workspace: Workspace;
  private featuredFields: ContactField[] = [];

  // http promise to monitor for completeness
  public initialHttpComplete: Promise<void | WebResponse[]>;

  private dirtyElements: StoreMonitorElement[] = [];

  public markDirty(ele: StoreMonitorElement) {
    if (!this.dirtyElements.includes(ele)) {
      this.dirtyElements.push(ele);
    }
  }

  public cleanAll() {
    this.dirtyElements.forEach((ele) => ele.markClean());
    this.dirtyElements = [];
  }

  public markClean(ele: StoreMonitorElement) {
    this.dirtyElements = this.dirtyElements.filter((el) => el !== ele);
  }

  public getDirtyMessage() {
    if (this.dirtyElements.length > 0) {
      return (
        this.dirtyElements[0].dirtyMessage ||
        'You have unsaved changes, are you sure you want to continue?'
      );
    }
  }

  private cache: any;
  public getLocale() {
    return this.locale[0];
  }

  public clearCache() {
    this.cache = lru(this.max, this.ttl);
  }

  public reset() {
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
      fetches.push(
        getUrl(this.completionEndpoint).then((response) => {
          this.schema = response.json['context'] as CompletionSchema;
          this.fnOptions = response.json['functions'] as CompletionOption[];
        })
      );
    }

    if (this.fieldsEndpoint) {
      fetches.push(this.refreshFields());
    }

    if (this.globalsEndpoint) {
      fetches.push(
        getAssets(this.globalsEndpoint).then((assets: Asset[]) => {
          this.keyedAssets['globals'] = assets.map((asset: Asset) => asset.key);
        })
      );
    }

    if (this.languagesEndpoint) {
      appState.fetchAllLanguages(this.languagesEndpoint);
      fetches.push(
        getAssets(this.languagesEndpoint).then((results: any[]) => {
          // convert array of objects to lookup
          this.languages = results.reduce(function (
            languages: any,
            result: any
          ) {
            languages[result.value] = result.name;
            return languages;
          },
          {});
        })
      );
    }

    if (this.groupsEndpoint) {
      fetches.push(
        getAssets(this.groupsEndpoint).then((groups: any[]) => {
          groups.forEach((group: any) => {
            this.groups[group.uuid] = group;
          });
        })
      );
    }

    if (this.workspaceEndpoint) {
      appState.fetchWorkspace(this.workspaceEndpoint);
      fetches.push(
        getUrl(this.workspaceEndpoint).then((response: WebResponse) => {
          this.workspace = response.json;
          const lang = response.headers.get('content-language');
          if (lang) {
            this.locale = [lang, ...this.locale];
          }
        })
      );
    }

    if (this.shortcutsEndpoint) {
      fetches.push(this.refreshShortcuts());
    }

    this.initialHttpComplete = Promise.all(fetches);

    this.initialHttpComplete.then(() => {
      this.ready = true;
    });
  }

  public getShortcuts() {
    return this.shortcuts || [];
  }

  public firstUpdated() {
    this.reset();
  }

  public getLanguageCode() {
    if (this.locale.length > 0) {
      return this.locale[0].split('-')[0];
    }
    return 'en';
  }

  public async refreshGlobals() {
    return getAssets(this.globalsEndpoint).then((assets: Asset[]) => {
      this.keyedAssets['globals'] = assets.map((asset: Asset) => asset.key);
    });
  }

  public async refreshShortcuts() {
    return getAssets(this.shortcutsEndpoint).then((shortcuts: Shortcut[]) => {
      this.shortcuts = shortcuts;
    });
  }

  public async refreshFields() {
    return getAssets(this.fieldsEndpoint).then((assets: Asset[]) => {
      this.keyedAssets['fields'] = [];
      this.featuredFields = [];

      assets.forEach((field: ContactField) => {
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

  public shiftAndRound(duration, unit: string, singular: string) {
    const value = Math.round(duration.shiftTo(unit).get(unit));
    if (value == 1) {
      return `1 ${singular}`;
    } else {
      return `${value} ${unit}`;
    }
  }

  public getCountdown(futureDate: DateTime) {
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

  public getShortDuration(scheduled: DateTime, compareDate: DateTime = null) {
    const now = compareDate || DateTime.now();
    return scheduled
      .setLocale(this.locale[0])
      .toRelative({ base: now, style: 'long' });
  }

  public getShortDurationFromIso(isoDateA: string, isoDateB: string = null) {
    const scheduled = DateTime.fromISO(isoDateA);
    const now = isoDateB ? DateTime.fromISO(isoDateB) : DateTime.now();
    return this.getShortDuration(scheduled, now);
  }

  public setKeyedAssets(name: string, values: string[]): void {
    this.keyedAssets[name] = values;
  }

  public updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    if (changedProperties.has('ready') && this.ready) {
      const locale = this.getLanguageCode();
      const target = targetLocales.find(
        (targetLocale) => targetLocale === locale
      );

      if (target) {
        setLocale(target);
      }
    }
  }

  public getCompletionSchema(): CompletionSchema {
    return this.schema;
  }

  public getFunctions(): CompletionOption[] {
    return this.fnOptions;
  }

  public getKeyedAssets(): KeyedAssets {
    return this.keyedAssets;
  }

  public getFieldKeys(): string[] {
    return this.keyedAssets['fields'] || [];
  }

  public getContactField(key: string): ContactField {
    return this.fields[key];
  }

  public getFeaturedFields(): ContactField[] {
    return this.featuredFields;
  }

  public getLanguageName(iso: string) {
    return this.languages[iso];
  }

  public isDynamicGroup(uuid: string): boolean {
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

  public getWorkspace(): Workspace {
    return this.workspace;
  }

  public formatDate(dateString: string) {
    return DateTime.fromISO(dateString)
      .setLocale(this.getLocale())
      .toLocaleString(DateTime.DATETIME_SHORT);
  }

  public postJSON(url: string, payload: any = '') {
    return postJSON(url, payload);
  }

  public postForm(url: string, payload: any | FormData, headers: any = {}) {
    return postForm(url, payload, headers);
  }

  public postUrl(
    url: string,
    payload: any = '',
    headers: any = {},
    contentType = null
  ) {
    return postUrl(url, payload, headers, contentType);
  }

  public getUrl(
    url: string,
    options?: {
      force?: boolean;
      skipCache?: boolean;
      controller?: AbortController;
      headers?: { [key: string]: string };
    }
  ): Promise<WebResponse> {
    options = options || {};
    if (!options.force && this.cache.has(url)) {
      return new Promise<WebResponse>((resolve) => {
        resolve(this.cache.get(url));
      });
    }

    return getUrl(url, options.controller, options.headers || {}).then(
      (response: WebResponse) => {
        return new Promise<WebResponse>((resolve, reject) => {
          if (response.status >= 200 && response.status <= 300) {
            if (!options.skipCache) {
              this.cache.set(url, response);
            }
            resolve(response);
          } else {
            reject('Status: ' + response.status);
          }
        });
      }
    );
  }

  private pendingResolves = {};

  /**
   * Fetches all of the results for a given API endpoint with caching
   * @param url
   */
  public getResults(
    url: string,
    options?: { force?: boolean }
  ): Promise<any[]> {
    options = options || {};
    const key = 'results_' + url;
    const results = this.cache.get(key);

    if (!options.force && results) {
      return new Promise<any[]>((resolve) => {
        resolve(results);
      });
    }

    return new Promise<any[]>((resolve) => {
      const pending = this.pendingResolves[url] || [];
      pending.push(resolve);
      this.pendingResolves[url] = pending;
      if (pending.length <= 1) {
        fetchResults(url).then((results: any[]) => {
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

  public fetching: { [url: string]: number } = {};

  public updateCache(url: string, data: any) {
    this.cache.set(url, data);
    this.fireCustomEvent(CustomEventType.StoreUpdated, { url, data });
  }

  public removeFromCache(url: string) {
    this.cache.delete(url);
  }

  public resolveUsers(items: any, keys: string[]): Promise<void> {
    return new Promise<void>((resolve) => {
      const emails = new Set<string>();

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
        promises.push(
          this.getUrl(`/api/v2/users.json?email=${encodeURIComponent(email)}`, {
            force: true
          })
        );
      });

      // wait for all of our user fetches to complete
      Promise.all(promises).then((promises) => {
        promises.forEach((response: WebResponse) => {
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

  public makeRequest(
    url: string,
    options?: { force?: boolean; prepareData?: (data: any) => any }
  ) {
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
    } else {
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

  public get(key: string, defaultValue: any = null) {
    return this.settings[key] || defaultValue;
  }

  public set(key: string, value: string) {
    this.settings[key] = value;
    // not sure yet if we really want to perist these
    // setCookie(COOKIE_KEYS.SETTINGS, JSON.stringify(this.settings), '/');
  }

  public render() {
    if (!this.ready && this.loader) {
      return html`<temba-loading size="10" units="8"></temba-loading>`;
    }
  }

  public getCompletions(type: string) {
    const info = this.getState().flowInfo;
    if (type === 'results') {
      return info.results.map((result) => result.key);
    } else if (type === 'locals') {
      return info.locals;
    }

    return this.keyedAssets[type] || [];
  }

  public getApp(): StoreApi<AppState> {
    return zustand;
  }

  public getState(): AppState {
    return zustand.getState();
  }
}
