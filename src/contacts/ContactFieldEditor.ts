import { css, html, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { FormElement } from 'FormElement';
import { CustomEventType } from 'interfaces';
import { RapidElement } from 'RapidElement';
import { InputType, TextInput } from 'textinput/TextInput';
import { Icon } from 'vectoricon';
import { getClasses, WebResponse } from 'utils';
import { Select } from 'select/Select';

enum Status {
  Success = 'success',
  Failure = 'failure',
  Saving = 'saving',
  Ready = 'ready'
}

export class ContactFieldEditor extends RapidElement {
  @property({ type: String })
  key: string;

  @property({ type: String })
  value: string;

  @property({ type: String })
  name: string;

  @property({ type: String })
  type: string;

  @property({ type: String })
  timezone: string;

  @property({ type: String })
  icon = navigator.clipboard ? Icon.copy : '';

  @property({ type: String })
  iconClass = '';

  @property({ type: String })
  status: Status = Status.Ready;

  @property({ type: Boolean })
  disabled = false;

  @property({ type: Boolean })
  dirty = false;

  static get styles() {
    return css`
      :host {
        --transition-speed: 0ms;
        margin-bottom: 1em;
        display: block;
      }

      .wrapper {
        --disabled-opacity: 1;
        position: relative;
        --color-widget-bg: transparent;
        --color-widget-bg-focused: #fff;
        --widget-box-shadow: none;
        padding-bottom: 0.6em;
        border-bottom: 1px solid #ececec;
      }

      .wrapper.disabled {
        --color-widget-border: transparent;
      }

      .wrapper.mutable:hover {
      }

      .wrapper.mutable {
        --color-widget-border: rgb(235, 235, 235);
        --color-widget-bg: transparent;
        --input-cursor: pointer;

        border-bottom: none;
        margin-bottom: 0.5em;
        padding-bottom: 0em;
      }

      .mutable.success {
        --color-widget-border: rgba(var(--success-rgb), 0.6);
      }

      .mutable.failure {
        --color-widget-border: rgba(var(--error-rgb), 0.3) !important;
      }

      .mutable .dirty {
        --color-widget-border: rgb(235, 235, 235);
      }

      .prefix {
        border-top-left-radius: var(--curvature-widget);
        border-bottom-left-radius: var(--curvature-widget);
        cursor: pointer !important;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: flex;
        position: absolute;
        margin-top: -0.6em;
        margin-left: 0.5em;
        pointer-events: none;
        background: #fff;
        border-radius: var(--curvature);
      }

      temba-select .prefix {
        margin-top: -1em;
      }

      .wrapper {
        margin-bottom: 0.5em;
      }

      .prefix .name,
      .label .name {
        padding: 0em 0.4em;
        color: rgba(100, 100, 100, 0.7);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 0.8em;
      }

      .disabled .name {
        margin-top: 1em;
        margin-left: 0.75em;
      }

      .disabled .value {
        margin-left: 0.9em;
        margin-top: 0.1em;
        min-height: 1.75em;
      }

      .postfix {
        display: flex;
        align-items: stretch;
        margin-left: 1em;
      }

      .popper {
        background: rgba(0, 0, 0, 0.03);
        border-top-right-radius: var(--curvature-widget);
        border-bottom-right-radius: var(--curvature-widget);
        --icon-color: #888;
        display: flex;
        cursor: default;
        transition: all var(--transition-speed) ease-in-out;
        align-items: stretch;
        margin: -1px;
      }

      temba-icon[name='calendar'] {
        --icon-color: rgba(0, 0, 0, 0.2);
      }

      temba-icon:hover {
        --icon-color: rgba(0, 0, 0, 0.5);
      }

      temba-icon {
        cursor: pointer;
        --icon-color: rgba(0, 0, 0, 0.3);
      }

      temba-textinput:focus .popper,
      temba-textinput:hover .popper {
        display: flex;
      }

      .disabled temba-textinput .postfix {
        display: none;
        padding: none;
      }

      .unset temba-textinput .popper .copy,
      .unset temba-textinput .popper .search {
        display: none;
      }

      .unset temba-textinput:focus .popper .copy,
      .unset temba-textinput:hover .popper .copy,
      .unset temba-textinput:focus .popper .save,
      .unset temba-textinput:hover .popper .save {
        display: none;
      }

      .popper temba-icon {
        padding: 0.5em 0em;
        padding-right: 1em;
      }

      .popper:first-child {
        padding: 0.5em 0em;
        padding-right: 0.5em;
        padding-left: 1em;
      }

      .popper:last-child {
        padding-right: 0em;
      }

      .copy.clicked temba-icon {
        transform: scale(1.2);
      }

      temba-icon {
        transition: all 200ms ease-in-out;
      }

      temba-datepicker {
        position: relative;
      }

      .save-state {
        display: flex;
        align-items: center;
      }

      .save-button {
        padding-right: 1em;
      }

      .dirty .copy,
      .dirty .search {
        display: none;
      }

      .saving .copy,
      .saving .search {
        display: none;
      }

      .success .copy,
      .success .search {
        display: none;
      }

      .failure .copy,
      .failure .search {
        display: none;
      }

      .popper.success {
        background: rgb(var(--success-rgb));
      }

      .popper.failure {
        background: rgb(var(--error-rgb));
      }

      .popper.success temba-icon,
      .popper.failure temba-icon {
        --icon-color: #fff !important;
      }

      .popper.dirty {
        background: rgba(0, 0, 0, 0.03);
      }

      temba-datepicker .popper {
        border-radius: 0px;
      }

      temba-datepicker .popper:first-child {
        padding: 0;
      }

      .dirty temba-datepicker .popper:first-child {
        padding-left: 1em;
      }

      .success temba-datepicker .popper:first-child {
        padding-left: 1em;
      }

      .failure temba-datepicker .popper:first-child {
        padding-left: 1em;
      }

      .saving temba-datepicker .popper:first-child {
        padding-left: 1em;
      }

      temba-datepicker .postfix {
        margin-left: 0;
      }

      temba-datepicker {
        --temba-textinput-padding: 0.8em 0.8em 0.4em 0.8em;
      }

      .saving temba-datepicker,
      .saving temba-textinput {
        pointer-events: none !important;
        cursor: default !important;
        opacity: 0.7;
      }

      temba-select {
        --color-widget-bg: white;
      }

      temba-option {
      }
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.handleInput = this.handleInput.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  public handleIconClick(evt: MouseEvent) {
    const ele = evt.target as HTMLDivElement;
    const icon = ele.getAttribute('icon-action');
    const input = this.shadowRoot.querySelector('temba-textinput') as TextInput;

    if (icon === 'copy') {
      if (navigator.clipboard) {
        this.iconClass = 'clicked';
        navigator.clipboard.writeText(input.getDisplayValue()).then(() => {
          window.setTimeout(() => {
            this.iconClass = '';
          }, 300);
        });
      }
    }

    if (icon === 'search') {
      this.fireCustomEvent(CustomEventType.ButtonClicked, {
        key: this.key,
        value: this.value
      });
    }

    evt.preventDefault();
    evt.stopPropagation();
  }

  public handleResponse(response: WebResponse) {
    if (response.status === 200) {
      this.value = response.json.fields[this.key];
      // this.status = Status.Success;
      // on success lets go back to ready state for now
      this.status = Status.Ready;
      this.dirty = false;
    } else {
      this.status = Status.Failure;
      this.dirty = false;
    }
  }

  public handleSelectChange(evt: CustomEvent) {
    const select = evt.currentTarget as Select<any>;
    let value = '';

    evt.preventDefault();
    evt.stopPropagation();

    if (select.values.length > 0) {
      value = select.values[0].path;
    }

    if (value !== this.value) {
      this.dirty = true;
      this.status = Status.Saving;
      this.value = value;
      this.fireEvent('change');
    }
  }

  public handleSubmit() {
    const input = this.shadowRoot.querySelector(
      'temba-textinput, temba-datepicker'
    ) as FormElement;

    if (input.value !== this.value) {
      this.dirty = true;
      this.status = Status.Saving;
      this.value = input.value;
      this.fireEvent('change');
    }
  }

  public handleChange(evt: Event) {
    evt.preventDefault();
    evt.stopPropagation();
  }

  public handleDateChange(evt: Event) {
    evt.preventDefault();
    evt.stopPropagation();
    this.dirty = true;
  }

  public handleInput(evt: KeyboardEvent) {
    const input = evt.currentTarget as TextInput;
    if (evt.key === 'Enter') {
      input.blur();
      this.handleSubmit();
    } else {
      if (input.value !== this.value) {
        this.dirty = true;
      }
    }
  }

  private getInputType(type: string): string {
    if (type === 'numeric') {
      return InputType.Number;
    }
    return InputType.Text;
  }

  private renderDateField(state: TemplateResult) {
    return html` <temba-datepicker
      timezone=${this.timezone}
      value="${this.value ? this.value : ''}"
      @change=${this.handleDateChange}
      ?disabled=${this.disabled}
      time
    >
      <div class="prefix" slot="prefix">
        <div class="name">${this.name}</div>
      </div>
      <div class="postfix" slot="postfix">
        <div class="popper ${this.status}  ${this.dirty ? 'dirty' : ''}">
          ${state}
        </div>
      </div>
    </temba-datepicker>`;
  }

  private renderTextField(state: TemplateResult) {
    return html`
      <temba-textinput
        class="${this.status} ${this.dirty ? 'dirty' : ''}"
        value="${this.value ? this.value : ''}"
        @keyup=${this.handleInput}
        @change=${this.handleChange}
        type=${this.getInputType(this.type)}
        ?disabled=${this.disabled}
      >
        <div class="prefix" slot="prefix">
          <div class="name">${this.name}</div>
        </div>

        <div class="postfix">
          <div
            class="popper ${this.iconClass} ${this.status}  ${this.dirty
              ? 'dirty'
              : ''}"
            @click=${this.handleIconClick}
          >
            ${state}
            <temba-icon
              class="search"
              icon-action="search"
              name="${Icon.search}"
              animateclick="pulse"
            ></temba-icon>
            <temba-icon
              class="copy"
              icon-action="copy"
              name="${this.icon}"
              animatechange="spin"
              animateclick="pulse"
            ></temba-icon>
          </div>
        </div>
      </temba-textinput>
    `;
  }

  private getOptions(response: WebResponse) {
    return response.json[0].children;
  }

  private renderSelectedLocation(option: any) {
    if (!option) {
      return null;
    }

    return html`
      <div
        class="selected-location"
        style="display:flex;margin-top:1em;margin-left:0.1em"
      >
        <span>${option['path']}</span>
      </div>
    `;
  }

  public renderLocationField(level: string = 'state') {
    return html`
      <temba-select
        endpoint="/api/internal/locations.json?level=${level}"
        nameKey="path"
        valueKey="path"
        @change=${this.handleSelectChange}
        .resnderSelectedItem=${this.renderSelectedLocation}
        placeholder="Select a ${level}"
        queryParam="query"
        searchable
        clearable
        inpsutStyle=${JSON.stringify({ 'margin-top': '1.1em !important;' })}
        values=${this.value
          ? JSON.stringify([{ path: this.value, osm_id: this.value }])
          : '[]'}
      >
        <div class="prefix" slot="prefix">
          <div class="name">${this.name}</div>
        </div>
      </temba-select>
    `;
  }

  public render(): TemplateResult {
    if (this.disabled) {
      return html`<div
        class=${this.status +
        ' ' +
        getClasses({
          wrapper: true,
          set: !!this.value,
          unset: !this.value,
          disabled: this.disabled,
          mutable: !this.disabled,
          dirty: this.dirty
        })}
      >
        <div class="label"><div class="name">${this.name}</div></div>
        <div class="value">
          ${this.type === 'datetime'
            ? this.value
              ? html`<temba-date
                  value=${this.value}
                  display="datetime"
                ></temba-date>`
              : null
            : this.value}
        </div>
      </div>`;
    }

    const state = html`<div class="save-state">
      ${this.dirty
        ? html`<temba-button
            class="save-button"
            name="Save"
            small
            @click=${this.handleSubmit}
          ></temba-button>`
        : html` ${this.status === Status.Saving
            ? html`<temba-icon
                spin
                name="${Icon.progress_spinner}"
              ></temba-icon>`
            : null}
          ${this.status === Status.Success && !this.dirty
            ? html`<temba-icon name="${Icon.success}"></temba-icon>`
            : null}
          ${this.status === Status.Failure
            ? html`<temba-tip text="Failed to save changes, try again later."
                ><temba-icon name="${Icon.alert_warning}"></temba-icon
              ></temba-tip>`
            : null}`}
    </div>`;

    return html`
      <div
        class=${this.status +
        ' ' +
        getClasses({
          wrapper: true,
          set: !!this.value,
          unset: !this.value,
          disabled: this.disabled,
          mutable: !this.disabled,
          dirty: this.dirty
        })}
      >
        ${this.type === 'datetime'
          ? this.renderDateField(state)
          : this.type === 'state' ||
            this.type === 'district' ||
            this.type === 'ward'
          ? this.renderLocationField(this.type)
          : this.renderTextField(state)}
      </div>
    `;
  }
}
