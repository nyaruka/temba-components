import { assert } from '@open-wc/testing';
import { ContactBadges } from '../src/live/ContactBadges';
import {
  assertScreenshot,
  getClip,
  getComponent,
  loadStore,
  waitForCondition
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
  it('renders default', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();

    const badges: ContactBadges = await getBadges({
      contact: 'contact-dave-active'
    });
    assert.instanceOf(badges, ContactBadges);
    await assertScreenshot('contacts/badges', getClip(badges));
  });
});
