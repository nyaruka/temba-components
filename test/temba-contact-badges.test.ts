import { assert } from '@open-wc/testing';
import { ContactBadges } from '../src/live/ContactBadges';
import { resetContactWatches } from '../src/live/ContactWatch';
import { setSocketProvider, SocketProvider } from '../src/live/SocketService';
import {
  assertScreenshot,
  getClip,
  getComponent,
  loadStore,
  mockGET,
  MockSocketProvider,
  waitForCondition,
  waitForWatchedContact
} from './utils.test';

const TAG = 'temba-contact-badges';
const getBadges = async (attrs: any = {}) => {
  attrs['endpoint'] = '/test-assets/contacts/';
  const badges = (await getComponent(TAG, attrs, '', 400)) as ContactBadges;

  // wait for contact data and initial render to settle before screenshotting
  await waitForCondition(() => !!badges.data, 40, 50);
  await badges.updateComplete;
  await waitForCondition(
    () => !!badges.shadowRoot?.querySelector('.wrapper'),
    20,
    25
  );

  return badges;
};

describe('temba-contact-badges', () => {
  let mockSocket: MockSocketProvider;
  let previousProvider: SocketProvider;

  beforeEach(() => {
    mockSocket = new MockSocketProvider();
    previousProvider = setSocketProvider(mockSocket);
  });

  afterEach(() => {
    resetContactWatches();
    setSocketProvider(previousProvider);
  });

  it('renders default', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();

    const badges: ContactBadges = await getBadges({
      contact: 'contact-dave-active'
    });
    assert.instanceOf(badges, ContactBadges);
    await assertScreenshot('contacts/badges', getClip(badges));
  });

  it('updates live when the status changes', async () => {
    await loadStore();

    // the central watcher fetches its contact from the api
    mockGET(
      /\/api\/v2\/contacts\.json\?expand_urns=true&urn_order=priority&uuid=contact-dave-active/,
      '/test-assets/contacts/contact-dave-active'
    );

    const badges: ContactBadges = await getBadges({
      contact: 'contact-dave-active'
    });
    assert.equal(badges.data.status, 'active');
    await waitForWatchedContact('contact-dave-active');

    mockSocket.serverPublish('history:contact-dave-active', {
      type: 'contact_status_changed',
      status: 'blocked'
    });

    await waitForCondition(() => badges.data.status === 'blocked');
    await badges.updateComplete;
    assert.include(badges.shadowRoot.textContent, 'Blocked');
  });

  it('updates live when groups change', async () => {
    await loadStore();

    // the central watcher fetches its contact from the api
    mockGET(
      /\/api\/v2\/contacts\.json\?expand_urns=true&urn_order=priority&uuid=contact-dave-active/,
      '/test-assets/contacts/contact-dave-active'
    );

    const badges: ContactBadges = await getBadges({
      contact: 'contact-dave-active'
    });
    await waitForWatchedContact('contact-dave-active');

    // group deltas are applied to the contact directly, no refetch involved
    mockSocket.serverPublish('history:contact-dave-active', {
      type: 'contact_groups_changed',
      groups_added: [{ uuid: 'group-vip', name: 'VIP' }],
      groups_removed: [{ uuid: '3da236a9-9eed-4db3-a18e-cfb58030c249' }]
    });

    await waitForCondition(
      () => !!badges.data.groups.find((group) => group.name === 'VIP')
    );
    assert.isUndefined(
      badges.data.groups.find((group) => group.name === 'Completed')
    );
    await badges.updateComplete;
    assert.include(badges.shadowRoot.textContent, 'VIP');
  });
});
