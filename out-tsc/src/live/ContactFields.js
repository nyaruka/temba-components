import { __decorate } from "tslib";
import { css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { getClasses, postJSON } from '../utils';
import { ContactStoreElement } from './ContactStoreElement';
import { CustomEventType } from '../interfaces';
const MIN_FOR_FILTER = 10;
export class ContactFields extends ContactStoreElement {
    constructor() {
        super(...arguments);
        this.disabled = false;
    }
    static get styles() {
        return css `
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
    connectedCallback() {
        super.connectedCallback();
        this.handleFieldChanged = this.handleFieldChanged.bind(this);
    }
    isAgent() {
        return this.role === 'T';
    }
    updated(changes) {
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
    handleFieldChanged(evt) {
        const field = evt.currentTarget;
        const value = field.value;
        // TODO: Use contact.postChanges instead of postJSON
        postJSON('/api/v2/contacts.json?uuid=' + this.data.uuid, {
            fields: { [field.key]: value }
        })
            .then((response) => {
            field.handleResponse(response);
            // returns a single contact with latest updates
            this.setContact(response.json);
        })
            .catch((error) => {
            field.handleResponse(error);
        });
    }
    handleToggle(evt) {
        const checkbox = evt.currentTarget;
        this.showAll = checkbox.checked;
    }
    render() {
        if (this.data) {
            const fieldsToShow = Object.entries(this.data.fields).sort((a, b) => {
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
                if (fieldA.type === 'district' &&
                    fieldB.type !== 'ward' &&
                    fieldB.type !== 'district') {
                    return 1;
                }
                if (fieldB.type === 'district' &&
                    fieldA.type !== 'ward' &&
                    fieldA.type !== 'district') {
                    return -1;
                }
                if (fieldA.type === 'state' &&
                    fieldB.type !== 'ward' &&
                    fieldB.type !== 'district' &&
                    fieldB.type !== 'state') {
                    return 1;
                }
                if (fieldB.type === 'state' &&
                    fieldA.type !== 'ward' &&
                    fieldA.type !== 'district' &&
                    fieldA.type !== 'state') {
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
            });
            if (fieldsToShow.length == 0) {
                return html `<slot name="empty"></slot>`;
            }
            const fields = fieldsToShow.map((entry) => {
                const [k, v] = entry;
                const field = this.store.getContactField(k);
                return html `<temba-contact-field
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
            return html `
        <div class=${getClasses({ disabled: this.disabled })}>
          <div class="fields ${this.showAll ? 'show-all' : ''}">${fields}</div>
          ${Object.keys(this.data.fields).length >= MIN_FOR_FILTER
                ? html `<div class="toggle">
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
__decorate([
    property({ type: Boolean })
], ContactFields.prototype, "system", void 0);
__decorate([
    property({ type: Boolean })
], ContactFields.prototype, "dirty", void 0);
__decorate([
    property({ type: Boolean })
], ContactFields.prototype, "showAll", void 0);
__decorate([
    property({ type: String })
], ContactFields.prototype, "timezone", void 0);
__decorate([
    property({ type: String })
], ContactFields.prototype, "role", void 0);
__decorate([
    property({ type: Boolean })
], ContactFields.prototype, "disabled", void 0);
//# sourceMappingURL=ContactFields.js.map