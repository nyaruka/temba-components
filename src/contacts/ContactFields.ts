import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { postJSON } from '../utils';
import { ContactFieldEditor } from './ContactFieldEditor';
import { ContactStoreElement } from './ContactStoreElement';
import { Checkbox } from '../checkbox/Checkbox';

const MIN_FOR_FILTER = 10;

export class ContactFields extends ContactStoreElement {
  static get styles() {
    return css`
      :host {
        --curvature-widget: 0px;
      }

      .fields {
        box-shadow: var(--widget-box-shadow);
      }

      .field {
        display: flex;
        margin: 0.3em 0.3em;
        box-shadow: 0 0 0.2em rgba(0, 0, 0, 0.15);
        border-radius: 0px;
        align-items: center;
        overflow: hidden;
      }

      .show-all .unset {
        display: block;
      }

      .unset {
        display: none;
      }

      .field:hover {
        box-shadow: 1px 1px 6px 2px rgba(0, 0, 0, 0.05),
          0px 0px 0px 2px var(--color-link-primary);
        cursor: pointer;
      }

      .label {
        padding: 0.25em 1em;
        border-top-left-radius: 0px;
        border-bottom-left-radius: 0px;
        color: #777;
        font-size: 0.9em;
        font-weight: 400;
        box-shadow: 0px 0px 20px 0px rgba(0, 0, 0, 0.1) inset;
      }

      .value {
        --icon-color: #ddd;
        max-width: 150px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        padding: 0.25em 1em;
        border-top-right-radius: 0px;
        border-bottom-right-radius: 0px;
        font-size: 0.9em;
      }

      temba-contact-field {
      }

      .footer {
        margin-bottom: 0;
        display: flex;
        background: #fff;
        align-items: center;
        margin-top: 0.5em;
      }
    `;
  }

  @property({ type: Boolean })
  featured: boolean;

  @property({ type: Boolean })
  system: boolean;

  @property({ type: Boolean })
  dirty: boolean;

  @property({ type: Boolean })
  showAll: boolean;

  @property({ type: String })
  timezone: string;

  connectedCallback(): void {
    super.connectedCallback();
    this.handleFieldChanged = this.handleFieldChanged.bind(this);
  }

  protected updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);
    if (changes.has('data')) {
      if (Object.keys(this.data.fields).length <= MIN_FOR_FILTER) {
        this.showAll = true;
      }
    }
  }

  public handleFieldChanged(evt: InputEvent) {
    const field = evt.currentTarget as ContactFieldEditor;
    const value = field.value;
    postJSON('/api/v2/contacts.json?uuid=' + this.data.uuid, {
      fields: { [field.key]: value },
    }).then((response: any) => {
      // returns a single contact with latest updates
      this.setContact(response.json);
    });
  }

  public handleToggle(evt: Event) {
    const checkbox = evt.currentTarget as Checkbox;
    this.showAll = checkbox.checked;
  }

  public render(): TemplateResult {
    if (this.data) {
      const fieldsToShow = Object.entries(this.data.fields)
        .filter((entry: [string, string]) => {
          return (
            (this.featured && this.store.getContactField(entry[0]).featured) ||
            (!this.featured && !this.store.getContactField(entry[0]).featured)
          );
        })
        .sort((a: [string, string], b: [string, string]) => {
          const [ak] = a;
          const [bk] = b;
          const priority =
            this.store.getContactField(bk).priority -
            this.store.getContactField(ak).priority;
          if (priority !== 0) {
            return priority;
          }

          return ak.localeCompare(bk);
        });

      if (fieldsToShow.length == 0) {
        return html`<slot name="empty"></slot>`;
      }

      const fields = fieldsToShow.map((entry: [string, string]) => {
        const [k, v] = entry;
        const field = this.store.getContactField(k);
        return html`<temba-contact-field
          class=${v ? 'set' : 'unset'}
          key=${field.key}
          name=${field.label}
          value=${v}
          type=${field.value_type}
          @change=${this.handleFieldChanged}
          timezone=${this.timezone}
        ></temba-contact-field>`;
      });

      return html`
        <div class="fields ${this.showAll || this.featured ? 'show-all' : ''}">
          ${fields}
        </div>

        ${!this.featured &&
        Object.keys(this.data.fields).length >= MIN_FOR_FILTER
          ? html`<div class="footer">
              <div style="flex-grow: 1"></div>
              <div>
                <temba-checkbox
                  ?checked=${this.showAll}
                  @change=${this.handleToggle}
                  label="Show All"
                />
              </div>
            </div>`
          : null}
      `;
    }

    return null;
  }
}
