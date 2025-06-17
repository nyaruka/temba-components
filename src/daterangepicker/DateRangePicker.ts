import { TemplateResult, html, css, PropertyValueMap } from 'lit';
import { property } from 'lit/decorators.js';
import { FormElement } from '../FormElement';
import { getClasses } from '../utils';
import { DateTime } from 'luxon';

export default class DateRangePicker extends FormElement {
  static get styles() {
    return css`
      :host {
        display: block;
      }

      .range-display {
        border-radius: var(--curvature);
        border: 1px solid var(--color-widget-border);
        display: flex;
        cursor: pointer;
        box-shadow: var(--widget-box-shadow);
        padding: var(--temba-textinput-padding);
        background: var(--color-widget-bg);
        transition: all calc(var(--transition-speed) * 0.5) ease;
      }

      .range-display:hover {
        border-color: var(--color-focus);
        box-shadow: var(--widget-box-shadow-focused);
      }

      .range-display:focus-within {
        border-color: var(--color-focus);
        background: var(--color-widget-bg-focused);
        box-shadow: var(--widget-box-shadow-focused);
      }

      .range-text {
        color: var(--color-widget-text);
        font-family: var(--font-family);
        font-size: 13px;
        flex-grow: 1;
      }

      .range-text.placeholder {
        color: #999;
      }

      .dropdown-content {
        background: #fff;
        border-radius: var(--curvature);
        padding: 1em;
        min-width: 300px;
        box-shadow: var(--dropdown-shadow);
      }

      .date-inputs {
        display: flex;
        gap: 1em;
        margin-bottom: 1em;
      }

      .date-input {
        flex: 1;
      }

      .date-input label {
        display: block;
        font-size: 0.85em;
        color: #666;
        margin-bottom: 0.25em;
        font-weight: 500;
      }

      .date-input input {
        width: 100%;
        padding: 0.5em;
        border: 1px solid var(--color-widget-border);
        border-radius: var(--curvature);
        font-family: var(--font-family);
        font-size: 13px;
      }

      .date-input input:focus {
        outline: none;
        border-color: var(--color-focus);
        box-shadow: 0 0 0 2px rgba(52, 144, 220, 0.2);
      }

      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5em;
      }

      .actions button {
        padding: 0.5em 1em;
        border: 1px solid var(--color-widget-border);
        border-radius: var(--curvature);
        background: var(--color-widget-bg);
        color: var(--color-widget-text);
        font-family: var(--font-family);
        font-size: 12px;
        cursor: pointer;
      }

      .actions button:hover {
        background: var(--color-widget-bg-focused);
      }

      .actions button.primary {
        background: var(--color-primary);
        color: white;
        border-color: var(--color-primary);
      }

      .actions button.primary:hover {
        background: var(--color-primary-dark, var(--color-primary));
      }

      .error {
        color: var(--color-error);
        font-size: 0.85em;
        margin-top: 0.5em;
      }

      .range-preview {
        background: rgba(52, 144, 220, 0.1);
        border: 1px solid rgba(52, 144, 220, 0.3);
        border-radius: var(--curvature);
        padding: 0.25em 0.5em;
        margin-top: 0.5em;
        font-size: 0.85em;
        color: #666;
      }
    `;
  }

  @property({ type: String, attribute: 'start-date' })
  startDate = '';

  @property({ type: String, attribute: 'end-date' }) 
  endDate = '';

  @property({ type: Boolean })
  open = false;

  @property({ type: String })
  private tempStartDate = '';

  @property({ type: String })
  private tempEndDate = '';

  @property({ type: String })
  private errorMessage = '';

  /** Serialize the value as a JSON object with startDate and endDate */
  public serializeValue(value: any): string {
    if (value && typeof value === 'object') {
      return JSON.stringify(value);
    }
    return value || '';
  }

  public constructor() {
    super();
    this.updateValue();
  }

  protected firstUpdated(changed: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    super.firstUpdated(changed);
    this.updateValue();
  }

  public updated(changed: Map<string, any>): void {
    super.updated(changed);
    if (changed.has('startDate') || changed.has('endDate')) {
      this.updateValue();
    }
  }

  private updateValue() {
    if (this.startDate || this.endDate) {
      this.value = { startDate: this.startDate, endDate: this.endDate };
    } else {
      this.value = null;
    }
  }

  private getRangeText(): string {
    if (!this.startDate && !this.endDate) {
      return 'Select date range';
    }
    
    const start = this.startDate ? this.formatDate(this.startDate) : 'Start date';
    const end = this.endDate ? this.formatDate(this.endDate) : 'End date';
    
    return `${start} - ${end}`;
  }

  private formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const date = DateTime.fromISO(dateStr);
      if (date.isValid) {
        return date.toFormat('MMM dd, yyyy');
      }
    } catch (e) {
      // Fallback to basic parsing
    }
    
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
      }
    } catch (e) {
      // Return original string if parsing fails
    }
    
    return dateStr;
  }

  private handleDisplayClick() {
    this.open = true;
    this.tempStartDate = this.startDate;
    this.tempEndDate = this.endDate;
    this.errorMessage = '';
  }

  private handleCancel() {
    this.open = false;
    this.tempStartDate = '';
    this.tempEndDate = '';
    this.errorMessage = '';
  }

  private handleApply() {
    // Validate the range
    if (this.tempStartDate && this.tempEndDate) {
      const startDate = new Date(this.tempStartDate);
      const endDate = new Date(this.tempEndDate);
      
      if (endDate < startDate) {
        this.errorMessage = 'End date must be after start date';
        return;
      }
    }

    this.startDate = this.tempStartDate;
    this.endDate = this.tempEndDate;
    this.open = false;
    this.errorMessage = '';
    this.fireEvent('change');
  }

  private handleStartDateChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.tempStartDate = target.value;
    this.errorMessage = '';
    this.requestUpdate();
  }

  private handleEndDateChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.tempEndDate = target.value;
    this.errorMessage = '';
    this.requestUpdate();
  }

  private handleDropdownBlur() {
    // Small delay to allow clicks to register
    setTimeout(() => {
      if (!this.shadowRoot?.activeElement?.closest('.dropdown-content')) {
        this.handleCancel();
      }
    }, 100);
  }

  public render(): TemplateResult {
    const rangeText = this.getRangeText();
    const hasValue = this.startDate || this.endDate;

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
        <temba-dropdown .open=${this.open}>
          <div slot="toggle" class="range-display" @click=${this.handleDisplayClick}>
            <div class="range-text ${getClasses({ placeholder: !hasValue })}">
              ${rangeText}
            </div>
          </div>
          
          <div slot="dropdown" class="dropdown-content" @blur=${this.handleDropdownBlur}>
            <div class="date-inputs">
              <div class="date-input">
                <label>Start Date</label>
                <input
                  type="date"
                  .value=${this.tempStartDate}
                  @change=${this.handleStartDateChange}
                />
              </div>
              <div class="date-input">
                <label>End Date</label>
                <input
                  type="date"
                  .value=${this.tempEndDate}
                  @change=${this.handleEndDateChange}
                />
              </div>
            </div>
            
            ${this.errorMessage ? html`<div class="error">${this.errorMessage}</div>` : ''}
            
            ${this.tempStartDate && this.tempEndDate ? html`
              <div class="range-preview">
                Preview: ${this.formatDate(this.tempStartDate)} - ${this.formatDate(this.tempEndDate)}
              </div>
            ` : ''}
            
            <div class="actions">
              <button @click=${this.handleCancel}>Cancel</button>
              <button class="primary" @click=${this.handleApply}>Apply</button>
            </div>
          </div>
        </temba-dropdown>
      </temba-field>
    `;
  }
}