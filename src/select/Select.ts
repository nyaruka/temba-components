import {
  customElement,
  TemplateResult,
  html,
  css,
  property,
} from "lit-element";
import { getUrl, getClasses } from "../utils";
import axios, { AxiosResponse, CancelTokenSource, AxiosStatic } from "axios";
import "../options/Options";
import { EventHandler } from "../RapidElement";
import FormElement from "../FormElement";

import { getId } from "./helpers";

import flru from "flru";
import { CustomEventType } from "../interfaces";

const LOOK_AHEAD = 20;

interface StaticOption {
  name: string;
  value: string;
}

/* 12px, 13px, pad 6px */

@customElement("temba-select")
export default class Select extends FormElement {
  static get styles() {
    return css`
      :host {
        font-family: var(--font-family);
        transition: all ease-in-out 200ms;
        display: inline;
        line-height: normal;
        outline: none;

        --arrow-icon-color: var(--color-text-dark-secondary);

        --temba-select-selected-padding: 9px;
        --temba-select-selected-line-height: 16px;
        --temba-select-selected-font-size: 13px;
      }

      :host:focus {
        outline: none;
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

      .arrow-icon {
        transition: all linear 150ms;
        cursor: pointer;
        margin-right: 8px;
        margin-top: 1px;
      }

      .arrow-icon.open {
        --arrow-icon-color: var(--color-text-dark-secondary);
      }

      .rotated {
        transform: rotate(180deg);
      }

      .select-container {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        align-items: center;
        border: 1px solid var(--color-widget-border);
        transition: all ease-in-out 200ms;
        cursor: pointer;
        border-radius: var(--curvature-widget);
        background: var(--color-widget-bg);
        padding-top: 1px;
        box-shadow: 0 3px 20px 0 rgba(0, 0, 0, 0.04),
          0 1px 2px 0 rgba(0, 0, 0, 0.02);
      }

      .select-container:hover {
        --arrow-icon-color: #777;
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
        // display: none;
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
        height: inherit !important;
        margin: 0px !important;
        padding: 0px !important;
        box-shadow: none !important;
        font-family: var(--font-family);
      }

      input:focus {
        box-shadow: none !important;
      }

      .searchable.single.no-search-input input {
        flex-grow: inherit;
        min-width: 1px;
      }

      .searchable.single.search-input .selected .selected-item {
        display: none;
      }

      .empty input {
        width: 100%;
      }

      .searchable input {
        visibility: visible;
        cursor: pointer;
        background: none;
        color: var(--color-text);
        resize: none;
        box-shadow: none !important;
        margin: none;
        flex-grow: 1;
        border: none;
        caret-color: inherit;
      }

      .searchable input:focus {
        box-shadow: none !important;
      }

      .searchbox::placeholder {
        color: var(--color-placeholder);
        font-weight: 300;
      }

      .placeholder {
        font-size: var(--temba-select-selected-font-size);
        color: var(--color-placeholder);
        display: none;
        font-weight: 300;
        line-height: var(--temba-select-selected-line-height);
      }
    `;
  }

  @property({ type: Boolean })
  multi: boolean = false;

  @property({ type: Boolean })
  searchOnFocus: boolean = false;

  @property({ type: String })
  placeholder: string = "";

  @property()
  name: string = "";

  @property()
  endpoint: string;

  @property({ type: String })
  queryParam: string = "q";

  @property({ type: String })
  input: string = "";

  @property({ type: Array })
  visibleOptions: any[] = [];

  @property({ type: Number })
  quietMillis: number = 0;

  @property({ type: Boolean })
  fetching: boolean;

  @property({ type: Boolean })
  searchable: boolean = false;

  @property({ type: Boolean })
  cache: boolean = true;

  @property({ type: Boolean })
  focused: boolean = false;

  @property({ type: Boolean })
  disabled: boolean = false;

  @property({ attribute: false })
  selectedIndex: number = -1;

  @property({ type: Number })
  cursorIndex: number;

  @property({ attribute: false })
  anchorElement: HTMLElement;

  @property({ type: Boolean })
  tags: boolean = false;

  @property({ type: Boolean, attribute: "space_select" })
  spaceSelect: boolean;

  @property({ type: Boolean })
  jsonValue: boolean;

  @property({ attribute: false })
  renderOption: (option: any, selected: boolean) => TemplateResult;

  @property({ attribute: false })
  renderOptionName: (option: any, selected: boolean) => TemplateResult;

  @property({ attribute: false })
  renderOptionDetail: (option: any, selected: boolean) => TemplateResult = () =>
    html``;

  @property({ attribute: false })
  renderSelectedItem: (option: any) => TemplateResult = this
    .renderSelectedItemDefault;

  @property({ attribute: false })
  createArbitraryOption: (input: string) => any = this
    .createArbitraryOptionDefault;

  @property({ attribute: false })
  getOptions: (response: AxiosResponse) => any[] = this.getOptionsDefault;

  @property({ attribute: false })
  isComplete: (newestOptions: any[], response: AxiosResponse) => boolean = this
    .isCompleteDefault;

  @property({ type: Array, attribute: "options" })
  private staticOptions: StaticOption[] = [];

  private lastQuery: number;

  private cancelToken: CancelTokenSource;
  private complete: boolean;
  private page: number;
  private query: string;

  private lruCache = flru(20);

  public updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    if (
      changedProperties.has("input") &&
      !changedProperties.has("values") &&
      !changedProperties.has("options")
    ) {
      if (this.lastQuery) {
        window.clearTimeout(this.lastQuery);
      }

      this.lastQuery = window.setTimeout(() => {
        this.fetchOptions(this.input);
      }, this.quietMillis);
    }

    // if our cursor changed, lets make sure our scrollbox is showing it
    if (changedProperties.has("cursorIndex") && this.endpoint) {
      if (
        this.visibleOptions.length > 0 &&
        this.query &&
        !this.complete &&
        this.cursorIndex > this.visibleOptions.length - LOOK_AHEAD
      ) {
        this.fetchOptions(this.query, this.page + 1);
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

  public handleOptionSelection(event: CustomEvent) {
    const selected = event.detail.selected;

    if (this.multi) {
      this.addValue(selected);
    } else {
      this.setValue(selected);
    }

    if (!this.multi || !this.searchable) {
      this.blur();
    }

    this.visibleOptions = [];
    this.input = "";
    this.selectedIndex = -1;
    this.fireEvent("change");
  }

  private getOptionsDefault(response: AxiosResponse): any[] {
    return response.data["results"];
  }

  private isCompleteDefault(
    newestOptions: any[],
    response: AxiosResponse
  ): boolean {
    return !response.data["more"];
  }

  public handleRemoveSelection(selectionToRemove: any): void {
    this.removeValue(selectionToRemove);
    this.visibleOptions = [];
    this.fireEvent("change");
  }

  private createArbitraryOptionDefault(input: string): any {
    return null;
  }

  public open(): void {
    this.requestUpdate("input");
  }

  public setOptions(options: StaticOption[]): void {
    this.staticOptions = options;
  }

  private setVisibleOptions(options: any[]) {
    if (this.input) {
      const arbitraryOption: any = this.createArbitraryOption(this.input);
      if (arbitraryOption) {
        // set our arbitrary flag so we never have more than one
        arbitraryOption.arbitrary = true;

        // make sure our id is not already present
        const exists = options.find(
          (option: any) => option.id === arbitraryOption.id
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
      if (getId(this.values[0])) {
        if (this.multi) {
          this.visibleOptions = options.filter(
            (option) =>
              !this.values.find((selected) => getId(selected) === getId(option))
          );
          return;
        } else {
          // if no search, single select should set our cursor to the selected item
          this.visibleOptions = options;

          if (!this.input) {
            this.cursorIndex = options.findIndex(
              (option) => getId(option) === getId(this.values[0])
            );
          } else {
            this.cursorIndex = 0;
          }
          this.requestUpdate("cursorIndex");

          return;
        }
      }
    }

    this.visibleOptions = options;
  }

  public fetchOptions(query: string, page: number = 0) {
    const cacheKey = `${query}_$page`;
    if (this.cache && !this.tags && this.lruCache.has(cacheKey)) {
      const { options, complete } = this.lruCache.get(cacheKey);
      this.setVisibleOptions(options);
      this.complete = complete;
      this.query = query;
      return;
    }

    if (!this.fetching) {
      // make sure we cancel any previous request
      if (this.cancelToken) {
        this.cancelToken.cancel();
      }

      let options: any = [];
      const q = query.toLowerCase();

      if (this.staticOptions.length > 0) {
        options = this.staticOptions.filter(
          (option: StaticOption) => option.name.toLowerCase().indexOf(q) > -1
        );
      }

      if (this.tags && q) {
        if (
          !options.find(
            (option: any) => option.value && option.value.toLowerCase() === q
          )
        ) {
          options.splice(0, 0, { name: query, value: query });
        }
      }

      this.setVisibleOptions(options);

      if (this.endpoint) {
        const cacheKey = `${query}_$page`;

        let url = this.endpoint;
        if (url.indexOf("?") > -1) {
          url += "&";
        } else {
          url += "?";
        }

        url += this.queryParam + "=" + encodeURIComponent(query);
        if (page) {
          url += "&page=" + page;
        }

        const CancelToken = axios.CancelToken;
        this.cancelToken = CancelToken.source();

        this.fetching = true;

        getUrl(url, this.cancelToken.token)
          .then((response: AxiosResponse) => {
            if (page === 0) {
              this.cursorIndex = 0;
              this.setVisibleOptions(this.getOptions(response));
              this.query = query;
              this.complete = this.isComplete(this.visibleOptions, response);
            } else {
              const newResults = this.getOptions(response);
              if (newResults.length > 0) {
                this.setVisibleOptions([...this.visibleOptions, ...newResults]);
              }
              this.complete = this.isComplete(newResults, response);
            }

            if (this.cache && !this.tags) {
              this.lruCache.set(cacheKey, {
                options: this.visibleOptions,
                complete: this.complete,
              });
            }

            this.fetching = false;
            this.page = page;
          })
          .catch((reason: any) => {
            // cancelled
          });
      }
    }
  }

  private handleFocus(): void {
    if (!this.focused) {
      this.focused = true;
      if (this.searchOnFocus) {
        this.requestUpdate("input");
      }
    }
  }

  private handleBlur() {
    this.focused = false;
    if (this.visibleOptions.length > 0) {
      this.visibleOptions = [];
      this.input = "";
    }
  }

  private handleClick(): void {
    this.selectedIndex = -1;
    this.requestUpdate("input");
  }

  private handleKeyDown(evt: KeyboardEvent) {
    // see if we should open our options on a key event
    if (
      evt.key === "Enter" ||
      evt.key === "ArrowDown" ||
      (evt.key === "n" && evt.ctrlKey)
    ) {
      if (this.visibleOptions.length === 0) {
        this.requestUpdate("input");
        return;
      }
    }

    // focus our last item on delete
    if (this.multi && evt.key === "Backspace" && !this.input) {
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

  private handleKeyUp(evt: KeyboardEvent) {}

  private handleCancel() {
    this.visibleOptions = [];
  }

  private handleCursorChanged(event: CustomEvent) {
    this.cursorIndex = event.detail.index;
  }

  private handleContainerClick(event: MouseEvent) {
    if (this.disabled) {
      return;
    }

    if ((event.target as any).tagName !== "INPUT") {
      const input = this.shadowRoot.querySelector("input");
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
        this.requestUpdate("input");
      }
    }
  }

  public getEventHandlers(): EventHandler[] {
    return [
      { event: CustomEventType.Selection, method: this.handleOptionSelection },
      { event: CustomEventType.Canceled, method: this.handleCancel },
      {
        event: CustomEventType.CursorChanged,
        method: this.handleCursorChanged,
      },
      { event: "focusout", method: this.handleBlur },
      { event: "focusin", method: this.handleFocus },
    ];
  }

  public firstUpdated(changedProperties: any) {
    super.firstUpdated(changedProperties);

    this.anchorElement = this.shadowRoot.querySelector(".select-container");

    if (!this.hasAttribute("tabindex")) {
      this.setAttribute("tabindex", "0");
    }

    // wait until children are created before adding our static options
    window.setTimeout(() => {
      for (const child of this.children) {
        if (child.tagName === "TEMBA-OPTION") {
          const name = child.getAttribute("name");
          const value = child.getAttribute("value");
          const option = { name, value };
          this.staticOptions.push(option);

          if (
            child.getAttribute("selected") !== null ||
            (!this.placeholder && this.values.length === 0)
          ) {
            if (this.getAttribute("multi") !== null) {
              this.addValue(option);
            } else {
              this.setValue(option);
            }
          }
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
    return html` <div class="option-name">${option.name}</div> `;
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
        if (this.values.length === 0 || this.values[0].value !== "" + value) {
          this.setValue(option);
          this.fireEvent("change");
        }
        return;
      }
    }
  }

  public render(): TemplateResult {
    const placeholder = this.values.length === 0 ? this.placeholder : "";
    const placeholderDiv = html`
      <div class="placeholder">${placeholder}</div>
    `;

    const classes = getClasses({
      multi: this.multi,
      single: !this.multi,
      searchable: this.searchable,
      empty: this.values.length === 0,
      options: this.visibleOptions.length > 0,
      focused: this.focused,
      "search-input": this.input.length > 0,
      "no-search-input": this.input.length === 0,
    });

    const input = this.searchable
      ? html`
          <input
            class="searchbox"
            @input=${this.handleInput}
            @keydown=${this.handleKeyDown}
            @click=${this.handleClick}
            type="text"
            placeholder=${placeholder}
            .value=${this.input}
          />
        `
      : placeholderDiv;

    return html`
      <temba-field
        name=${this.name}
        .label=${this.label}
        .helpText=${this.helpText}
        .errors=${this.errors}
        .widgetOnly=${this.widgetOnly}
      >
        <div
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
                      ? "focused"
                      : ""}"
                  >
                    ${this.multi
                      ? html`
                          <div
                            class="remove-item"
                            @click=${(evt: MouseEvent) => {
                              evt.preventDefault();
                              evt.stopPropagation();
                              this.handleRemoveSelection(selected);
                            }}
                          >
                            <fa-icon
                              class="fas times"
                              size="12px"
                              style="margin-bottom:-2px; fill: var(--color-overlay-dark)"
                              }
                              path-prefix="/sitestatic"
                            />
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

          ${
            !this.tags
              ? html`<div class="right-side" @click=${this.handleArrowClick}>
                  <fa-icon
                    class="fa chevron-down ${this.visibleOptions.length > 0
                      ? "open"
                      : ""} arrow-icon"
                    size="14px"
                    style="fill: var(--arrow-icon-color)"
                    path-prefix="/sitestatic"
                  />
                </div>`
              : null
          }
          </div>
        </div>
      </temba-field>

      <temba-options
        .cursorIndex=${this.cursorIndex}
        .renderOptionDetail=${this.renderOptionDetail}
        .renderOptionName=${this.renderOptionName}
        .renderOption=${this.renderOption}
        .anchorTo=${this.anchorElement}
        .options=${this.visibleOptions}
        .spaceSelect=${this.spaceSelect}
        ?visible=${this.visibleOptions.length > 0}
      ></temba-options>
    `;
  }
}
