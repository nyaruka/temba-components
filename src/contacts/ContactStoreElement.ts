import { PropertyValueMap } from 'lit';
import { property } from 'lit/decorators';
import { Contact, Group } from '../interfaces';
import { StoreElement } from '../store/StoreElement';

export class ContactStoreElement extends StoreElement {
  @property({ type: String })
  contact: string;

  @property({ type: Object, attribute: false })
  data: Contact;

  prepareData(data: any) {
    if (data && data.length > 0) {
      data = data[0];
      data.groups.forEach((group: Group) => {
        group.is_dynamic = this.store.isDynamicGroup(group.uuid);
      });

      data.groups.sort((a: Group, b: Group) => {
        if (!a.is_dynamic || !b.is_dynamic) {
          if (a.is_dynamic) {
            return -1;
          }

          if (b.is_dynamic) {
            return 1;
          }
        }

        return a.name.localeCompare(b.name);
      });

      return data;
    }
    return null;
  }

  public updateStoreContact(value: any) {
    this.store.updateCache(`/api/v2/contacts.json?uuid=${this.contact}`, value);
  }

  protected updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);
    if (changes.has('contact')) {
      if (this.contact) {
        this.url = `/api/v2/contacts.json?uuid=${this.contact}`;
      } else {
        this.url = null;
      }
    }
  }
}
