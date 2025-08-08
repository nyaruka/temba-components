import { html, css, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { FieldConfig } from '../flow/types';
import { BaseListEditor, ListItem } from './BaseListEditor';

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
    return Object.values(item).every(
      (value) => value === undefined || value === null || value === ''
    );
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

    return currentValue;
  }

  private renderField(
    itemIndex: number,
    fieldName: string,
    config: FieldConfig
  ): TemplateResult {
    const computedValue = this.computeFieldValue(itemIndex, fieldName, config);

    switch (config.type) {
      case 'text':
        return html`<temba-textinput
          .value=${computedValue || ''}
          .placeholder=${config.placeholder}
          @change=${(e: any) =>
            this.handleFieldChange(itemIndex, fieldName, e.target.value)}
        ></temba-textinput>`;

      case 'textarea':
        return html`<temba-textinput
          .value=${computedValue || ''}
          .placeholder=${config.placeholder}
          textarea
          .rows=${config.rows || 3}
          @change=${(e: any) =>
            this.handleFieldChange(itemIndex, fieldName, e.target.value)}
        ></temba-textinput>`;

      case 'select':
        return html`<temba-select
          .value=${computedValue || ''}
          .options=${config.options}
          @change=${(e: any) =>
            this.handleFieldChange(itemIndex, fieldName, e.target.value)}
        ></temba-select>`;

      default:
        return html`<span>Unsupported field type: ${config.type}</span>`;
    }
  }

  renderItem(item: ListItem, index: number): TemplateResult {
    const canRemove = this.canRemoveItem(index);

    return html`
      <div class="array-item">
        <div class="item-header">
          <span class="item-title">${this.itemLabel} ${index + 1}</span>
          ${canRemove
            ? html`
                <button
                  @click=${() => this.removeItem(index)}
                  class="remove-btn"
                >
                  Remove
                </button>
              `
            : ''}
        </div>
        <div class="item-fields">
          ${Object.entries(this.itemConfig).map(
            ([fieldName, config]) => html`
              <div class="field">
                <label>${config.label}${config.required ? ' *' : ''}</label>
                ${this.renderField(index, fieldName, config)}
              </div>
            `
          )}
        </div>
      </div>
    `;
  }

  protected getContainerClass(): string {
    return 'array-editor';
  }

  protected renderAddButton(): TemplateResult {
    return html`
      <button class="add-btn" @click=${() => this.addItem()}>
        Add ${this.itemLabel}
      </button>
    `;
  }

  static styles = css`
    .array-editor {
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 16px;
      background: #fafafa;
    }

    .array-item {
      border: 1px solid #d0d0d0;
      border-radius: 4px;
      padding: 16px;
      margin-bottom: 12px;
      background: white;
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #eee;
    }

    .item-title {
      font-weight: 600;
      color: #333;
    }

    .item-fields {
      display: grid;
      gap: 12px;
    }

    .field label {
      display: block;
      margin-bottom: 4px;
      font-weight: 500;
      color: #555;
      font-size: 14px;
    }

    .add-btn,
    .remove-btn {
      padding: 8px 16px;
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
      background: #fff5f5;
      border-color: #fecaca;
      color: #dc2626;
    }

    .remove-btn:hover {
      background: #fef2f2;
    }
  `;
}
