import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators';
import { ContactField, CustomEventType } from '../interfaces';

import { SortableList } from '../list/SortableList';
import { StoreElement } from '../store/StoreElement';
import { postJSON } from '../utils';

const TYPE_NAMES = {
  text: 'Text',
  numeric: 'Number',
  datetime: 'Date & Time',
};

const matches = (field: ContactField, query: string): boolean => {
  if (!query) {
    return true;
  }
  const search = (
    field.label +
    field.key +
    TYPE_NAMES[field.value_type]
  ).toLowerCase();
  if (search.toLowerCase().indexOf(query) > -1) {
    return true;
  }
  return false;
};

export class FieldManager extends StoreElement {
  static get styles() {
    return css`
      :host {
        display: flex;
        flex-grow: 1;
        flex-direction: column;
        min-height: 0px;
      }

      .pinned,
      .other-fields {
        background: #fff;
        border-radius: var(--curvature);
        box-shadow: var(--shadow);
        margin-bottom: 1em;
        display: flex;
        flex-direction: column;
      }

      .pinned {
        max-height: 40%;
      }

      .other-fields {
        flex-grow: 2;
        min-height: 0px;
      }

      temba-textinput {
        margin-bottom: 1em;
      }

      .scroll-box {
        overflow-y: auto;
        flex-grow: 1;
        flex-direction: column;
        display: flex;
      }

      .header temba-icon {
        margin-right: 0.5em;
      }

      .label {
        flex-grow: 1;
      }

      .header {
        padding: 0.5em 1em;
        display: flex;
        align-items: flex-start;
        border-bottom: 1px solid var(--color-widget-border);
      }

      .pinned-field {
        user-select: none;
      }

      temba-sortable-list {
        padding: 0.5em 0em;
        width: 100%;
        overflow-y: auto;
      }

      .scroll-box {
        padding: 0.5em 0em;
      }

      temba-icon[name='usages']:hover {
        --icon-color: var(--color-link-primary);
      }

      .field:hover temba-icon[name='delete_small'] {
        opacity: 1 !important;
        cursor: pointer !important;
        pointer-events: all !important;
      }

      temba-icon[name='delete_small']:hover {
        --icon-color: var(--color-link-primary);
      }

      .field {
        border: 1px solid transparent;
        margin: 0 0.5em;
        border-radius: var(--curvature);
      }

      .pinned temba-sortable-list .field:hover {
        cursor: move;
        border-color: #e6e6e6;
        background: #fcfcfc;
      }
    `;
  }

  @property({ type: String, attribute: 'priority-endpoint' })
  priorityEndpoint: string;

  @property({ type: Object, attribute: false })
  featuredFields: ContactField[];

  @property({ type: Object, attribute: false })
  otherFieldKeys: string[] = [];

  @property({ type: String })
  draggingId: string;

  @property({ type: String })
  query = '';

  protected firstUpdated(
    _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.firstUpdated(_changedProperties);
    this.url = this.store.fieldsEndpoint;
  }

  private filterFields() {
    const filteredKeys = this.store.getFieldKeys().filter(key => {
      const field = this.store.getContactField(key);
      if (field.pinned) {
        return false;
      }
      return matches(field, this.query);
    });

    // sort by the label instead of the key
    filteredKeys.sort((a, b) => {
      return this.store
        .getContactField(a)
        .label.localeCompare(this.store.getContactField(b).label);
    });

    const pinned: ContactField[] = [];
    this.store.getPinnedFields().forEach(field => {
      if (matches(field, this.query)) {
        pinned.push(field);
      }
    });

    this.otherFieldKeys = filteredKeys;
    this.featuredFields = pinned;
  }

  protected updated(
    properties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.update(properties);
    if (properties.has('data')) {
      this.filterFields();
    } else if (properties.has('query')) {
      this.filterFields();
    }
  }

  private handleSaveOrder(event) {
    const list = event.currentTarget as SortableList;
    postJSON(
      this.priorityEndpoint,
      list
        .getIds()
        .reverse()
        .reduce((map, key, idx) => {
          map[key] = idx;
          return map;
        }, {})
    ).then(() => {
      this.store.refreshFields();
    });
  }

  private handleOrderChanged(event) {
    const swapsies = event.detail;
    const temp = this.featuredFields[swapsies.fromIdx];
    this.featuredFields[swapsies.fromIdx] = this.featuredFields[swapsies.toIdx];
    this.featuredFields[swapsies.toIdx] = temp;
    this.requestUpdate('featuredFields');
  }

  private handleDragStart(event) {
    this.draggingId = event.detail.id;
  }

  private handleDragStop() {
    this.draggingId = null;
  }

  private handleFieldAction(event: MouseEvent) {
    const ele = event.target as HTMLDivElement;
    const key = ele.dataset.key;
    const action = ele.dataset.action;
    this.fireCustomEvent(CustomEventType.Selection, { key, action });
  }

  private handleSearch(event) {
    this.query = (event.target.value || '').trim();
  }

  private renderField(field: ContactField) {
    return html`
      <div
        class="field sortable"
        id="${field.key}"
        style="
            display: flex; 
            flex-direction: row; 
            align-items: center;
            padding: 0.25em 1em; 
            ${field.key === this.draggingId
          ? 'background: var(--color-selection)'
          : ''}"
      >
        <div
          style="display: flex; min-width: 200px; width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-right: 2em"
        >
          <span
            @click=${this.handleFieldAction}
            data-key=${field.key}
            data-action="update"
            style="color: var(--color-link-primary); cursor:pointer;"
          >
            ${field.label}
          </span>
          ${field.label.indexOf('check') > -1
            ? html`
                <temba-icon
                  size="0.8"
                  style="color: #ccc; margin-left: 0.7em;"
                  name="usages"
                  data-key=${field.key}
                  data-action="usages"
                  @click=${this.handleFieldAction}
                  clickable
                ></temba-icon>
              `
            : null}
          <div class="flex-grow:1"></div>
        </div>
        <div style="flex-grow:1; font-family: monospace; font-size:0.8em;">
          @fields.${field.key}
        </div>
        <div>${TYPE_NAMES[field.value_type]}</div>
        <temba-icon
          style="pointer-events:none;color:#ccc;margin-left:0.3em;margin-right:-0.5em;opacity:0"
          name="delete_small"
          data-key=${field.key}
          data-action="delete"
          @click=${this.handleFieldAction}
        ></temba-icon>
      </div>
    `;
  }

  public render(): TemplateResult {
    if (!this.featuredFields) {
      return null;
    }

    return html`
      <temba-textinput
        placeholder="Search"
        @change=${this.handleSearch}
        clearable
      ></temba-textinput>

      ${this.featuredFields.length > 0
        ? html`
            <div class="pinned">
              <div class="header">
                <temba-icon name="pinned"></temba-icon>
                <div class="label">Featured</div>
              </div>
              ${this.query
                ? html`
                    <div class="scroll-box">
                      ${this.featuredFields.map(field =>
                        this.renderField(field)
                      )}
                    </div>
                  `
                : html`
                    <temba-sortable-list
                      @change=${this.handleSaveOrder}
                      @temba-order-changed=${this.handleOrderChanged}
                      @temba-drag-start=${this.handleDragStart}
                      @temba-drag-stop=${this.handleDragStop}
                    >
                      ${this.featuredFields.map(field =>
                        this.renderField(field)
                      )}
                    </temba-sortable-list>
                  `}
            </div>
          `
        : null}

      <div class="other-fields">
        <div class="header">
          <temba-icon name="fields"></temba-icon>
          <div class="label">Everything Else</div>
        </div>
        <div class="scroll-box">
          ${this.otherFieldKeys.map(field =>
            this.renderField(this.store.getContactField(field))
          )}
        </div>
      </div>
    `;
  }
}
