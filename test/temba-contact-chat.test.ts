import { fixture, assert } from '@open-wc/testing';
import { ContactChat } from '../src/contacts/ContactChat';
import { getHTML } from '../test/utils.test';
import './utils.test';

const getChatHTML = (attrs: any = {}) => getHTML('temba-contact-chat', attrs);

describe('temba-contact-chat', () => {
  it('can be created', async () => {
    const chat: ContactChat = await fixture(getChatHTML());
    assert.instanceOf(chat, ContactChat);
  });
});
