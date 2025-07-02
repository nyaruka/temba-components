import { assert, expect } from '@open-wc/testing';
import { ContactFields } from '../src/live/ContactFields';
import { delay, getComponent, loadStore, mockPOST } from './utils.test';

const TAG = 'temba-contact-fields';
const getFields = async (attrs: any = {}) => {
  attrs['endpoint'] = '/test-assets/contacts/';
  const fields = (await getComponent(TAG, attrs, '', 600)) as ContactFields;

  // wait for our contact to load
  await delay(100);

  return fields;
};

describe(TAG, () => {
  it('renders default', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();

    const fields: ContactFields = await getFields({
      contact: 'contact-dave-active'
    });
    assert.instanceOf(fields, ContactFields);
    // await assertScreenshot('contacts/fields', getClip(fields));
  });

  it('handles updated contacts properly', async () => {
    await loadStore();
    const fields: ContactFields = await getFields({
      contact: 'contact-dave-active'
    });

    const data = fields.data;
    data.groups.forEach((group) => {
      delete group['is_dynamic'];
    });
    mockPOST(/api\/v2\/contacts\.json\?uuid=contact-dave-active/, data);

    // update our fields
    await typeInto(
      "temba-contact-fields:temba-contact-field[key='age']:temba-textinput",
      '62',
      true,
      true
    );

    // the updated contact should still have is_dynamic flags added
    expect(fields.data.groups[0].is_dynamic).equals(true);
    expect(fields.data.groups[1].is_dynamic).equals(false);

    // await assertScreenshot('contacts/fields-updated', getClip(fields));
  });
});
