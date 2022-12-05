import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators';
import { RapidElement } from '../RapidElement';
import { Store } from '../store/Store';
import { DateTime } from 'luxon';

export const Display = {
  date: DateTime.DATE_SHORT,
  datetime: DateTime.DATETIME_SHORT,
  duration: 'duration',
};

export class TembaDate extends RapidElement {
  static get styles() {
    return css`
      .date {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
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
    if (changedProperties.has('value')) {
      this.datetime = DateTime.fromISO(this.value);
      this.store = document.querySelector('temba-store');
    }
  }

  public connectedCallback(): void {
    super.connectedCallback();
  }

  public render(): TemplateResult {
    if (this.datetime) {
      if (this.display === Display.duration) {
        return html`<div class="date">
          ${this.store.getShortDuration(this.datetime)}
        </div>`;
      } else {
        return html`
          <div class="date">
            ${this.datetime.toLocaleString(Display[this.display])}
          </div>
        `;
      }
    }
    return null;
  }
}
