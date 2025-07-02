import { PropertyValueMap } from 'lit';
import { property } from 'lit/decorators.js';
import { Contact, Group } from '../interfaces';
import { EndpointMonitorElement } from '../store/EndpointMonitorElement';

export class ContactStoreElement extends EndpointMonitorElement {
  @property({ type: String })
  contact: string;

  @property({ type: Object, attribute: false })
  data: Contact;

  @property({ type: String })
  endpoint = '/api/v2/contacts.json?uuid=';

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

  public postChanges(payload: any) {
    // clear our cache so we don't have any races
    this.store.removeFromCache(`${this.endpoint}${this.contact}`);
    return this.store
      .postJSON(`${this.endpoint}${this.contact}`, payload)
      .then((response) => {
        this.setContact(response.json);
      });
  }

  public setContact(contact: any) {
    // make sure contact data is properly prepped
    this.data = this.prepareData([contact]);
    this.store.updateCache(`${this.endpoint}${this.contact}`, this.data);
  }

  protected updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);
    if (changes.has('contact')) {
      if (this.contact) {
        this.url = `${this.endpoint}${this.contact}`;
      } else {
        this.url = null;
      }
    }
  }
}
