import { expect } from '@open-wc/testing';
import { ContactChat } from '../src/contacts/ContactChat';
import {
  assertScreenshot,
  delay,
  getClip,
  getComponent,
  loadStore,
  mockGET,
} from '../test/utils.test';

const TAG = 'temba-contact-chat';

const getContactChat = async (attrs: any = {}) => {
  attrs['endpoint'] = '/test-assets/contacts/';

  // add some sizes and styles to force our chat history to scroll
  const chat = (await getComponent(
    TAG,
    attrs,
    '',
    500,
    500,
    'display:flex;flex-direction:column;flex-grow:1;min-height:0;'
  )) as ContactChat;

  // wait for our contact to load
  await delay(100);

  return chat;
};

describe('temba-contact-chat', () => {
  // map requests for contact history and ticket api to our static files
  // we'll just us the same history and ticket list for everybody for now
  beforeEach(() => {
    mockGET(
      /\/contact\/history\/contact-.*/,
      '/test-assets/contacts/history.json'
    );

    mockGET(
      /\/api\/v2\/tickets\.json\?contact=contact-.*/,
      '/test-assets/api/tickets.json'
    );
  });

  it('can be created', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active',
    });

    await assertScreenshot('contacts/contact-active-default', getClip(chat));
  });

  it('can send chat msg if contact is active', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active',
    });

    const chatboxDivEl = chat.shadowRoot.querySelector(
      '.chatbox'
    ) as HTMLDivElement;
    const displayVal = chatboxDivEl.style.display;
    expect(displayVal).to.equal('');

    await assertScreenshot(
      'contacts/contact-active-show-chat-msg',
      getClip(chat)
    );
  });

  it('can see chat history if contact is active', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active',
    });

    const chatHistoryEl = chat.shadowRoot.querySelector(
      'temba-contact-history'
    ) as HTMLDivElement;
    const displayVal = chatHistoryEl.style.display;
    expect(displayVal).to.equal('');

    await assertScreenshot(
      'contacts/contact-active-show-chat-history',
      getClip(chat)
    );
  });

  it('cannot send chat msg if contact is archived', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-barak-archived',
    });

    const chatboxDivEl = chat.shadowRoot.querySelector(
      '.chatbox'
    ) as HTMLDivElement;
    const displayVal = chatboxDivEl.style.display;
    expect(displayVal).to.equal('none');

    await assertScreenshot(
      'contacts/contact-archived-hide-chat-msg',
      getClip(chat)
    );
  });

  it('can see chat history if contact is archived', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-barak-archived',
    });

    const chatHistoryEl = chat.shadowRoot.querySelector(
      'temba-contact-history'
    ) as HTMLDivElement;
    const displayVal = chatHistoryEl.style.display;
    expect(displayVal).to.equal('');

    await assertScreenshot(
      'contacts/contact-archived-show-chat-history',
      getClip(chat)
    );
  });

  it('cannot send chat msg if contact is blocked', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-michelle-blocked',
    });

    const chatboxDivEl = chat.shadowRoot.querySelector(
      '.chatbox'
    ) as HTMLDivElement;
    const displayVal = chatboxDivEl.style.display;
    expect(displayVal).to.equal('none');

    await assertScreenshot(
      'contacts/contact-blocked-hide-chat-msg',
      getClip(chat)
    );
  });

  it('can see chat history if contact is blocked', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-michelle-blocked',
    });

    const chatHistoryEl = chat.shadowRoot.querySelector(
      'temba-contact-history'
    ) as HTMLDivElement;
    const displayVal = chatHistoryEl.style.display;
    expect(displayVal).to.equal('');

    await assertScreenshot(
      'contacts/contact-blocked-show-chat-history',
      getClip(chat)
    );
  });

  it('cannot send chat msg if contact is stopped', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-tim-stopped',
    });

    const chatboxDivEl = chat.shadowRoot.querySelector(
      '.chatbox'
    ) as HTMLDivElement;
    const displayVal = chatboxDivEl.style.display;
    expect(displayVal).to.equal('none');

    await assertScreenshot(
      'contacts/contact-stopped-hide-chat-msg',
      getClip(chat)
    );
  });

  it('can see chat history if contact is stopped', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-tim-stopped',
    });

    const chatHistoryEl = chat.shadowRoot.querySelector(
      'temba-contact-history'
    ) as HTMLDivElement;
    const displayVal = chatHistoryEl.style.display;
    expect(displayVal).to.equal('');

    await assertScreenshot(
      'contacts/contact-stopped-show-chat-history',
      getClip(chat)
    );
  });
});
