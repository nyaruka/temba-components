import { fixture, assert } from '@open-wc/testing';
import { ContactDetails } from '../src/contacts/ContactDetails';
import './utils.test';
export const getHTML = () => {
  return `<temba-contact-details></temba-contact-details>`;
};

describe('temba-contact-details', () => {
  it('can be created', async () => {
    const ele: ContactDetails = await fixture(getHTML());
    assert.instanceOf(ele, ContactDetails);
  });
});
