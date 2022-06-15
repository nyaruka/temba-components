import { html, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators';
import { ScheduledEvent } from '../interfaces';
import { StoreElement } from '../store/StoreElement';

export class ContactPending extends StoreElement {
  @property({ type: String })
  contact: string;

  @property({ type: Object, attribute: false })
  data: ScheduledEvent[];

  protected updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);
    if (changes.has('contact')) {
      if (this.contact) {
        this.url = `/contact/scheduled/${this.contact}/`;
      } else {
        this.url = null;
      }
    }
  }

  public render(): TemplateResult {
    // const workspace = this.store.getWorkspace();

    if (this.data) {
      return html`
        ${this.data.map(value => {
          return html`<div>
            ${this.store.formatDate(value.scheduled)} : ${value.scheduled}
          </div>`;
        })}
      `;
    }
  }
}
