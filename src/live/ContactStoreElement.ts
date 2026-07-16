import { PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { Contact, Group, URN } from '../interfaces';
import { EndpointMonitorElement } from '../store/EndpointMonitorElement';

/**
 * Returns the URN that will be used to message the given contact — URNs are
 * ordered by priority and only ones with a channel are sendable.
 */
export const getDestinationURN = (contact: Contact | null): URN | null => {
  return (contact?.urns || []).find((urn) => !!urn.channel) || null;
};

export class ContactStoreElement extends EndpointMonitorElement {
  @property({ type: String })
  contact: string;

  @property({ type: Object, attribute: false })
  data: Contact;

  // expand_urns resolves each URN against a channel so we know which one
  // will be used when messaging the contact
  @property({ type: String })
  endpoint = '/api/v2/contacts.json?expand_urns=true&uuid=';

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

  public willUpdate(changed: PropertyValues): void {
    // derive our url before the base class runs so it sees the url change
    // in this same pass (clearing stale data when the contact is unset)
    if (changed.has('contact') || changed.has('endpoint')) {
      if (this.contact) {
        this.url = `${this.endpoint}${this.contact}`;
      } else {
        this.url = null;
      }
    }
    super.willUpdate(changed);
  }
}
