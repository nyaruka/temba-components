import { fixture, assert } from '@open-wc/testing';
import { ContactSearch } from '../src/contactsearch/ContactSearch';
import './utils.test';

export const getHTML = () => {
  return `<temba-contact-search></temba-contact-search>`;
};

describe('temba-contact-search', () => {
  it('can be created', async () => {
    const search: ContactSearch = await fixture(getHTML());
    assert.instanceOf(search, ContactSearch);
  });
});
