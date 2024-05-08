import { assert, waitUntil } from '@open-wc/testing';
import { ContactDetails } from '../src/contacts/ContactDetails';
import { getComponent, loadStore, mockGET } from './utils.test';

const TAG = 'temba-contact-details';
const getContactDetails = async (attrs: any = {}) => {
  const contactDetails = (await getComponent(
    TAG,
    attrs,
    '',
    400
  )) as ContactDetails;
  // wait for our contact to load
  await waitUntil(() => !!contactDetails.data);
  return contactDetails;
};

describe('temba-contact-tickets', () => {
  beforeEach(() => {
    mockGET(
      /\/api\/v2\/contacts.json\?uuid=24d64810-3315-4ff5-be85-48e3fe055bf9/,
      '/test-assets/contacts/contact-dave-active'
    );
  });

  it('renders default', async () => {
    await loadStore();
    const contactDetails: ContactDetails = await getContactDetails({
      contact: '24d64810-3315-4ff5-be85-48e3fe055bf9'
    });

    assert.instanceOf(contactDetails, ContactDetails);
    // await assertScreenshot('contacts/details', getClip(contactDetails));
  });
});
