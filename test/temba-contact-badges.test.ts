import { assert } from '@open-wc/testing';
import { ContactBadges } from '../src/contacts/ContactBadges';
import {
  assertScreenshot,
  delay,
  getClip,
  getComponent,
  loadStore,
} from './utils.test';

const TAG = 'temba-contact-badges';
const getBadges = async (attrs: any = {}) => {
  attrs['endpoint'] = '/test-assets/contacts/';
  const badges = (await getComponent(TAG, attrs, '', 400)) as ContactBadges;

  // wait for our contact to load
  await delay(100);

  return badges;
};

describe('temba-contact-badges', () => {
  it('renders default', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();

    const badges: ContactBadges = await getBadges({
      contact: 'contact-dave-active',
    });
    assert.instanceOf(badges, ContactBadges);
    await assertScreenshot('contacts/badges', getClip(badges));
  });
});
