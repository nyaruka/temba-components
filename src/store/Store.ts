import { property } from 'lit/decorators.js';
import {
  fetchResults,
  getUrl,
  getAssets,
  Asset,
  WebResponse,
  postUrl,
} from '../utils';
import {
  ContactField,
  ContactGroup,
  CompletionOption,
  CompletionSchema,
  KeyedAssets,
  CustomEventType,
  Workspace,
} from '../interfaces';
import { RapidElement } from '../RapidElement';
import Lru from 'tiny-lru';
import {
  HumanizeDurationLanguage,
  HumanizeDuration,
} from 'humanize-duration-ts';
import { DateTime } from 'luxon';

export class Store extends RapidElement {
  @property({ type: Number })
  ttl = 60000;

  @property({ type: Number })
  max = 20;

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

  @property({ type: Object, attribute: false })
  private schema: CompletionSchema;

  @property({ type: Object, attribute: false })
  private fnOptions: CompletionOption[];

  @property({ type: Object, attribute: false })
  private keyedAssets: KeyedAssets = {};

  private locale = [...navigator.languages];

  private fields: { [key: string]: ContactField } = {};
  private groups: { [uuid: string]: ContactGroup } = {};
  private languages: any = {};
  private workspace: Workspace;
  private featuredFields: ContactField[] = [];

  private langService = new HumanizeDurationLanguage();
  private humanizer = new HumanizeDuration(this.langService);

  // http promise to monitor for completeness
  public httpComplete: Promise<void | WebResponse[]>;

  private cache: any;

  public getLocale() {
    return this.locale[0];
  }

  public reset() {
    this.cache = Lru(this.max, this.ttl);

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
        getUrl(this.completionEndpoint).then(response => {
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

    this.httpComplete = Promise.all(fetches);
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

  public refreshFields() {
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
        data: this.keyedAssets['fields'],
      });
    });
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
    return this.keyedAssets['fields'];
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
    if (group && group.query) {
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
      controller?: AbortController;
      headers?: { [key: string]: string };
    }
  ): Promise<WebResponse> {
    options = options || {};
    if (!options.force && this.cache.has(url)) {
      return new Promise<WebResponse>(resolve => {
        resolve(this.cache.get(url));
      });
    }

    return getUrl(url, options.controller, options.headers || {}).then(
      (response: WebResponse) => {
        return new Promise<WebResponse>((resolve, reject) => {
          if (response.status >= 200 && response.status <= 300) {
            this.cache.set(url, response);
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
      return new Promise<any[]>(resolve => {
        resolve(results);
      });
    }

    return new Promise<any[]>(resolve => {
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

  public makeRequest(
    url: string,
    options?: { force?: boolean; prepareData?: (data: any) => any }
  ) {
    const previousRequest = this.fetching[url];
    const now = new Date().getTime();
    // if the request was recently made, don't do anything
    if (previousRequest && now - previousRequest < 500) {
      return;
    }

    this.fetching[url] = now;
    options = options || {};
    const cached = this.cache.get(url);
    if (cached && !options.force) {
      this.fireCustomEvent(CustomEventType.StoreUpdated, { url, data: cached });
    } else {
      fetchResults(url).then(data => {
        data = options.prepareData ? options.prepareData(data) : data;
        this.cache.set(url, data);
        this.fireCustomEvent(CustomEventType.StoreUpdated, { url, data });
        delete this.fetching[url];
      });
    }
  }
}
