import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { getClasses, postJSON } from '../../../shared/utils/index';
import { ContactFieldEditor } from './ContactFieldEditor';
import { ContactStoreElement } from './ContactStoreElement';
import { Checkbox } from '../../form/checkbox/Checkbox';
import { CustomEventType } from '../../../shared/interfaces';

const MIN_FOR_FILTER = 10;

export class ContactFields extends ContactStoreElement {
  static get styles() {
    return css`
      .field {
        display: flex;
        margin: 1em 0.3em;
        box-shadow: 0 0 0.2em rgba(0, 0, 0, 0.15);
        border-radius: 0px;
        align-items: center;
        overflow: hidden;
      }

      .show-all .unset,
      .featured {
        display: block !important;
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

      .toggle {
        display: flex;
        background: #fff;
        align-items: center;
        margin-bottom: 0.5em;
      }

      .disabled .toggle {
        display: none;
      }
    `;
  }

  @property({ type: Boolean })
  system: boolean;

  @property({ type: Boolean })
  dirty: boolean;

  @property({ type: Boolean })
  showAll: boolean;

  @property({ type: String })
  timezone: string;

  @property({ type: String })
  role: string;

  @property({ type: Boolean })
  disabled = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.handleFieldChanged = this.handleFieldChanged.bind(this);
  }

  private isAgent(): boolean {
    return this.role === 'T';
  }

  protected updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);
    if (changes.has('data')) {
      if (Object.keys(this.data.fields).length <= MIN_FOR_FILTER) {
        this.showAll = true;
      }

      this.fireCustomEvent(CustomEventType.DetailsChanged, {
        count: Object.values(this.data.fields).filter((value) => !!value).length
      });
    }
  }

  public handleFieldChanged(evt: InputEvent) {
    const field = evt.currentTarget as ContactFieldEditor;
    const value = field.value;

    // TODO: Use contact.postChanges instead of postJSON
    postJSON('/api/v2/contacts.json?uuid=' + this.data.uuid, {
      fields: { [field.key]: value }
    })
      .then((response: any) => {
        field.handleResponse(response);

        // returns a single contact with latest updates
        this.setContact(response.json);
      })
      .catch((error) => {
        field.handleResponse(error);
      });
  }

  public handleToggle(evt: Event) {
    const checkbox = evt.currentTarget as Checkbox;
    this.showAll = checkbox.checked;
  }

  public render(): TemplateResult {
    if (this.data) {
      const fieldsToShow = Object.entries(this.data.fields).sort(
        (a: [string, string], b: [string, string]) => {
          const [ak] = a;
          const [bk] = b;
          const fieldA = this.store.getContactField(ak);
          const fieldB = this.store.getContactField(bk);

          if (fieldA.type === 'ward') {
            return 1;
          }

          if (fieldB.type === 'ward') {
            return -1;
          }

          if (
            fieldA.type === 'district' &&
            fieldB.type !== 'ward' &&
            fieldB.type !== 'district'
          ) {
            return 1;
          }

          if (
            fieldB.type === 'district' &&
            fieldA.type !== 'ward' &&
            fieldA.type !== 'district'
          ) {
            return -1;
          }

          if (
            fieldA.type === 'state' &&
            fieldB.type !== 'ward' &&
            fieldB.type !== 'district' &&
            fieldB.type !== 'state'
          ) {
            return 1;
          }

          if (
            fieldB.type === 'state' &&
            fieldA.type !== 'ward' &&
            fieldA.type !== 'district' &&
            fieldA.type !== 'state'
          ) {
            return -1;
          }

          if (fieldA.featured && !fieldB.featured) {
            return -1;
          }

          if (fieldB.featured && !fieldA.featured) {
            return 1;
          }

          const priority = fieldB.priority - fieldA.priority;
          if (priority !== 0) {
            return priority;
          }

          return ak.localeCompare(bk);
        }
      );

      if (fieldsToShow.length == 0) {
        return html`<slot name="empty"></slot>`;
      }

      const fields = fieldsToShow.map((entry: [string, string]) => {
        const [k, v] = entry;
        const field = this.store.getContactField(k);
        return html`<temba-contact-field
          class=${getClasses({ set: !!v, unset: !v, featured: field.featured })}
          key=${field.key}
          name=${field.label}
          value=${v}
          type=${field.value_type}
          @change=${this.handleFieldChanged}
          timezone=${this.timezone}
          ?disabled=${(this.isAgent() && field.agent_access === 'view') ||
          this.disabled
            ? true
            : false}
        ></temba-contact-field>`;
      });

      return html`
        <div class=${getClasses({ disabled: this.disabled })}>
          <div class="fields ${this.showAll ? 'show-all' : ''}">${fields}</div>
          ${Object.keys(this.data.fields).length >= MIN_FOR_FILTER
            ? html`<div class="toggle">
                <div style="flex-grow: 1"></div>
                <div>
                  <temba-checkbox
                    ?checked=${this.showAll}
                    @change=${this.handleToggle}
                    label="Show All"
                  ></temba-checkbox>
                </div>
              </div>`
            : null}
        </div>
      `;
    }

    return super.render();
  }
}
