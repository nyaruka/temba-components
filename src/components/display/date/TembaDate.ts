import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { RapidElement } from '../../../components/base/RapidElement';
import { Store } from '../../../shared/store/Store';
import { DateTime } from 'luxon';

export const Display = {
  date: DateTime.DATE_SHORT,
  datetime: DateTime.DATETIME_SHORT,
  time: DateTime.TIME_SIMPLE,
  timedate: 'timedate',
  duration: 'duration',
  relative: 'relative',
  countdown: 'countdown',
  day: 'LLL d'
};

export class TembaDate extends RapidElement {
  static get styles() {
    return css`
      .date {
        display: inline;
      }
    `;
  }

  @property({ type: String })
  value: string;

  @property({ type: String })
  display = 'date';

  @property({ type: Object, attribute: false })
  datetime: DateTime;

  store: Store;

  protected firstUpdated(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.firstUpdated(changedProperties);
    this.store = document.querySelector('temba-store');
  }

  protected updated(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changedProperties);
    if (changedProperties.has('value')) {
      this.datetime = DateTime.fromISO(this.value);
    }
  }

  public connectedCallback(): void {
    super.connectedCallback();
  }

  public render(): TemplateResult {
    if (this.datetime && this.store) {
      this.datetime.setLocale(this.store.getLocale());

      let formatted = '';
      if (this.display === Display.timedate) {
        const hours = Math.abs(
          this.datetime.diffNow().milliseconds / 1000 / 60 / 60
        );

        const day = this.datetime.get('day');
        if (hours < 24 && day == DateTime.now().get('day')) {
          formatted = this.datetime.toLocaleString(Display.time);
        } else if (hours < 24 * 365) {
          formatted = this.datetime.toFormat(Display.day);
        } else {
          formatted = this.datetime.toLocaleString(Display.date);
        }
      } else if (this.display === Display.relative) {
        const minutes = Math.abs(
          this.datetime.diffNow().milliseconds / 1000 / 60
        );
        if (minutes < 1) {
          return html`<span
            class="date"
            title="${this.datetime.toLocaleString(Display.datetime)}"
            >just now</span
          >`;
        }

        formatted = this.store.getShortDuration(this.datetime);
      } else if (this.display === Display.duration) {
        const minutes = Math.abs(
          this.datetime.diffNow().milliseconds / 1000 / 60
        );
        if (minutes < 1) {
          return html`<span
            class="date"
            title="${this.datetime.toLocaleString(Display.datetime)}"
            >just now</span
          >`;
        }
        formatted = this.store.getShortDuration(this.datetime);
      } else if (this.display === Display.countdown) {
        formatted = this.store.getCountdown(this.datetime);
      } else if (this.display === Display.day) {
        formatted = this.datetime.toLocaleString(Display.day);
      } else {
        formatted = this.datetime.toLocaleString(Display[this.display]);
      }

      return html`<span
        class="date"
        title="${this.datetime.toLocaleString(Display.datetime)}"
        >${formatted}</span
      >`;
    }
  }
}
