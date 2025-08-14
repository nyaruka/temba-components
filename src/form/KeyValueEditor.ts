import { html, css, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { BaseListEditor, ListItem } from './BaseListEditor';

interface KeyValueItem extends ListItem {
  key: string;
  value: string;
}

@customElement('temba-key-value-editor')
export class KeyValueEditor extends BaseListEditor<KeyValueItem> {
  @property({ type: String })
  keyPlaceholder = 'Key';

  @property({ type: String })
  valuePlaceholder = 'Value';

  @property({ type: Boolean })
  showValidation = true;

  @state()
  private keyErrors: { [index: number]: string } = {};

  // Configure to maintain empty items
  maintainEmptyItem = true;

  constructor() {
    super();
    this._items = [];
  }

  // External API uses array format to preserve duplicate keys
  @property({ type: Array })
  get value(): KeyValueItem[] {
    return this._items.filter(
      ({ key, value }) => key.trim() !== '' || value.trim() !== ''
    );
  }

  set value(newValue: KeyValueItem[] | Record<string, string>) {
    if (Array.isArray(newValue)) {
      this._items = [...newValue];
    } else {
      // Convert Record to array format
      this._items = Object.entries(newValue || {}).map(([key, value]) => ({
        key,
        value: typeof value === 'string' ? value : String(value)
      }));
    }
    this.requestUpdate();
  }

  // Implement abstract methods
  isEmptyItem(item: KeyValueItem): boolean {
    return item.key.trim() === '' && item.value.trim() === '';
  }

  createEmptyItem(): KeyValueItem {
    return { key: '', value: '' };
  }

  // Override cleanItems to return array format to preserve duplicate keys
  protected cleanItems(items: KeyValueItem[]): KeyValueItem[] {
    return items.filter(
      ({ key, value }) => key.trim() !== '' || value.trim() !== ''
    );
  }

  // Method to convert to Record format for final form submission
  toRecord(): Record<string, string> {
    const result: Record<string, string> = {};
    this._items.forEach(({ key, value }) => {
      if (key.trim() !== '' || value.trim() !== '') {
        result[key] = value;
      }
    });
    return result;
  }

  // Method to validate and set key errors for duplicates and empty keys with values
  validateKeys(): boolean {
    const newKeyErrors: { [index: number]: string } = {};

    // Check for empty keys with values
    this._items.forEach(({ key, value }, index) => {
      if (key.trim() === '' && value.trim() !== '') {
        newKeyErrors[index] = 'Key is required when value is provided';
      }
    });

    // Check for duplicate keys (only non-empty ones)
    const nonEmptyKeys = this._items
      .map(({ key }, index) => ({ key: key.trim(), index }))
      .filter(({ key }) => key !== '');

    const keyCount = new Map<string, number[]>();
    nonEmptyKeys.forEach(({ key, index }) => {
      if (!keyCount.has(key)) {
        keyCount.set(key, []);
      }
      keyCount.get(key)!.push(index);
    });

    // Mark duplicate keys with errors
    keyCount.forEach((indices, key) => {
      if (indices.length > 1) {
        indices.forEach((index) => {
          // Only show duplicate error if there's no empty key error already
          if (!newKeyErrors[index]) {
            newKeyErrors[index] = `Duplicate key "${key}"`;
          }
        });
      }
    });

    this.keyErrors = newKeyErrors;
    return Object.keys(newKeyErrors).length === 0;
  }

  // Clear key errors
  clearKeyErrors(): void {
    this.keyErrors = {};
  }

  // Override updateValue to emit array format and validate keys
  protected updateValue(newValue: KeyValueItem[]) {
    this._items = newValue;

    // Clear errors and re-validate when items change
    this.clearKeyErrors();
    this.validateKeys();

    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { value: this.cleanItems(newValue) },
        bubbles: true
      })
    );
    this.requestUpdate();
  }

  private handleKeyChange(index: number, newKey: string) {
    const items = this.displayItems;
    const currentItem = items[index];

    // Clear any existing error for this key when it's modified
    if (this.keyErrors[index]) {
      const newKeyErrors = { ...this.keyErrors };
      delete newKeyErrors[index];
      this.keyErrors = newKeyErrors;
    }

    this.handleItemChange(index, {
      key: newKey,
      value: currentItem.value
    });
  }

  private handleValueChange(index: number, newValue: string) {
    const items = this.displayItems;
    const currentItem = items[index];

    // Clear any existing error for this key when value is modified
    if (this.keyErrors[index]) {
      const newKeyErrors = { ...this.keyErrors };
      delete newKeyErrors[index];
      this.keyErrors = newKeyErrors;
    }

    this.handleItemChange(index, {
      key: currentItem.key,
      value: newValue
    });
  }

  renderItem(item: KeyValueItem, index: number): TemplateResult {
    const canRemove = this.canRemoveItem(index);
    const keyError =
      this.showValidation && this.keyErrors[index] ? this.keyErrors[index] : '';

    return html`
      <div class="row">
        <temba-textinput
          .value=${item.key}
          .placeholder=${this.keyPlaceholder}
          .errors=${keyError ? [keyError] : []}
          @change=${(e: any) => this.handleKeyChange(index, e.target.value)}
        ></temba-textinput>
        <temba-textinput
          .value=${item.value}
          .placeholder=${this.valuePlaceholder}
          @change=${(e: any) => this.handleValueChange(index, e.target.value)}
        ></temba-textinput>
        ${canRemove
          ? html`
              <button class="remove-btn" @click=${() => this.removeItem(index)}>
                ×
              </button>
            `
          : html`<div class="remove-btn-spacer"></div>`}
      </div>
    `;
  }

  protected getContainerClass(): string {
    return 'key-value-editor';
  }

  static styles = css`
    .key-value-editor {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .row {
      display: grid;
      grid-template-columns: 1fr 1fr auto;
      gap: 8px;
      align-items: center;
      margin: 4px;
    }

    .remove-btn {
      width: 32px;
      height: 32px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: #f8f8f8;
      color: #666;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }

    .remove-btn:hover:not(:disabled) {
      background: #f0f0f0;
    }

    .remove-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .remove-btn-spacer {
      width: 32px;
      height: 32px;
    }
  `;
}
