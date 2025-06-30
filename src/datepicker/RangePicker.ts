import { property } from 'lit/decorators.js';
import { RapidElement } from 'RapidElement';
import { DateTime } from 'luxon';
import { html, css } from 'lit';
import { DatePicker } from 'datepicker/DatePicker';
import { CustomEventType } from 'interfaces';

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

    .navigation-container {
      display: flex;
      align-items: center;
      gap: 0.25em;
    }

    .nav-arrow {
      background: #f5f5f5;
      border: 1px solid #bbb;

      border-radius: var(--curvature);
      padding: 0em 0em;
      cursor: pointer;
      font-size: 0.6em;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 23px;
      height: 23px;
      transition: background 0.2s, border 0.2s, opacity 0.2s;
    }

    .nav-arrow:hover:not(:disabled) {
      background: #e0eaff;
      border-color: #3399ff;
    }

    .nav-arrow:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: #f9f9f9;
    }

    .nav-arrow.hidden {
      visibility: hidden;
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
      start = this.minDate || '2012-01-01';
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

  private canNavigatePrevious(): boolean {
    if (this.selectedRange === 'ALL') return false;

    const currentStart = DateTime.fromISO(this.startDate);
    let previousStart: DateTime;

    if (this.selectedRange === 'W') {
      previousStart = currentStart.minus({ weeks: 1 });
    } else if (this.selectedRange === 'M') {
      previousStart = currentStart.minus({ months: 1 });
    } else if (this.selectedRange === 'Y') {
      previousStart = currentStart.minus({ years: 1 });
    } else if (this.selectedRange === '') {
      // Custom range - determine the interval and navigate by that amount
      const interval = this.getCustomRangeInterval();
      if (interval.type === 'days') {
        previousStart = currentStart.minus({ days: interval.amount });
      } else if (interval.type === 'months') {
        previousStart = currentStart.minus({ months: interval.amount });
      } else if (interval.type === 'years') {
        previousStart = currentStart.minus({ years: interval.amount });
      } else {
        return false;
      }
    } else {
      return false;
    }

    return previousStart.toISODate() >= this.minDate;
  }

  private canNavigateNext(): boolean {
    if (this.selectedRange === 'ALL') return false;

    const currentEnd = DateTime.fromISO(this.endDate);
    let nextEnd: DateTime;

    if (this.selectedRange === 'W') {
      nextEnd = currentEnd.plus({ weeks: 1 });
    } else if (this.selectedRange === 'M') {
      nextEnd = currentEnd.plus({ months: 1 });
    } else if (this.selectedRange === 'Y') {
      nextEnd = currentEnd.plus({ years: 1 });
    } else if (this.selectedRange === '') {
      // Custom range - determine the interval and navigate by that amount
      const interval = this.getCustomRangeInterval();
      if (interval.type === 'days') {
        nextEnd = currentEnd.plus({ days: interval.amount });
      } else if (interval.type === 'months') {
        nextEnd = currentEnd.plus({ months: interval.amount });
      } else if (interval.type === 'years') {
        nextEnd = currentEnd.plus({ years: interval.amount });
      } else {
        return false;
      }
    } else {
      return false;
    }

    return nextEnd.toISODate() <= this.maxDate;
  }

  private getCustomRangeInterval(): {
    type: 'days' | 'months' | 'years';
    amount: number;
  } {
    const start = DateTime.fromISO(this.startDate);
    const end = DateTime.fromISO(this.endDate);

    if (!start.isValid || !end.isValid) {
      return { type: 'days', amount: 1 };
    }

    // Check if it's a complete month (first day to last day of any month)
    const isLastDayOfMonth = end.day === end.daysInMonth;
    if (start.day === 1 && isLastDayOfMonth) {
      // Single complete month
      if (start.month === end.month && start.year === end.year) {
        return { type: 'months', amount: 1 };
      }

      // Multiple complete months - check if we span complete months only
      const startOfFirstMonth = start.startOf('month');
      const endOfLastMonth = end.endOf('month');
      const monthsDiff =
        endOfLastMonth.diff(startOfFirstMonth, 'months').months + 1;

      if (monthsDiff > 0 && Number.isInteger(monthsDiff)) {
        return { type: 'months', amount: Math.round(monthsDiff) };
      }
    }

    // Check if it's a full year
    if (
      start.month === 1 &&
      start.day === 1 &&
      end.month === 12 &&
      end.day === 31
    ) {
      // Single complete year
      if (start.year === end.year) {
        return { type: 'years', amount: 1 };
      }

      // Multiple complete years
      const yearsDiff = end.year - start.year + 1;
      if (yearsDiff > 0) {
        return { type: 'years', amount: yearsDiff };
      }
    }

    // Default to days for any other custom range
    const daysDiff = end.diff(start, 'days').days + 1; // +1 to include both start and end days
    return { type: 'days', amount: Math.max(1, Math.round(daysDiff)) };
  }

  private navigatePrevious() {
    if (!this.canNavigatePrevious()) return;

    const currentStart = DateTime.fromISO(this.startDate);
    const currentEnd = DateTime.fromISO(this.endDate);
    let newStart: DateTime;
    let newEnd: DateTime;

    if (this.selectedRange === 'W') {
      newStart = currentStart.minus({ weeks: 1 });
      newEnd = currentEnd.minus({ weeks: 1 });
    } else if (this.selectedRange === 'M') {
      // Check if current M range is a complete month, if so maintain month boundaries
      const interval = this.getCustomRangeInterval();
      if (interval.type === 'months') {
        newStart = currentStart.minus({ months: 1 }).startOf('month');
        newEnd = newStart
          .plus({ months: interval.amount })
          .minus({ days: 1 })
          .endOf('day');
      } else {
        newStart = currentStart.minus({ months: 1 });
        newEnd = currentEnd.minus({ months: 1 });
      }
    } else if (this.selectedRange === 'Y') {
      newStart = currentStart.minus({ years: 1 });
      newEnd = currentEnd.minus({ years: 1 });
    } else if (this.selectedRange === '') {
      // Custom range - determine the interval and navigate by that amount
      const interval = this.getCustomRangeInterval();
      if (interval.type === 'days') {
        newStart = currentStart.minus({ days: interval.amount });
        newEnd = currentEnd.minus({ days: interval.amount });
      } else if (interval.type === 'months') {
        // For month navigation, maintain complete month boundaries
        newStart = currentStart
          .minus({ months: interval.amount })
          .startOf('month');
        newEnd = newStart
          .plus({ months: interval.amount })
          .minus({ days: 1 })
          .endOf('day');
      } else if (interval.type === 'years') {
        newStart = currentStart.minus({ years: interval.amount });
        newEnd = currentEnd.minus({ years: interval.amount });
      } else {
        return;
      }
    } else {
      return;
    }

    // Enforce min/max bounds
    const minDateTime = DateTime.fromISO(this.minDate);
    const maxDateTime = DateTime.fromISO(this.maxDate);
    const startDate =
      newStart < minDateTime ? this.minDate : newStart.toISODate();
    const endDate = newEnd > maxDateTime ? this.maxDate : newEnd.toISODate();

    this.startDate = startDate;
    this.endDate = endDate;

    this.fireCustomEvent(CustomEventType.DateRangeChanged, {
      start: this.startDate,
      end: this.endDate,
      range: this.selectedRange
    });
  }

  private navigateNext() {
    if (!this.canNavigateNext()) return;

    const currentStart = DateTime.fromISO(this.startDate);
    const currentEnd = DateTime.fromISO(this.endDate);
    let newStart: DateTime;
    let newEnd: DateTime;

    if (this.selectedRange === 'W') {
      newStart = currentStart.plus({ weeks: 1 });
      newEnd = currentEnd.plus({ weeks: 1 });
    } else if (this.selectedRange === 'M') {
      // Check if current M range is a complete month, if so maintain month boundaries
      const interval = this.getCustomRangeInterval();
      if (interval.type === 'months') {
        newStart = currentStart.plus({ months: 1 }).startOf('month');
        newEnd = newStart
          .plus({ months: interval.amount })
          .minus({ days: 1 })
          .endOf('day');
      } else {
        newStart = currentStart.plus({ months: 1 });
        newEnd = currentEnd.plus({ months: 1 });
      }
    } else if (this.selectedRange === 'Y') {
      newStart = currentStart.plus({ years: 1 });
      newEnd = currentEnd.plus({ years: 1 });
    } else if (this.selectedRange === '') {
      // Custom range - determine the interval and navigate by that amount
      const interval = this.getCustomRangeInterval();
      if (interval.type === 'days') {
        newStart = currentStart.plus({ days: interval.amount });
        newEnd = currentEnd.plus({ days: interval.amount });
      } else if (interval.type === 'months') {
        // For month navigation, maintain complete month boundaries
        newStart = currentStart
          .plus({ months: interval.amount })
          .startOf('month');
        newEnd = newStart
          .plus({ months: interval.amount })
          .minus({ days: 1 })
          .endOf('day');
      } else if (interval.type === 'years') {
        newStart = currentStart.plus({ years: interval.amount });
        newEnd = currentEnd.plus({ years: interval.amount });
      } else {
        return;
      }
    } else {
      return;
    }

    // Enforce min/max bounds
    const minDateTime = DateTime.fromISO(this.minDate);
    const maxDateTime = DateTime.fromISO(this.maxDate);
    const startDate =
      newStart < minDateTime ? this.minDate : newStart.toISODate();
    const endDate = newEnd > maxDateTime ? this.maxDate : newEnd.toISODate();

    this.startDate = startDate;
    this.endDate = endDate;

    this.fireCustomEvent(CustomEventType.DateRangeChanged, {
      start: this.startDate,
      end: this.endDate,
      range: this.selectedRange
    });
  }

  private getNavigationLabel(direction: 'previous' | 'next'): string {
    const interval = this.getCustomRangeInterval();
    const amount = interval.amount;
    const unit =
      interval.type === 'days'
        ? amount === 1
          ? 'day'
          : 'days'
        : interval.type === 'months'
        ? amount === 1
          ? 'month'
          : 'months'
        : amount === 1
        ? 'year'
        : 'years';

    return `${
      direction === 'previous' ? 'Previous' : 'Next'
    } ${amount} ${unit}`;
  }

  updated(changed: Map<string, any>) {
    super.updated(changed);

    if (
      changed.has('startDate') &&
      changed.has('endDate') &&
      (!this.startDate || !this.endDate)
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

  private formatDateForDisplay(dateString: string): string {
    if (!dateString) return '';

    const date = DateTime.fromISO(dateString);
    if (!date.isValid) return dateString;

    // Use the browser's locale for formatting
    return date.toLocaleString();
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
              >${this.formatDateForDisplay(this.startDate) ||
              'Start date'}</span
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
              >${this.formatDateForDisplay(this.endDate) || 'End date'}</span
            >`}
        <div class="navigation-container">
          <button
            class="nav-arrow ${this.selectedRange === 'ALL' ? 'hidden' : ''}"
            ?disabled=${!this.canNavigatePrevious()}
            @click=${this.navigatePrevious}
            title="Previous ${this.selectedRange === 'W'
              ? 'week'
              : this.selectedRange === 'M'
              ? 'month'
              : this.selectedRange === 'Y'
              ? 'year'
              : this.selectedRange === ''
              ? this.getNavigationLabel('previous')
              : 'period'}"
          >
            ◀
          </button>
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
              class="range-btn ${this.selectedRange === 'ALL'
                ? 'selected'
                : ''}"
              @click=${() => this.setRange('ALL')}
            >
              All
            </button>
          </div>
          <button
            class="nav-arrow ${this.selectedRange === 'ALL' ? 'hidden' : ''}"
            ?disabled=${!this.canNavigateNext()}
            @click=${this.navigateNext}
            title="Next ${this.selectedRange === 'W'
              ? 'week'
              : this.selectedRange === 'M'
              ? 'month'
              : this.selectedRange === 'Y'
              ? 'year'
              : this.selectedRange === ''
              ? this.getNavigationLabel('next')
              : 'period'}"
          >
            ▶
          </button>
        </div>
      </div>
    `;
  }
}

customElements.define('temba-range-picker', RangePicker);
