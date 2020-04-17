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
        --temba-select-selected-font-size: 12px;
      }

      :host:focus {
        outline: none;
      }

      input::placeholder {
        color: var(--color-placeholder);
        font-weight: 200;
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

      .left {
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

      .selected-item .name {
        padding: 0px;
        font-size: var(--temba-select-selected-font-size);
        align-self: center;
      }

      .multi .selected-item .name {
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
        padding: 0;
        // padding: 5px 4px;
        font-size: 13px;
        width: 0;
        cursor: pointer;
        background: none;
        resize: none;
        box-shadow: none;
        margin: none;
        border: none;
        visibility: visible;
        // padding: 9px;
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
        box-shadow: none;
        margin: none;
        flex-grow: 1;
        border: none;
        caret-color: inherit;
      }

      .placeholder {
        font-size: var(--temba-select-selected-font-size);
        color: var(--color-placeholder);
        display: none;
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
  options: any[] = [];

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

  @property({ attribute: false })
  selectedIndex: number = -1;

  @property({ type: Number })
  cursorIndex: number;

  @property({ attribute: false })
  anchorElement: HTMLElement;

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

  private lastQuery: number;
  private cancelToken: CancelTokenSource;
  private complete: boolean;
  private page: number;
  private query: string;

  private lruCache = flru(20);
  private staticOptions: StaticOption[] = [];

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
        this.options.length > 0 &&
        this.query &&
        !this.complete &&
        this.cursorIndex > this.options.length - LOOK_AHEAD
      ) {
        this.fetchOptions(this.query, this.page + 1);
      }
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

    this.options = [];
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
    this.options = [];
    this.fireEvent("change");
  }

  private createArbitraryOptionDefault(input: string): any {
    return null;
  }

  private setOptions(options: any[]) {
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
          this.options = options.filter(
            (option) =>
              !this.values.find((selected) => getId(selected) === getId(option))
          );
          return;
        } else {
          // if no search, single select should set our cursor to the selected item
          this.options = options;

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

    this.options = options;
  }

  public fetchOptions(query: string, page: number = 0) {
    const cacheKey = `${query}_$page`;
    if (this.cache && this.lruCache.has(cacheKey)) {
      const { options, complete } = this.lruCache.get(cacheKey);
      this.setOptions(options);
      this.complete = complete;
      this.query = query;
      return;
    }

    if (!this.fetching) {
      // make sure we cancel any previous request
      if (this.cancelToken) {
        this.cancelToken.cancel();
      }

      if (this.staticOptions.length > 0) {
        this.setOptions(
          this.staticOptions.filter(
            (option: StaticOption) =>
              option.name.toLowerCase().indexOf(query.toLowerCase()) > -1
          )
        );
      }

      if (this.endpoint) {
        const cacheKey = `${query}_$page`;

        let url =
          this.endpoint +
          "&" +
          this.queryParam +
          "=" +
          encodeURIComponent(query);
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
              this.setOptions(this.getOptions(response));
              this.query = query;
              this.complete = this.isComplete(this.options, response);
            } else {
              const newResults = this.getOptions(response);
              if (newResults.length > 0) {
                this.setOptions([...this.options, ...newResults]);
              }
              this.complete = this.isComplete(newResults, response);
            }

            if (this.cache) {
              this.lruCache.set(cacheKey, {
                options: this.options,
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
    if (this.options.length > 0) {
      this.options = [];
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
      if (this.options.length === 0) {
        this.requestUpdate("input");
        return;
      }
    }

    // focus our last item on delete
    if (this.multi && evt.key === "Backspace" && !this.input) {
      if (this.options.length > 0) {
        this.options = [];
        return;
      }

      if (this.selectedIndex === -1) {
        this.selectedIndex = this.values.length - 1;
        this.options = [];
      } else {
        this.popValue();
        this.selectedIndex = -1;
      }
    } else {
      this.selectedIndex = -1;
    }
  }

  private handleKeyUp(evt: KeyboardEvent) {
    const ele = evt.currentTarget as HTMLInputElement;
    this.input = ele.value;
  }

  private handleCancel() {
    this.options = [];
  }

  private handleCursorChanged(event: CustomEvent) {
    this.cursorIndex = event.detail.index;
  }

  private handleContainerClick(event: MouseEvent) {
    if ((event.target as any).tagName !== "INPUT") {
      const input = this.shadowRoot.querySelector("input");
      if (input) {
        input.click();
        input.focus();
        return;
      }

      if (this.options.length > 0) {
        this.options = [];
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
    if (this.options.length > 0) {
      this.options = [];
      event.preventDefault();
      event.stopPropagation();
    }
  }

  private renderSelectedItemDefault(option: any): TemplateResult {
    return html` <div class="name">${option.name}</div> `;
  }

  public serializeValue(value: any): string {
    // static options just use their value
    if (this.staticOptions.length > 0) {
      return value.value;
    }
    return super.serializeValue(value);
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
      options: this.options.length > 0,
      focused: this.focused,
      "search-input": this.input.length > 0,
      "no-search-input": this.input.length === 0,
    });

    const input = this.searchable
      ? html`
          <input
            style=""
            @keyup=${this.handleKeyUp}
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
          <div class="left">
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
                              style="margin-bottom:-2px; fill: var(--color-widget-border)"
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

          <div class="right" @click=${this.handleArrowClick}>
            <fa-icon
              class="fa chevron-down ${this.options.length > 0
                ? "open"
                : ""} arrow-icon"
              size="14px"
              style="fill: var(--arrow-icon-color)"
              path-prefix="/sitestatic"
            />
          </div>
        </div>
      </temba-field>

      <temba-options
        .cursorIndex=${this.cursorIndex}
        .renderOptionDetail=${this.renderOptionDetail}
        .renderOptionName=${this.renderOptionName}
        .renderOption=${this.renderOption}
        .anchorTo=${this.anchorElement}
        .options=${this.options}
        ?visible=${this.options.length > 0}
      ></temba-options>
    `;
  }
}
