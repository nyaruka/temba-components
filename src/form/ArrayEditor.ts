import { html, css, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { FieldConfig } from '../flow/types';
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
    /*if (config.type === 'select') {
      console.log('computeFieldValue select', currentValue, config);
      const selectConfig = config as SelectFieldConfig;
      if (currentValue === undefined || currentValue === null) {
        return selectConfig.multi ? [] : '';
      }
    }*/

    return currentValue;
  }

  private renderArrayField(
    itemIndex: number,
    fieldName: string,
    config: FieldConfig
  ): TemplateResult {
    const computedValue = this.computeFieldValue(itemIndex, fieldName, config);

    // Extract flavor from select config if available
    const flavor =
      config.type === 'select' ? (config as any).flavor || 'small' : 'small';

    // Build container style with width/maxWidth if specified
    let containerStyle = '';
    if (config.width) {
      containerStyle = `width: ${config.width};`;
    } else if (config.maxWidth) {
      containerStyle = `max-width: ${config.maxWidth};`;
    }

    // Use FieldRenderer for consistent field rendering
    const fieldContent = FieldRenderer.renderField(
      fieldName,
      config,
      computedValue,
      {
        showLabel: false, // ArrayEditor doesn't show labels for individual fields
        flavor: flavor,
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
      }
    );

    // Wrap in container with style if maxWidth is specified
    if (containerStyle) {
      return html`<div style="${containerStyle}">${fieldContent}</div>`;
    }

    return fieldContent;
  }

  renderItem(item: ListItem, index: number): TemplateResult {
    const canRemove = this.canRemoveItem(index);

    // Render fields and track if any value fields are visible
    const fieldElements: TemplateResult[] = [];
    let hasVisibleValueField = false;

    Object.entries(this.itemConfig).forEach(([fieldName, config]) => {
      // Check visibility condition
      let isVisible = true;
      if (config.conditions?.visible) {
        try {
          const currentItem = this._items[index] || {};
          isVisible = config.conditions.visible(currentItem);
        } catch (error) {
          console.error(`Error checking visibility for ${fieldName}:`, error);
        }
      }

      if (isVisible) {
        // Check if this is a value field (text input without fixed sizing)
        const isValueField =
          !config.width && !config.maxWidth && config.type === 'text';
        if (isValueField) {
          hasVisibleValueField = true;
        }

        fieldElements.push(html`
          <div
            class="field ${config.width ||
            config.maxWidth ||
            config.type === 'select'
              ? 'field-fixed'
              : 'field-flex'}"
          >
            ${this.renderArrayField(index, fieldName, config)}
          </div>
        `);
      }
    });

    // If no value fields are visible, add a spacer to maintain alignment
    if (!hasVisibleValueField) {
      // Insert spacer after operator (first field) and before category (last field)
      fieldElements.splice(
        -1,
        0,
        html`<div class="field field-flex spacer"></div>`
      );
    }

    return html`
      <div class="array-item">
        <div class="item-fields">
          ${fieldElements}
          <button
            @click=${canRemove ? () => this.removeItem(index) : undefined}
            class="remove-btn ${canRemove ? '' : 'invisible'}"
            ?disabled=${!canRemove}
          >
            <temba-icon name="x"></temba-icon>
          </button>
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
        /* Base field styles */
      }

      .field-flex {
        flex: 1; /* Grow to fill remaining space */
      }

      .field-fixed {
        flex: none; /* Don't grow, use content/maxWidth size */
      }

      .spacer {
        /* Empty spacer to maintain layout alignment */
      }

      .add-btn,
      .remove-btn {
        padding: 4px;
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

      .remove-btn.invisible {
        visibility: hidden;
        cursor: default;
      }
    `;
  }
}
