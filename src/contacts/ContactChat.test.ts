import { fixture, expect, assert } from '@open-wc/testing';
import { ContactChat } from './ContactChat';

export const getHTML = () => {
  return `<temba-contact-chat></temba-contact-chat>`;
};

describe('temba-contact-chat', () => {
  beforeEach(() => {});
  afterEach(() => {});

  it('can be created', async () => {
    const remote: ContactChat = await fixture(getHTML());
    assert.instanceOf(remote, ContactChat);
  });
});
