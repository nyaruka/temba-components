import { fixture, assert } from '@open-wc/testing';
import { ContactList } from '../src/list/ContactList';
import './utils.test';

export const getHTML = () => {
  return `<temba-contacts></temba-contacts>`;
};

describe('temba-ticket-list', () => {
  it('can be created', async () => {
    const tickets: ContactList = await fixture(getHTML());
    assert.instanceOf(tickets, ContactList);
  });
});
