import { fixture, assert } from '@open-wc/testing';
import { ContactChat } from '../src/contacts/ContactChat';
import './utils.test';

export const getHTML = () => {
  return `<temba-contact-chat></temba-contact-chat>`;
};

describe('temba-contact-chat', () => {
  beforeEach(() => {});
  afterEach(() => {});

  it('can be created', async () => {
    const chat: ContactChat = await fixture(getHTML());
    assert.instanceOf(chat, ContactChat);
  });
});
