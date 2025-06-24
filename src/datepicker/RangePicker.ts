import { property } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { DateTime } from 'luxon';
import { html, css } from 'lit';
import { DatePicker } from './DatePicker';
import { CustomEventType } from '../interfaces';

export class RangePicker extends RapidElement {
  static styles = css`
    .range-container {
      display: flex;
      gap: 0.5em;
      align-items: center;
    }
    .date-display {
      cursor: pointer;
      padding: 0.2em 0.5em;
      margin: 0.6em 0;
      border-radius: 4px;
      border: 1px solid transparent;
      transition: border 0.2s;
    }

    .date-display:hover {
      border: 1px solid var(--color-widget-border, #bbb);
      background: var(--color-widget-hover, #f5f5f5);
    }

    input[type='date'] {
      font-size: 1em;
      padding: 0.2em 0.5em;
      border-radius: 4px;
      border: 1px solid #bbb;
    }
    .button-group {
      display: flex;
      margin-left: 0em;
    }
    .range-btn {
      background: #f5f5f5;
      border: 1px solid #bbb;
      border-radius: 0px;
      margin-left: -1px;
      padding: 0.2em 0.8em;
      cursor: pointer;
      font-size: 0.95em;
      transition: background 0.2s, border 0.2s;
    }

    .button-group .range-btn:first-child {
      border-radius: 4px 0 0 4px;
    }

    .button-group .range-btn:last-child {
      border-radius: 0 4px 4px 0;
    }

    .range-btn.selected,
    .range-btn:active {
      background: #e0eaff;
      border-color: #3399ff;
    }
  `;

  @property({ type: String, attribute: 'start' })
  startDate = '';

  @property({ type: String, attribute: 'end' })
  endDate = '';

  @property({ type: Boolean })
  editingStart = false;

  @property({ type: Boolean })
  editingEnd = false;

  @property({ type: String })
  selectedRange: 'W' | 'M' | 'Y' | 'ALL' | '' = '';

  @property({ type: String, attribute: 'min' })
  minDate = '2012-01-01';

  @property({ type: String, attribute: 'max' })
  maxDate = DateTime.now().toISODate();

  private handleStartClick() {
    this.editingStart = true;
  }

  private handleEndClick() {
    this.editingEnd = true;
  }

  private setRange(type: 'W' | 'M' | 'Y' | 'ALL') {
    const today = DateTime.now().toISODate();
    let start = '';
    if (type === 'W') {
      start = DateTime.now().minus({ days: 6 }).toISODate();
    } else if (type === 'M') {
      start = DateTime.now().minus({ months: 1 }).plus({ days: 1 }).toISODate();
    } else if (type === 'Y') {
      start = DateTime.now().minus({ years: 1 }).plus({ days: 1 }).toISODate();
    } else if (type === 'ALL') {
      start = '2012-01-01';
    }
    this.startDate = start;
    this.endDate = today;
    this.selectedRange = type;
    this.editingStart = false;
    this.editingEnd = false;

    this.fireCustomEvent(CustomEventType.DateRangeChanged, {
      start: this.startDate,
      end: this.endDate,
      range: this.selectedRange
    });
  }

  private setValidRange(type: 'start' | 'end', value: string) {
    // Enforce min/max
    let newValue = value;
    if (newValue < this.minDate) newValue = this.minDate;
    if (newValue > this.maxDate) newValue = this.maxDate;
    const start = DateTime.fromISO(
      type === 'start' ? newValue : this.startDate
    );
    const end = DateTime.fromISO(type === 'end' ? newValue : this.endDate);

    if (!start.isValid || !end.isValid) return;
    if (start > end) {
      if (type === 'start') {
        this.startDate = newValue;
        this.endDate = start.toISODate();
      } else {
        this.endDate = newValue;
        this.startDate = end.toISODate();
      }
    } else {
      if (type === 'start') this.startDate = newValue;
      else this.endDate = newValue;
    }

    this.fireCustomEvent(CustomEventType.DateRangeChanged, {
      start: this.startDate,
      end: this.endDate,
      range: this.selectedRange
    });
  }

  updated(changed: Map<string, any>) {
    super.updated(changed);

    if (
      (changed.has('startDate') && changed.has('endDate') && !this.startDate) ||
      !this.endDate
    ) {
      this.setRange('M');
    }

    if (changed.has('editingStart') && this.editingStart) {
      setTimeout(() => {
        const startPicker: DatePicker = this.shadowRoot?.querySelector(
          'temba-datepicker.start-picker'
        );

        if (startPicker) {
          startPicker.handleClicked();
        }
      }, 0);
    }

    if (changed.has('editingEnd') && this.editingEnd) {
      setTimeout(() => {
        const endPicker: DatePicker = this.shadowRoot?.querySelector(
          'temba-datepicker.end-picker'
        );
        if (endPicker) {
          endPicker.handleClicked();
        }
      }, 0);
    }
  }

  render() {
    return html`
      <div class="range-container">
        ${this.editingStart
          ? html`<temba-datepicker
              class="start-picker"
              .value=${this.startDate}
              .min=${this.minDate}
              .max=${this.maxDate}
              @change=${(e: Event) => {
                const value = (e.target as any).value;
                this.setValidRange('start', value);
                this.editingStart = false;
                this.selectedRange = '';
              }}
              @blur=${() => (this.editingStart = false)}
            ></temba-datepicker>`
          : html`<span class="date-display" @click=${this.handleStartClick}
              >${this.startDate || 'Start date'}</span
            >`}
        <span> - </span>
        ${this.editingEnd
          ? html`<temba-datepicker
              .value=${this.endDate}
              class="end-picker"
              .min=${this.minDate}
              .max=${this.maxDate}
              @change=${(e: Event) => {
                const value = (e.target as any).value;
                this.setValidRange('end', value);
                this.editingEnd = false;
                this.selectedRange = '';
              }}
              @blur=${() => (this.editingEnd = false)}
            ></temba-datepicker>`
          : html`<span class="date-display" @click=${this.handleEndClick}
              >${this.endDate || 'End date'}</span
            >`}
        <div class="button-group">
          <button
            class="range-btn ${this.selectedRange === 'W' ? 'selected' : ''}"
            @click=${() => this.setRange('W')}
          >
            W
          </button>
          <button
            class="range-btn ${this.selectedRange === 'M' ? 'selected' : ''}"
            @click=${() => this.setRange('M')}
          >
            M
          </button>
          <button
            class="range-btn ${this.selectedRange === 'Y' ? 'selected' : ''}"
            @click=${() => this.setRange('Y')}
          >
            Y
          </button>
          <button
            class="range-btn ${this.selectedRange === 'ALL' ? 'selected' : ''}"
            @click=${() => this.setRange('ALL')}
          >
            All
          </button>
        </div>
      </div>
    `;
  }
}

customElements.define('temba-range-picker', RangePicker);
