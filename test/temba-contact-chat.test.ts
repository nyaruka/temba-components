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
    expect(chatHistoryEl).to.not.equal(null);

    await assertScreenshot(
      'contacts/contact-active-show-chat-history',
      getClip(chat)
    );
  });

  it('hide chatbox if contact is archived', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-barak-archived',
    });

    const chatboxDiv = chat.shadowRoot.querySelector(
      '.chatbox'
    ) as HTMLDivElement;
    expect(chatboxDiv).to.equal(null);

    const reactivateButton = chat.shadowRoot.querySelector(
      'temba-button#reactivate-button'
    ) as HTMLDivElement;
    expect(reactivateButton).to.not.equal(null);

    await assertScreenshot(
      'contacts/contact-archived-hide-chat-msg',
      getClip(chat)
    );
  });

  it('show chat history if contact is archived', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-barak-archived',
    });

    const chatHistoryEl = chat.shadowRoot.querySelector(
      'temba-contact-history'
    ) as HTMLDivElement;
    expect(chatHistoryEl).to.not.equal(null);

    await assertScreenshot(
      'contacts/contact-archived-show-chat-history',
      getClip(chat)
    );
  });

  it('hide chatbox if contact is blocked', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-michelle-blocked',
    });

    const chatboxDiv = chat.shadowRoot.querySelector(
      '.chatbox'
    ) as HTMLDivElement;
    expect(chatboxDiv).to.equal(null);

    const reactivateButton = chat.shadowRoot.querySelector(
      'temba-button#reactivate-button'
    ) as HTMLDivElement;
    expect(reactivateButton).to.not.equal(null);

    await assertScreenshot(
      'contacts/contact-blocked-hide-chat-msg',
      getClip(chat)
    );
  });

  it('show chat history if contact is blocked', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-michelle-blocked',
    });

    const chatHistoryEl = chat.shadowRoot.querySelector(
      'temba-contact-history'
    ) as HTMLDivElement;
    expect(chatHistoryEl).to.not.equal(null);

    await assertScreenshot(
      'contacts/contact-blocked-show-chat-history',
      getClip(chat)
    );
  });

  it('hide chatbox if contact is stopped', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-tim-stopped',
    });

    const chatboxDiv = chat.shadowRoot.querySelector(
      '.chatbox'
    ) as HTMLDivElement;
    expect(chatboxDiv).to.equal(null);

    const reactivateButton = chat.shadowRoot.querySelector(
      'temba-button#reactivate-button'
    ) as HTMLDivElement;
    expect(reactivateButton).to.not.equal(null);

    await assertScreenshot(
      'contacts/contact-stopped-hide-chat-msg',
      getClip(chat)
    );
  });

  it('show chat history if contact is stopped', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-tim-stopped',
    });

    const chatHistoryEl = chat.shadowRoot.querySelector(
      'temba-contact-history'
    ) as HTMLDivElement;
    expect(chatHistoryEl).to.not.equal(null);

    await assertScreenshot(
      'contacts/contact-stopped-show-chat-history',
      getClip(chat)
    );
  });

  // it('show chatbox if current view is contact and contact is active', async () => {
  // });

  // it('show reactivate button if current view is contact and contact is archived', async () => {
  // });

  // it('show chatbox if current view is ticket and contact is active and selected ticket is open', async () => {
  // });

  // it('show reopen button if current view is ticket and contact is active and selected ticket is closed', async () => {
  // });

  // it('hide chatbox if current view is ticket and contact is archived and all tickets are closed', async () => {
  // });

  // it('hide chatbox if current view is ticket and list contains 0 tickets', async () => {
  // });

  // it('hide chatbox if current view is ticket and no ticket is selected', async () => {
  // });
});
