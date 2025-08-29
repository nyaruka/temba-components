import { html, css, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { FieldConfig, SelectFieldConfig } from '../flow/types';
import { BaseListEditor, ListItem } from './BaseListEditor';
import { FieldRenderer } from './FieldRenderer';

@customElement('temba-array-editor')
export class TembaArrayEditor extends BaseListEditor<ListItem> {
  @property({ type: Object })
  itemConfig: Record<string, FieldConfig> = {};

  @property({ type: String })
  itemLabel = 'Item';

  @property({ type: Function })
  onItemChange?: (
    itemIndex: number,
    field: string,
    value: any,
    allItems: any[]
  ) => any[];

  @property({ type: Function })
  isEmptyItemFn?: (item: any) => boolean;

  @property({ type: Boolean })
  maintainEmptyItem = true; // Enable by default for better UX

  constructor() {
    super();
    this._items = [];
  }

  // External API
  @property({ type: Array })
  get value(): any[] {
    return [...this._items];
  }

  set value(newValue: any[]) {
    this._items = newValue || [];
    this.requestUpdate();
  }

  // Implement abstract methods
  isEmptyItem(item: ListItem): boolean {
    // Use configurable function if provided
    if (this.isEmptyItemFn) {
      return this.isEmptyItemFn(item);
    }

    // Default behavior: check if all values are empty
    const values = Object.values(item);
    if (values.length === 0) {
      return true;
    }

    return values.every(
      (value) => value === undefined || value === null || value === ''
    );
  }

  // Override cleanItems to be more permissive for form data
  protected cleanItems(items: ListItem[]): any {
    // For runtime attachments, keep items that have at least one non-empty field
    return items.filter((item) => {
      const values = Object.values(item);
      return (
        values.length > 0 &&
        values.some(
          (value) => value !== undefined && value !== null && value !== ''
        )
      );
    });
  }

  createEmptyItem(): ListItem {
    return {};
  }

  protected handleFieldChange(
    itemIndex: number,
    fieldName: string,
    newValue: any
  ) {
    let updatedItems: any[];

    if (this.onItemChange) {
      updatedItems = this.onItemChange(
        itemIndex,
        fieldName,
        newValue,
        this._items
      );
    } else {
      updatedItems = [...this._items];
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        [fieldName]: newValue
      };
    }

    this.updateValue(updatedItems);
  }

  private computeFieldValue(
    itemIndex: number,
    fieldName: string,
    config: FieldConfig
  ): any {
    const item = this._items[itemIndex] || {};
    const currentValue = item[fieldName];

    if (config.computeValue) {
      return config.computeValue(item, currentValue);
    }

    // For select fields, ensure we return the right type
    if (config.type === 'select') {
      const selectConfig = config as SelectFieldConfig;
      if (currentValue === undefined || currentValue === null) {
        return selectConfig.multi ? [] : '';
      }
    }

    return currentValue;
  }

  private renderArrayField(
    itemIndex: number,
    fieldName: string,
    config: FieldConfig
  ): TemplateResult {
    const computedValue = this.computeFieldValue(itemIndex, fieldName, config);

    // Use FieldRenderer for consistent field rendering
    return FieldRenderer.renderField(fieldName, config, computedValue, {
      showLabel: false, // ArrayEditor doesn't show labels for individual fields
      flavor: 'small', // ArrayEditor uses small flavor
      extraClasses: 'form-control',
      onChange: (e: Event) => {
        let value: any;
        const target = e.target as any;

        // Handle different field types and their change events
        if (config.type === 'select') {
          // Use consistent temba-select value normalization
          value = target.values;
        } else {
          // For other field types, use the target value directly
          value = target.value;
        }

        this.handleFieldChange(itemIndex, fieldName, value);
      }
    });
  }

  renderItem(item: ListItem, index: number): TemplateResult {
    const canRemove = this.canRemoveItem(index);

    return html`
      <div class="array-item">
        <div class="item-fields">
          ${Object.entries(this.itemConfig).map(
            ([fieldName, config]) => html`
              <div class="field">
                ${this.renderArrayField(index, fieldName, config)}
              </div>
            `
          )}
          ${canRemove
            ? html`
                <button
                  @click=${() => this.removeItem(index)}
                  class="remove-btn"
                >
                  <temba-icon name="x"></temba-icon>
                </button>
              `
            : ''}
        </div>
      </div>
    `;
  }

  protected getContainerClass(): string {
    return 'array-editor';
  }

  static get styles() {
    return css`
      ${super.styles}

      .array-editor {
      }

      .array-item {
      }

      .item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .item-title {
        font-weight: 600;
        color: #333;
      }

      .item-fields {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      .field {
        flex: 1;
      }

      .add-btn,
      .remove-btn {
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        font-size: 14px;
      }

      .add-btn:hover,
      .remove-btn:hover {
        background: #f8f8f8;
      }

      .remove-btn {
        background: #fefefe;
        color: #999;
      }
    `;
  }
}
