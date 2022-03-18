/* eslint-disable @typescript-eslint/no-empty-function */
import { TemplateResult, html, css } from 'lit';
import { property } from 'lit/decorators';
import {
  getUrl,
  getClasses,
  fetchResults,
  WebResponse,
  postJSON,
} from '../utils';
import '../options/Options';
import { EventHandler } from '../RapidElement';
import { FormElement } from '../FormElement';

import flru from 'flru';
import { CompletionOption, CustomEventType, Position } from '../interfaces';
import {
  renderCompletionOption,
  updateInputElementWithCompletion,
  executeCompletionQuery,
} from '../completion/helpers';
import { Store } from '../store/Store';
import { styleMap } from 'lit-html/directives/style-map';

const LOOK_AHEAD = 20;

export class Select extends FormElement {
  static get styles() {
    return css`
      :host {
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
        z-index: 3;
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

      .selected-item.multi .remove-item {
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
        box-shadow: 0 3px 20px 0 rgba(0, 0, 0, 0.04),
          0 1px 2px 0 rgba(0, 0, 0, 0.02);

        position: relative;
        z-index: 2;
      }

      temba-icon[name='chevron-down']:hover,
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
      }

      .empty .selected {
      }

      .empty .placeholder {
        display: block;
      }

      .selected {
        display: flex;
        flex-direction: row;
        align-items: stretch;
        user-select: none;
        padding: var(--temba-select-selected-padding);
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
      }

      input:focus {
        box-shadow: none !important;
      }

      .searchable.no-search-input .input-wrapper {
        flex-grow: inherit;
        min-width: 1px;
      }

      .searchable.no-search-input.empty .input-wrapper {
        flex-grow: 1;
        min-width: 1px;
      }

      .searchable.no-search-input .input-wrapper .searchbox {
        flex-grow: inherit;
        min-width: 1px;
      }

      .searchable .input-wrapper .searchbox {
        flex-grow: 1;
        min-width: 100%;
        height: 100%;
      }

      .searchable.single.search-input .selected .selected-item {
        display: none;
      }

      .searchable.single.no-search-input
        .selected
        .input-wrapper
        input.searchbox {
        padding: 6px 2px !important;
      }

      .searchable.single.no-search-input.empty
        .selected
        .input-wrapper
        input.searchbox {
        padding: 6px 6px !important;
      }

      .empty input {
        width: 100%;
      }

      .searchable input {
        padding: 6px 4px !important;
      }

      .searchable input {
        font-weight: 300;
        visibility: visible;
        cursor: pointer;
        background: none;
        color: var(--color-text);
        resize: none;
        box-shadow: none !important;
        flex-grow: 1;
        border: none;
        caret-color: var(--input-caret);
      }

      .searchable input:focus {
        box-shadow: none !important;
      }

      .input-wrapper {
        flex-grow: 1;
      }

      .input-wrapper .searchbox {
      }

      .searchbox {
        border: 0px;
      }

      .searchbox::placeholder {
        color: var(--color-placeholder);
        font-weight: 300;
        font-size: 1.1em;
        line-height: var(--temba-select-selected-line-height);
        padding-left: 1px;
      }

      .placeholder {
        font-size: var(--temba-select-selected-font-size);
        color: var(--color-placeholder);
        display: none;
        font-weight: 300;
        line-height: var(--temba-select-selected-line-height);
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
        transition: margin var(--transition-speed) ease-in-out;
        margin-bottom: 16px;
        margin-top: -1em;
        padding: 0.5em 1em;
        background: #f3f3f3;
        padding-top: 1.5em;
        border-radius: var(--curvature);
        font-size: 0.9em;
        color: rgba(0, 0, 0, 0.5);
        box-shadow: inset 0px 0px 4px rgb(0 0 0 / 10%);
        z-index: 1;
        position: relative;
      }

      .info-text.focused {
        opacity: 1;
      }

      .info-text.hide {
        opacity: 0;
        max-height: 0;
        margin-bottom: 0px;
        margin-top: -2em;
        pointer-events: none;
      }
    `;
  }

  @property({ type: Boolean })
  multi = false;

  @property({ type: Boolean })
  searchOnFocus = false;

  @property({ type: String })
  placeholder = '';

  @property()
  name = '';

  @property()
  endpoint: string;

  @property({ type: String })
  nameKey = 'name';

  @property({ type: String })
  valueKey = 'value';

  @property({ attribute: false })
  currentFunction: CompletionOption;

  @property({ type: String })
  queryParam: string = null;

  @property({ type: String })
  input = '';

  @property({ type: Array })
  visibleOptions: any[] = [];

  @property({ type: Array })
  completionOptions: CompletionOption[] = [];

  @property({ type: Number })
  quietMillis = 0;

  @property({ type: Boolean })
  fetching: boolean;

  @property({ type: Boolean })
  searchable = false;

  @property({ type: String })
  expressions: string;

  @property({ type: Boolean })
  cache = true;

  @property({ type: String })
  cacheKey = '';

  @property({ type: Boolean })
  focused = false;

  @property({ type: Boolean })
  disabled = false;

  @property({ attribute: false })
  selectedIndex = -1;

  @property({ type: Number })
  cursorIndex: number;

  @property({ attribute: false })
  anchorElement: HTMLElement;

  @property({ attribute: false })
  anchorExpressions: HTMLElement;

  @property({ type: Object })
  anchorPosition: Position = { left: 0, top: 0 };

  @property({ type: Boolean })
  tags = false;

  @property({ type: Boolean, attribute: 'space_select' })
  spaceSelect: boolean;

  @property({ type: Boolean })
  jsonValue: boolean;

  @property({ type: Boolean })
  hideErrors: boolean;

  @property({ type: Boolean })
  clearable: boolean;

  @property({ type: String })
  flavor = 'default';

  @property({ type: String, attribute: 'info_text' })
  infoText = '';

  @property({ attribute: false })
  getName: (option: any) => string = (option: any) =>
    option[this.nameKey || 'name'];

  @property({ attribute: false })
  isMatch: (option: any, q: string) => boolean = (option: any, q: string) => {
    const name = this.getName(option) || '';
    return name.toLowerCase().indexOf(q) > -1;
  };

  @property({ attribute: false })
  getValue: (option: any) => string = (option: any) =>
    option[this.valueKey || 'value'] || option.id;

  @property({ attribute: false })
  shouldExclude: (option: any) => boolean;

  @property({ attribute: false })
  sortFunction: (a: any, b: any) => number;

  @property({ attribute: false })
  renderOption: (option: any, selected: boolean) => TemplateResult;

  @property({ attribute: false })
  renderOptionName: (option: any, selected: boolean) => TemplateResult;

  @property({ attribute: false })
  renderOptionDetail: (option: any, selected: boolean) => TemplateResult = () =>
    html``;

  @property({ attribute: false })
  renderSelectedItem: (option: any) => TemplateResult =
    this.renderSelectedItemDefault;

  @property({ attribute: false })
  createArbitraryOption: (input: string, options: any[]) => any =
    this.createArbitraryOptionDefault;

  @property({ attribute: false })
  getOptions: (response: WebResponse) => any[] = this.getOptionsDefault;

  @property({ attribute: false })
  isComplete: (newestOptions: any[], response: WebResponse) => boolean =
    this.isCompleteDefault;

  @property({ type: Array, attribute: 'options' })
  private staticOptions: any[] = [];

  private lastQuery: number;

  // private cancelToken: CancelTokenSource;
  private complete: boolean;
  private page: number;
  private next: string = null;
  private query: string;

  private removingSelection: boolean;

  private lruCache = flru(20);

  // http promise to monitor for completeness
  public httpComplete: Promise<void | WebResponse>;

  public updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    // if our cache key changes, clear it out
    if (changedProperties.has('cacheKey')) {
      this.lruCache.clear(false);
    }

    if (
      changedProperties.has('input') &&
      !changedProperties.has('values') &&
      !changedProperties.has('options') &&
      this.focused
    ) {
      if (this.lastQuery) {
        window.clearTimeout(this.lastQuery);
      }

      this.lastQuery = window.setTimeout(() => {
        if (this.expressions && this.input.indexOf('@') > -1) {
          this.fetchExpressions();
        } else {
          this.fetchOptions(this.input);
        }
      }, this.quietMillis);
    }

    // if our cursor changed, lets make sure our scrollbox is showing it
    if (
      (changedProperties.has('cursorIndex') ||
        changedProperties.has('visibleOptions')) &&
      this.endpoint &&
      !this.fetching
    ) {
      if (
        (this.visibleOptions.length > 0 || this.next) &&
        !this.complete &&
        (this.cursorIndex || 0) > this.visibleOptions.length - LOOK_AHEAD
      ) {
        this.fetchOptions(this.query, this.page + 1);
      }
    }

    // if they set an inital value, look through our static options for it
    if (changedProperties.has('value') && this.value) {
      const existing = this.staticOptions.find(option => {
        return this.getValue(option) === this.value;
      });

      if (existing) {
        this.setValue(existing);
      }
    }

    // default to the first option if we don't have a placeholder
    if (
      this.values.length === 0 &&
      !this.placeholder &&
      this.staticOptions.length > 0
    ) {
      this.setValue(this.staticOptions[0]);
    }
  }

  private setSelectedOption(option: any) {
    if (this.multi) {
      this.addValue(option);
    } else {
      this.setValue(option);
    }

    if (!this.multi || !this.searchable) {
      this.blur();
      this.focused = false;
    }

    this.visibleOptions = [];
    this.input = '';
    this.next = null;
    this.complete = true;
    this.selectedIndex = -1;

    this.fireEvent('change');
  }

  public handleOptionSelection(event: CustomEvent) {
    const selected = event.detail.selected;
    // check if we should post it
    if (selected.post && this.endpoint) {
      postJSON(this.endpoint, selected).then(response => {
        if (response.status >= 200 && response.status < 300) {
          this.setSelectedOption(response.json);
          this.lruCache = flru(20);
        } else {
          // TODO: find a way to share inline errors
          this.blur();
        }
      });
    } else {
      this.setSelectedOption(selected);
    }
  }

  private handleExpressionSelection(evt: CustomEvent) {
    const option = evt.detail.selected as CompletionOption;
    const tabbed = evt.detail.tabbed;

    const ele = this.shadowRoot.querySelector('.searchbox') as HTMLInputElement;
    updateInputElementWithCompletion(this.query, ele, option);

    this.query = '';
    this.completionOptions = [];

    if (tabbed) {
      this.fetchExpressions();
    } else if (this.input.indexOf('(') === -1) {
      this.addInputAsValue();
    }
  }

  private getNameInternal: (option: any) => string = (option: any) => {
    return this.getName(option);
  };

  private getOptionsDefault(response: WebResponse): any[] {
    return response.json['results'];
  }

  private isCompleteDefault(
    newestOptions: any[],
    response: WebResponse
  ): boolean {
    const json = response.json;
    return !json['more'] && !json['next'];
  }

  public handleRemoveSelection(selectionToRemove: any): void {
    this.removeValue(selectionToRemove);
    this.visibleOptions = [];
    this.fireEvent('change');
  }

  private createArbitraryOptionDefault(): any {
    return null;
  }

  public open(): void {
    this.requestUpdate('input');
  }

  public isOpen(): boolean {
    return this.visibleOptions.length > 0;
  }

  public setOptions(options: any[]): void {
    this.staticOptions = options;
  }

  private setVisibleOptions(options: any[]) {
    // if we have an exclusion filter apply it
    options = options.filter(option => {
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
        options = options.filter((option: any) => this.isMatch(option, q));
      }

      const arbitraryOption: any = this.createArbitraryOption(
        this.input,
        options
      );

      if (arbitraryOption) {
        // set our arbitrary flag so we never have more than one
        arbitraryOption.arbitrary = true;

        // make sure our id is not already present
        const exists = options.find(
          (option: any) =>
            this.getValue(option) === this.getValue(arbitraryOption)
        );

        if (!exists) {
          if (options.length > 0) {
            if (options[0].arbitrary) {
              options[0] = arbitraryOption;
            } else {
              options.unshift(arbitraryOption);
            }
          } else {
            options.unshift(arbitraryOption);
          }
        }
      }
    }

    // filter out any options already selected by id
    // TODO: should maybe be doing a deep equals here with option to optimize
    if (this.values.length > 0) {
      if (this.multi) {
        options = options.filter(
          option =>
            !this.values.find(
              selected => this.getValue(selected) === this.getValue(option)
            )
        );
      } else {
        // if no search, single select should set our cursor to the selected item
        if (!this.input) {
          this.cursorIndex = options.findIndex(
            option => this.getValue(option) === this.getValue(this.values[0])
          );
        } else {
          this.cursorIndex = 0;
        }
        this.requestUpdate('cursorIndex');
      }
    }

    // finally sort
    if (this.sortFunction) {
      options.sort(this.sortFunction);
    }

    this.visibleOptions = options;
  }

  public fetchExpressions() {
    const store: Store = document.querySelector('temba-store');
    if (this.expressions && store) {
      const ele = this.shadowRoot.querySelector(
        '.searchbox'
      ) as HTMLInputElement;

      const result = executeCompletionQuery(
        ele,
        store,
        this.expressions === 'session'
      );
      this.query = result.query;
      this.completionOptions = result.options;
      this.visibleOptions = [];
      this.anchorPosition = result.anchorPosition;
      return;
    }
  }

  public fetchOptions(query: string, page = 0) {
    this.completionOptions = [];

    if (!this.fetching) {
      this.fetching = true;

      // make sure we cancel any previous request
      // if (this.cancelToken) {
      // this.cancelToken.cancel();
      // }

      const options: any = [...this.staticOptions];
      const q = (query || '').trim().toLowerCase();

      if (this.tags && q) {
        if (
          !options.find(
            (option: any) =>
              this.getValue(option) && this.getValue(option).toLowerCase() === q
          )
        ) {
          options.splice(0, 0, { name: query, value: query });
        }
      }

      if (this.endpoint) {
        let url = this.endpoint;

        if (query && this.queryParam) {
          if (url.indexOf('?') > -1) {
            url += '&';
          } else {
            url += '?';
          }

          url += this.queryParam + '=' + encodeURIComponent(query);
        }

        if (page) {
          if (url.indexOf('?') > -1) {
            url += '&';
          } else {
            url += '?';
          }
          url += 'page=' + page;
        }

        if (this.next) {
          url = this.next;
        }

        if (this.cache && !this.tags && this.lruCache.has(url)) {
          const cache = this.lruCache.get(url);
          if (page === 0 && !this.next) {
            this.cursorIndex = 0;
            this.setVisibleOptions([...options, ...cache.options]);
          } else {
            this.setVisibleOptions([...this.visibleOptions, ...cache.options]);
          }

          this.complete = cache.complete;
          this.next = cache.next;
          this.fetching = false;
          return;
        }

        // if we are searchable, but doing it locally, fetch all the options
        if (this.searchable && !this.queryParam) {
          fetchResults(url).then((results: any) => {
            if (this.cache && !this.tags) {
              this.lruCache.set(url, {
                options: results,
                complete: true,
                next: null,
              });

              this.complete = true;
              this.next = null;
              this.setVisibleOptions([...options, ...results]);
              this.fetching = false;
            }
          });
        } else {
          this.httpComplete = getUrl(url)
            .then((response: WebResponse) => {
              const results = this.getOptions(response).filter(
                (option: any) => {
                  return this.isMatch(option, q);
                }
              );

              const json = response.json;
              if (json['next']) {
                this.next = json['next'];
              }

              if (page === 0 && !this.next) {
                this.cursorIndex = 0;
                this.setVisibleOptions([...options, ...results]);
                this.query = query;
                this.complete = this.isComplete(this.visibleOptions, response);
              } else {
                if (results.length > 0) {
                  this.setVisibleOptions([...this.visibleOptions, ...results]);
                }
                this.complete = this.isComplete(results, response);
              }

              if (this.cache && !this.tags) {
                this.lruCache.set(url, {
                  options: results,
                  complete: this.complete,
                  next: this.next,
                });
              }

              this.fetching = false;
              this.page = page;
            })
            .catch((reason: any) => {
              // cancelled
              this.fetching = false;
              console.error(reason);
            });
        }
      } else {
        this.fetching = false;
        this.setVisibleOptions(options);
      }
    }
  }

  private handleFocus(): void {
    if (!this.focused && this.visibleOptions.length === 0) {
      this.focused = true;
      if (this.searchOnFocus && !this.removingSelection) {
        this.requestUpdate('input');
      }
    }
  }

  private handleBlur() {
    this.focused = false;
    if (this.visibleOptions.length > 0) {
      this.input = '';
      this.next = null;
      this.complete = true;
      this.visibleOptions = [];
      this.cursorIndex = 0;
    }
  }

  private handleClick(): void {
    this.selectedIndex = -1;
    this.requestUpdate('input');
  }

  private addInputAsValue() {
    const ele = this.shadowRoot.querySelector('.searchbox') as HTMLInputElement;
    const expression = {
      name: ele.value,
      value: ele.value,
      expression: true,
    };

    if (this.multi) {
      if (
        !this.values.find(option => {
          return (
            option.expression &&
            option.value &&
            expression.value &&
            option.value.toLowerCase().trim() ==
              expression.value.toLowerCase().trim()
          );
        })
      ) {
        this.addValue(expression);
      }
    } else {
      this.setValue(expression);
    }
    this.input = '';
    if (!this.multi) {
      this.blur();
    }

    this.fireEvent('change');
  }

  private handleKeyDown(evt: KeyboardEvent) {
    // if we are completing an expression, select it
    if (
      evt.key === 'Enter' &&
      this.expressions &&
      this.completionOptions.length === 0 &&
      this.input.indexOf('@') > -1
    ) {
      this.addInputAsValue();
    }

    // see if we should open our options on a key event
    if (
      evt.key === 'Enter' ||
      evt.key === 'ArrowDown' ||
      (evt.key === 'n' && evt.ctrlKey)
    ) {
      if (
        this.visibleOptions.length === 0 &&
        this.completionOptions.length === 0
      ) {
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
      } else {
        this.popValue();
        this.selectedIndex = -1;
      }
      this.fireEvent('change');
    } else {
      this.selectedIndex = -1;
    }
  }

  public getStaticOptions() {
    return this.staticOptions;
  }

  private handleInput(evt: KeyboardEvent) {
    const ele = evt.currentTarget as HTMLInputElement;
    this.input = ele.value;
  }

  private handleCancel() {
    this.visibleOptions = [];
  }

  private handleCursorChanged(event: CustomEvent) {
    this.cursorIndex = event.detail.index;
  }

  private handleContainerClick(event: MouseEvent) {
    this.focused = true;

    if ((event.target as any).tagName !== 'INPUT') {
      const input = this.shadowRoot.querySelector('input');
      if (input) {
        input.click();
        input.focus();
        return;
      }

      if (this.visibleOptions.length > 0) {
        this.visibleOptions = [];
        event.preventDefault();
        event.stopPropagation();
      } else {
        this.requestUpdate('input');
      }
    }
  }

  public getEventHandlers(): EventHandler[] {
    return [
      { event: CustomEventType.Canceled, method: this.handleCancel },
      {
        event: CustomEventType.CursorChanged,
        method: this.handleCursorChanged,
      },
      { event: 'blur', method: this.handleBlur },
      { event: 'focus', method: this.handleFocus },
    ];
  }

  public firstUpdated(changedProperties: any) {
    super.firstUpdated(changedProperties);

    this.anchorElement = this.shadowRoot.querySelector('.select-container');
    this.anchorExpressions = this.shadowRoot.querySelector('#anchor');

    // wait until children are created before adding our static options
    window.setTimeout(() => {
      for (const child of this.children) {
        if (child.tagName === 'TEMBA-OPTION') {
          const option: any = {};
          for (const attribute of child.attributes) {
            option[attribute.name] = attribute.value;
          }
          this.staticOptions.push(option);

          if (
            child.getAttribute('selected') !== null ||
            this.getValue(option) == this.value
          ) {
            if (this.getAttribute('multi') !== null) {
              this.addValue(option);
            } else {
              this.setValue(option);
            }
          }
        }
      }

      if (this.values.length === 0 && !this.placeholder) {
        if (this.staticOptions.length == 0 && this.endpoint) {
          // see if we need to auto select the first item but need to fetch it
          fetchResults(this.endpoint).then((results: any) => {
            if (results.length > 0) {
              this.setValue(results[0]);
              this.fireEvent('change');
            }
          });
        } else {
          if (this.getAttribute('multi') !== null) {
            this.addValue(this.staticOptions[0]);
          } else {
            this.setValue(this.staticOptions[0]);
          }
          this.fireEvent('change');
        }
      }

      if (this.searchable && this.staticOptions.length === 0) {
        this.quietMillis = 200;
      }
    }, 0);
  }

  private handleArrowClick(event: MouseEvent): void {
    if (this.visibleOptions.length > 0) {
      this.visibleOptions = [];
      event.preventDefault();
      event.stopPropagation();
    }
  }

  private renderSelectedItemDefault(option: any): TemplateResult {
    return html`
      <div class="option-name" style="display:flex">
        ${option.icon
          ? html`<temba-icon
              name="${option.icon}"
              style="margin-right:0.5em;"
            ></temba-icon>`
          : null}<span>${this.getName(option)}</span>
      </div>
    `;
  }

  public serializeValue(value: any): string {
    // static options just use their value
    if (!this.jsonValue && (this.staticOptions.length > 0 || this.tags)) {
      return value.value;
    }

    return super.serializeValue(value);
  }

  public setSelection(value: string): void {
    for (const option of this.staticOptions) {
      if (option.value === value) {
        if (this.values.length === 0 || this.values[0].value !== '' + value) {
          this.setValue(option);
          this.fireEvent('change');
        }
        return;
      }
    }
  }

  private handleClear(evt: MouseEvent): void {
    evt.preventDefault();
    evt.stopPropagation();
    this.setValues([]);
    this.fireEvent('change');
  }

  public render(): TemplateResult {
    const placeholder = this.values.length === 0 ? this.placeholder : '';
    const placeholderDiv = html`
      <div class="placeholder">${placeholder}</div>
    `;

    const clear =
      this.clearable && this.values.length > 0 && !this.multi
        ? html`<temba-icon
            name="x"
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
      disabled: this.disabled,
    });

    const anchorStyles = this.anchorPosition
      ? {
          top: '0px',
          left: `${this.anchorPosition.left - 10}px`,
        }
      : {};

    const input = this.searchable
      ? html`
          <div class="input-wrapper">
            <input
              class="searchbox"
              @input=${this.handleInput}
              @keydown=${this.handleKeyDown}
              @click=${this.handleClick}
              type="text"
              placeholder=${placeholder}
              .value=${this.input}
            />
            <div id="anchor" style=${styleMap(anchorStyles)}></div>
          </div>
        `
      : placeholderDiv;

    return html`
      <temba-field
        name=${this.name}
        .label=${this.label}
        .helpText=${this.helpText}
        .errors=${this.errors}
        .widgetOnly=${this.widgetOnly}
        .hideErrors=${this.hideErrors}
        ?disabled=${this.disabled}
      >
  
      
        <div
          tabindex="0"
          class="select-container ${classes}"
          @click=${this.handleContainerClick}
        >          
          <div class="left-side">
            <div class="selected">
              ${!this.multi ? input : null}
              ${this.values.map(
                (selected: any, index: number) => html`
                  <div
                    class="selected-item ${index === this.selectedIndex
                      ? 'focused'
                      : ''}"
                  >
                    ${this.multi
                      ? html`
                          <div
                            class="remove-item"
                            style="margin-top:1px"
                            @mousedown=${() => {
                              this.removingSelection = true;
                            }}
                            @mouseup=${() => {
                              this.removingSelection = false;
                            }}
                            @click=${(evt: MouseEvent) => {
                              evt.preventDefault();
                              evt.stopPropagation();
                              this.handleRemoveSelection(selected);
                            }}
                          >
                            <temba-icon name="x" size="1" />
                          </div>
                        `
                      : null}
                    ${this.renderSelectedItem(selected)}
                  </div>
                `
              )}
              ${this.multi ? input : null}
            </div>
          </div>

          ${clear}

          ${
            !this.tags
              ? html`<div
                  class="right-side"
                  style="display:block;margin-right:5px"
                  @click=${this.handleArrowClick}
                >
                  <temba-icon
                    size="1.5"
                    name="chevron-down"
                    class="${this.visibleOptions.length > 0 ? 'open' : ''}"
                  />
                </div>`
              : null
          }
          </div>
          
        </div>
        <div class="info-text ${!this.infoText ? 'hide' : ''} ${
      this.focused ? 'focused' : ''
    }">${this.infoText}</div>
    
    <temba-options
    @temba-selection=${this.handleOptionSelection}
    .cursorIndex=${this.cursorIndex}
    .renderOptionDetail=${this.renderOptionDetail}
    .renderOptionName=${this.renderOptionName}
    .renderOption=${this.renderOption}
    .anchorTo=${this.anchorElement}
    .options=${this.visibleOptions}
    .spaceSelect=${this.spaceSelect}
    .nameKey=${this.nameKey}
    .getName=${this.getNameInternal}
    ?visible=${this.visibleOptions.length > 0}
  ></temba-options>

    <temba-options
    @temba-selection=${this.handleExpressionSelection}
    @temba-canceled=${() => {}}
    .anchorTo=${this.anchorExpressions}
    .options=${this.completionOptions}
    .renderOption=${renderCompletionOption}
    ?visible=${this.completionOptions.length > 0}
    >
      ${
        this.currentFunction
          ? html`
              <div class="current-fn">
                ${renderCompletionOption(this.currentFunction, true)}
              </div>
            `
          : null
      }
      <div class="footer">Tab to complete, enter to select</div>
    </temba-options>



        </temba-field>
    
    `;
  }
}
