import { css, html, TemplateResult } from 'lit';
import { property } from 'lit/decorators';
import { ContactField } from '../interfaces';
import { postJSON } from '../utils';
import { ContactFieldEditor } from './ContactFieldEditor';
import { ContactStoreElement } from './ContactStoreElement';

export class ContactFields extends ContactStoreElement {
  static get styles() {
    return css`
      :host {
        display: flex;
        flex-wrap: wrap;
        flex-shrink: 1;
      }

      .field {
        display: flex;
        margin: 0.3em 0.3em;
        box-shadow: 0 0 0.2em rgba(0, 0, 0, 0.15);
        border-radius: var(--curvature);
        align-items: center;
        overflow: hidden;
      }

      .field.set {
        background: #fff;
      }

      .field.unset {
        opacity: 0.4;
      }

      .field.unset .label {
      }

      .field:hover {
      }

      .field:hover {
        box-shadow: 1px 1px 6px 2px rgba(0, 0, 0, 0.05),
          0px 0px 0px 2px var(--color-link-primary);
        cursor: pointer;
      }

      .label {
        padding: 0.25em 1em;
        border-top-left-radius: var(--curvature);
        border-bottom-left-radius: var(--curvature);
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
        border-top-right-radius: var(--curvature);
        border-bottom-right-radius: var(--curvature);
        font-size: 0.9em;
      }

      temba-contact-field {
        margin: 0.3em;
        min-width: 320px;
        flex-grow: 1;
      }
    `;
  }

  @property({ type: Boolean })
  dirty: boolean;

  connectedCallback(): void {
    super.connectedCallback();
    this.handleFieldChanged = this.handleFieldChanged.bind(this);
  }

  public handleFieldChanged(evt: InputEvent) {
    const field = evt.currentTarget as ContactFieldEditor;
    this.data.fields[field.key] = field.value;
    postJSON('/api/v2/contacts.json?uuid=' + this.data.uuid, {
      fields: { [field.key]: field.value },
    }).then(() => {
      this.refresh();
    });
  }

  public render(): TemplateResult {
    const pinned = this.store.getPinnedFields();

    const fields = pinned.map((field: ContactField) => {
      if (this.data) {
        const value = this.data.fields[field.key];
        return html`<temba-contact-field
          key=${field.key}
          name=${field.label}
          value=${value}
          type=${field.value_type}
          @change=${this.handleFieldChanged}
        ></temba-contact-field>`;
      }
    });

    return html`${this.data ? html` ${fields} ` : null}`;
  }
}
