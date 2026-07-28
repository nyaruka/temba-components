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

  // Resolve each URN against a channel while retaining the user's priority
  // order. Consumers can select the first channel-backed URN for messaging.
  @property({ type: String })
  endpoint = '/api/v2/contacts.json?expand_urns=true&urn_order=priority&uuid=';

  // Writes go through the internal API, which responds with the same shape
  // as the read endpoint above.
  @property({ type: String })
  writeEndpoint = '/api/internal/contacts.json?uuid=';

  prepareData(data: any) {
    if (data) {
      data = Array.isArray(data) ? data[0] : data;
    }
    if (data) {
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
      .postJSON(`${this.writeEndpoint}${this.contact}`, payload)
      .then((response) => {
        this.setContact(response.json);
      });
  }

  public setContact(contact: any, contactId = this.contact) {
    // make sure contact data is properly prepped
    this.data = this.prepareData([contact]);
    this.store.updateCache(`${this.endpoint}${contactId}`, this.data);
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
