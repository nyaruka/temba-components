import { TemplateResult, html, css } from 'lit';
import { property } from 'lit/decorators';
import { FormElement } from '../FormElement';
import { getClasses } from '../utils';
import { DateTime } from 'luxon';

export default class DatePicker extends FormElement {
  static get styles() {
    return css`
      input {
        color: var(--color-widget-text);
        padding: var(--temba-textinput-padding);
        border-radius: var(--curvature);
        border: 1px solid var(--color-widget-border);
        font-family: var(--font-family);
        font-weight: 300;
        outline: none;
      }

      input.unset {
        color: #ddd;
      }

      input.unset:focus {
        color: var(--color-widget-text);
      }

      input:focus {
        border-color: var(--color-focus);
        background: var(--color-widget-bg-focused);
        box-shadow: var(--widget-box-shadow-focused);
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
          this.datetime = DateTime.fromISO(this.value).setZone(this.timezone);
        } else {
          this.datetime = DateTime.fromISO(this.value, { zone: this.timezone });
        }
        this.value = this.datetime.toUTC().toISO();
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

  public render(): TemplateResult {
    const classes = getClasses({ unset: !this.value });

    return html`
      <input
        class=${classes}
        name=${this.label}
        value=${this.datetime ? this.datetime.toFormat("yyyy-LL-dd'T'T") : null}
        type="datetime-local"
        @change=${this.handleChange}
        @blur=${this.handleBlur}
      />
    `;
  }
}
