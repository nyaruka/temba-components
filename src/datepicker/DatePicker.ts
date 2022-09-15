import { TemplateResult, html, css } from 'lit';
import { property } from 'lit/decorators';
import { FormElement } from '../FormElement';
import { getClasses } from '../utils';
import { DateTime } from 'luxon';

export default class DatePicker extends FormElement {
  static get styles() {
    return css`
      :host {
        display: block;
      }

      .container {
        border-radius: var(--curvature);
        border: 1px solid var(--color-widget-border);
        display: flex;
      }

      .input-wrapper {
        padding: var(--temba-textinput-padding);
        flex-grow: 1;
      }

      .tz {
        margin-left: 0.5em;
        font-size: 0.8em;
        flex-direction: column;
        align-self: stretch;
        background: #efefef;
        color: #999;
        display: flex;
        align-items: center;
        flex-direction: row;
        border-top-right-radius: var(--curvature);
        border-bottom-right-radius: var(--curvature);
        padding: 0em 1em;
        font-weight: 400;
        cursor: pointer;
      }

      .container:focus-within {
        border-color: var(--color-focus);
        background: var(--color-widget-bg-focused);
        box-shadow: var(--widget-box-shadow-focused);
      }

      input {
        color: var(--color-widget-text);
        border: 0px;
        font-family: var(--font-family);
        font-weight: 300;
        outline: none;
        width: 100%;
      }

      input.unset {
        color: #ddd;
      }

      input.unset:focus {
        color: var(--color-widget-text);
      }

      input:focus {
        outline: none;
      }

      ::-webkit-calendar-picker-indicator {
        background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="15" viewBox="0 0 24 24"><path fill="%23bbbbbb" d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/></svg>');
        cursor: pointer;
        margin: 0;
        padding: 0;
      }

      ::-webkit-calendar-picker-indicator:hover {
        background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="15" viewBox="0 0 24 24"><path fill="%23777777" d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/></svg>');
        cursor: pointer;
        margin: 0;
        padding: 0;
      }
    `;
  }

  @property({ type: String })
  timezone = '';

  @property({ type: Object })
  datetime = null;

  /** we just return the value since it should be a string */
  public serializeValue(value: any): string {
    return value;
  }

  public constructor() {
    super();

    // default to the local browser zone
    this.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  public updated(changed: Map<string, any>): void {
    super.updated(changed);
    if (changed.has('value')) {
      if (this.value) {
        if (!this.datetime) {
          let datetime = DateTime.fromSQL(this.value).setZone(this.timezone);
          // if we can't read it as a sql stamp, try iso
          if (datetime.invalid) {
            datetime = DateTime.fromISO(this.value).setZone(this.timezone);
          }

          this.datetime = datetime;
        } else {
          this.datetime = DateTime.fromISO(this.value, { zone: this.timezone });
        }
        this.setValue(this.datetime.toUTC().toISO());
      }
    }
  }

  public handleChange(event) {
    this.value = event.target.value;
    event.preventDefault();
    event.stopPropagation();
  }

  public handleBlur() {
    // we fire a change event on blur
    this.fireEvent('change');
  }

  public handleZoneClicked() {
    this.shadowRoot.querySelector('input').focus();
  }

  public render(): TemplateResult {
    const classes = getClasses({ unset: !this.value });

    return html`
      <temba-field
        name=${this.name}
        .label="${this.label}"
        .helpText="${this.helpText}"
        .errors=${this.errors}
        .widgetOnly=${this.widgetOnly}
        .hideLabel=${this.hideLabel}
        .disabled=${this.disabled}
      >
        <div class="container">
          <div class="input-wrapper">
            <input
              class=${classes}
              name=${this.label}
              value=${this.datetime
                ? this.datetime.toFormat("yyyy-LL-dd'T'T")
                : null}
              type="datetime-local"
              @change=${this.handleChange}
              @blur=${this.handleBlur}
            />
          </div>
          <div class="tz" @click=${this.handleZoneClicked}>
            ${this.timezone}
          </div>
        </div>
      </temba-field>
    `;
  }
}
