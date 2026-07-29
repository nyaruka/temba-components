import { Contact } from '../interfaces';
import { Events } from '../events/eventRenderers';
import { getStore } from '../store/Store';
import { RealtimeSubscription, subscribeToContactHistory } from './Realtime';

/**
 * Central interest registry for live contact state. Components declare what
 * they care about - specific event types or '*' for everything - and this
 * module owns the rest: it holds the single socket subscription per contact
 * (the firehose on "history:<contact-uuid>"), fetches the contact so watchers
 * get an initial value without something having to change, and fans each
 * event out to just the watchers whose interest matches.
 *
 *   const watch = watchContact(uuid, [Events.CONTACT_NAME_CHANGED], (event, contact) => {
 *     ...
 *   });
 *   watch.unsubscribe();
 *
 * Every delivery hands the watcher the current contact alongside the event
 * that triggered it, so watchers can read state without knowing where the
 * data originally came from. The contact is kept current centrally: scalar
 * events are applied to it directly, while events whose full effect isn't in
 * the event payload (see refetchTypes) trigger a refetch. Initial values and
 * refetches arrive through the same handler as live changes, as a delivery
 * with no event, so watchers have a single code path. The fetch happens on
 * every (re)subscribe, including after reconnects, so watchers also catch up
 * on anything missed while offline. When the last watcher for a contact
 * unsubscribes the socket subscription and cached contact are dropped.
 *
 * Wildcard watchers are event-stream consumers (e.g. chat renders history) -
 * they get every live event but no eventless deliveries.
 */

// same shape components previously fetched themselves - urns are expanded and
// priority ordered so watchers can pick the messaging destination
const CONTACT_ENDPOINT =
  '/api/v2/contacts.json?expand_urns=true&urn_order=priority&uuid=';

// how long we wait for an event burst (e.g. one flow sprint updating several
// fields) to settle before refetching
const REFETCH_DEBOUNCE = 100;

// the contact-state events - everything that changes what a contact *is*, as
// opposed to recording something that happened to them. The default interest
// for components that render contact data
export const CONTACT_STATE_TYPES = [
  Events.CONTACT_NAME_CHANGED,
  Events.CONTACT_URNS_CHANGED,
  Events.CONTACT_FIELD_CHANGED,
  Events.CONTACT_GROUPS_CHANGED,
  Events.CONTACT_LANGUAGE_CHANGED,
  Events.CONTACT_STATUS_CHANGED,
  Events.CONTACT_FLOW_CHANGED,
  Events.CONTACT_LAST_SEEN_CHANGED
];

export type ContactEventHandler = (event: any, contact: Contact) => void;

interface Watcher {
  types: string[] | '*';
  onEvent: ContactEventHandler;
}

interface WatchedContact {
  watchers: Watcher[];
  sub: RealtimeSubscription;
  contact: Contact;
  fetchSeq: number;
  refetchTimer: number;
}

const watched = new Map<string, WatchedContact>();

/**
 * Serializes an engine field value from an event the way the read API
 * would - both read the same engine value dict, keyed by the field's type
 * (the API calls number fields "numeric").
 */
const serializeFieldValue = (key: string, value: any): string => {
  if (!value) {
    return null;
  }
  const fieldType = getStore()?.getContactField(key)?.value_type;
  const engineType = fieldType === 'numeric' ? 'number' : fieldType;
  const engineValue = engineType ? value[engineType] : null;
  return engineValue != null ? String(engineValue) : (value.text ?? null);
};

// how live events patch the cached contact so every delivery carries current
// state
const appliers: { [type: string]: (contact: Contact, event: any) => void } = {
  [Events.CONTACT_NAME_CHANGED]: (contact, event) => {
    contact.name = event.name;
  },
  [Events.CONTACT_LANGUAGE_CHANGED]: (contact, event) => {
    contact.language = event.language;
  },
  [Events.CONTACT_STATUS_CHANGED]: (contact, event) => {
    contact.status = event.status;
  },
  [Events.CONTACT_FLOW_CHANGED]: (contact, event) => {
    contact.flow = event.flow || null;
  },
  [Events.CONTACT_LAST_SEEN_CHANGED]: (contact, event) => {
    // last seen only ever moves forward - ignore out of order deliveries
    if (
      !contact.last_seen_on ||
      new Date(event.last_seen_on) > new Date(contact.last_seen_on)
    ) {
      contact.last_seen_on = event.last_seen_on;
    }
  },
  [Events.CONTACT_FIELD_CHANGED]: (contact, event) => {
    const key = event.field?.key;
    if (key) {
      // replace rather than mutate so earlier deliveries keep their values
      contact.fields = {
        ...contact.fields,
        [key]: serializeFieldValue(key, event.value)
      };
    }
  },
  [Events.CONTACT_GROUPS_CHANGED]: (contact, event) => {
    const added = event.groups_added || [];
    const removed = new Set(
      (event.groups_removed || []).map((group: any) => group.uuid)
    );
    contact.groups = [
      ...(contact.groups || []).filter(
        (group) =>
          !removed.has(group.uuid) &&
          !added.some((a: any) => a.uuid === group.uuid)
      ),
      ...added.map((group: any) => ({ uuid: group.uuid, name: group.name }))
    ];
  }
};

// events whose new state can't be patched into the cached contact from the
// event alone - urns arrive as raw strings while the contact carries them
// expanded with their channels, which picking a messaging destination needs.
// Their arrival triggers a (debounced) refetch, which re-primes every
// watcher with current values.
const refetchTypes = new Set<string>([Events.CONTACT_URNS_CHANGED]);

const matches = (watcher: Watcher, type: string): boolean => {
  return watcher.types === '*' || watcher.types.includes(type);
};

/**
 * Hands every non-wildcard watcher the current contact as an eventless
 * delivery.
 */
const primeAll = (entry: WatchedContact) => {
  for (const watcher of [...entry.watchers]) {
    if (watcher.types !== '*') {
      watcher.onEvent(null, entry.contact);
    }
  }
};

const fetchContact = (uuid: string, entry: WatchedContact) => {
  const store = getStore();
  if (!store) {
    return;
  }

  const seq = ++entry.fetchSeq;
  store
    // skip the store cache in both directions - we always want current data
    // and the cache holds this url in a different shape for components that
    // still fetch it themselves
    .getUrl(`${CONTACT_ENDPOINT}${uuid}`, { force: true, skipCache: true })
    .then((response) => {
      // ignore responses that arrive after everyone left or a newer fetch
      if (watched.get(uuid) !== entry || entry.fetchSeq !== seq) {
        return;
      }

      const contact = response.json?.results?.[0] || null;
      if (!contact) {
        return;
      }

      entry.contact = contact;
      primeAll(entry);
    })
    .catch(() => {
      // a failed fetch just means no initial value - the next (re)subscribe
      // will try again
    });
};

const scheduleRefetch = (uuid: string, entry: WatchedContact) => {
  if (entry.refetchTimer) {
    window.clearTimeout(entry.refetchTimer);
  }
  entry.refetchTimer = window.setTimeout(() => {
    entry.refetchTimer = null;
    if (watched.get(uuid) === entry) {
      fetchContact(uuid, entry);
    }
  }, REFETCH_DEBOUNCE);
};

const handleEvent = (uuid: string, entry: WatchedContact, event: any) => {
  const apply = appliers[event.type];
  if (entry.contact && apply) {
    apply(entry.contact, event);
  }

  for (const watcher of [...entry.watchers]) {
    if (matches(watcher, event.type)) {
      watcher.onEvent(event, entry.contact);
    }
  }

  if (refetchTypes.has(event.type)) {
    scheduleRefetch(uuid, entry);
  }
};

export const watchContact = (
  uuid: string,
  types: string[] | '*',
  onEvent: ContactEventHandler
): RealtimeSubscription => {
  let entry = watched.get(uuid);
  if (!entry) {
    const newEntry: WatchedContact = {
      watchers: [],
      sub: null,
      contact: null,
      fetchSeq: 0,
      refetchTimer: null
    };
    watched.set(uuid, newEntry);
    newEntry.sub = subscribeToContactHistory(
      uuid,
      null,
      (event) => handleEvent(uuid, newEntry, event),
      // fires on every (re)subscribe incl. after reconnects - (re)fetch so
      // watchers see anything that changed while we weren't listening
      () => fetchContact(uuid, newEntry)
    );
    entry = newEntry;
  }

  const watcher: Watcher = { types, onEvent };
  entry.watchers.push(watcher);

  // late joiners on an already-fetched contact get their initial delivery
  // without waiting for another fetch - async so it mirrors the fetch path
  if (entry.contact && types !== '*') {
    const contact = entry.contact;
    Promise.resolve().then(() => {
      if (entry.watchers.includes(watcher)) {
        watcher.onEvent(null, contact);
      }
    });
  }

  return {
    unsubscribe: () => {
      const index = entry.watchers.indexOf(watcher);
      if (index < 0) {
        return;
      }
      entry.watchers.splice(index, 1);
      if (entry.watchers.length === 0) {
        dropEntry(uuid, entry);
      }
    }
  };
};

/**
 * Pushes a fresh copy of a contact into the registry, priming its watchers.
 * Components that write contact changes call this with the server's response
 * so every watcher on the page reflects an edit immediately, without waiting
 * for the change to echo back over the socket. A no-op for unwatched
 * contacts.
 */
export const updateContact = (uuid: string, contact: Contact) => {
  const entry = watched.get(uuid);
  if (entry) {
    // discard any in-flight fetch - it started before this write and could
    // land after it with pre-write data
    entry.fetchSeq++;
    entry.contact = contact;
    primeAll(entry);
  }
};

/**
 * Forces a refetch of a watched contact, re-priming its watchers. A no-op
 * for unwatched contacts.
 */
export const refreshContact = (uuid: string) => {
  const entry = watched.get(uuid);
  if (entry) {
    fetchContact(uuid, entry);
  }
};

const dropEntry = (uuid: string, entry: WatchedContact) => {
  watched.delete(uuid);
  if (entry.refetchTimer) {
    window.clearTimeout(entry.refetchTimer);
    entry.refetchTimer = null;
  }
  entry.sub.unsubscribe();
};

// for tests - real pages just unwatch
export const resetContactWatches = () => {
  for (const [uuid, entry] of [...watched.entries()]) {
    entry.watchers.length = 0;
    dropEntry(uuid, entry);
  }
};
