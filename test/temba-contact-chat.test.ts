import { expect } from '@open-wc/testing';
import { ContactChat } from '../src/contacts/ContactChat';
import { ContactHistory } from '../src/contacts/ContactHistory';
import { TicketList } from '../src/list/TicketList';
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

const list_TAG = 'temba-list';
const getTicketList = async (attrs: any = {}) => {
  const list = (await getComponent(list_TAG, attrs)) as TicketList;
  // wait for the fetch
  await list.httpComplete;
  return list;
};

describe('temba-contact-chat - contact tests', () => {
  // map requests for contact history to our static files
  // we'll just us the same historylist for everybody for now
  beforeEach(() => {
    mockGET(
      /\/contact\/history\/contact-.*/,
      '/test-assets/contacts/history.json'
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

  it('show history and show chatbox if contact is active', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active',
    });

    const chatHistoryEl = chat.shadowRoot.querySelector(
      'temba-contact-history'
    ) as ContactHistory;
    expect(chatHistoryEl).to.not.equal(null);

    const chatboxDivEl = chat.shadowRoot.querySelector(
      '.chatbox'
    ) as HTMLDivElement;
    expect(chatboxDivEl).to.not.equal(null);

    const reopenButton = chat.shadowRoot.querySelector(
      'temba-button#reopen-button'
    ) as HTMLDivElement;
    expect(reopenButton).to.equal(null);

    await assertScreenshot(
      'contacts/contact-active-show-chatbox',
      getClip(chat)
    );
  });

  it('show history and hide chatbox if contact is archived', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-barack-archived',
    });

    const chatHistoryEl = chat.shadowRoot.querySelector(
      'temba-contact-history'
    ) as ContactHistory;
    expect(chatHistoryEl).to.not.equal(null);

    const chatboxDiv = chat.shadowRoot.querySelector(
      '.chatbox'
    ) as HTMLDivElement;
    expect(chatboxDiv).to.equal(null);

    const reopenButton = chat.shadowRoot.querySelector(
      'temba-button#reopen-button'
    ) as HTMLDivElement;
    expect(reopenButton).to.equal(null);

    await assertScreenshot(
      'contacts/contact-archived-hide-chatbox',
      getClip(chat)
    );
  });

  it('show history and hide chatbox if contact is blocked', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-michelle-blocked',
    });

    const chatHistoryEl = chat.shadowRoot.querySelector(
      'temba-contact-history'
    ) as ContactHistory;
    expect(chatHistoryEl).to.not.equal(null);

    const chatboxDiv = chat.shadowRoot.querySelector(
      '.chatbox'
    ) as HTMLDivElement;
    expect(chatboxDiv).to.equal(null);

    const reopenButton = chat.shadowRoot.querySelector(
      'temba-button#reopen-button'
    ) as HTMLDivElement;
    expect(reopenButton).to.equal(null);

    await assertScreenshot(
      'contacts/contact-blocked-hide-chatbox',
      getClip(chat)
    );
  });

  it('show history and hide chatbox if contact is stopped', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-tim-stopped',
    });

    const chatHistoryEl = chat.shadowRoot.querySelector(
      'temba-contact-history'
    ) as ContactHistory;
    expect(chatHistoryEl).to.not.equal(null);

    const chatboxDiv = chat.shadowRoot.querySelector(
      '.chatbox'
    ) as HTMLDivElement;
    expect(chatboxDiv).to.equal(null);

    const reopenButton = chat.shadowRoot.querySelector(
      'temba-button#reopen-button'
    ) as HTMLDivElement;
    expect(reopenButton).to.equal(null);

    await assertScreenshot(
      'contacts/contact-stopped-hide-chatbox',
      getClip(chat)
    );
  });
});

describe('temba-contact-chat - ticket tests', () => {
  // map requests for contact history to our static files
  // we'll just us the same history for everybody for now
  beforeEach(() => {
    mockGET(
      /\/contact\/history\/contact-.*/,
      '/test-assets/contacts/history.json'
    );
  });

  it('show history and show chatbox if contact is active and ticket is open', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-carter-active',
    });

    const tickets: TicketList = await getTicketList({
      endpoint: '/test-assets/tickets/ticket-carter-open.json',
    });

    chat.currentTicket = tickets.items[0];
    chat.refresh();

    const chatHistoryEl = chat.shadowRoot.querySelector(
      'temba-contact-history'
    ) as ContactHistory;
    expect(chatHistoryEl).to.not.equal(null);

    const chatboxDiv = chat.shadowRoot.querySelector(
      '.chatbox'
    ) as HTMLDivElement;
    expect(chatboxDiv).to.not.equal(null);

    const reopenButton = chat.shadowRoot.querySelector(
      'temba-button#reopen-button'
    ) as HTMLDivElement;
    expect(reopenButton).to.equal(null);

    await assertScreenshot(
      'contacts/contact-active-ticket-open-show-chatbox',
      getClip(chat)
    );
  });

  it('show history and show reopen button if contact is active and ticket is closed', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-carter-active',
    });

    const tickets: TicketList = await getTicketList({
      endpoint: '/test-assets/tickets/ticket-carter-closed.json',
    });
    chat.currentTicket = tickets.items[0];
    chat.refresh();

    await waitFor(0);
    await chat.httpComplete;

    const chatHistoryEl = chat.shadowRoot.querySelector(
      'temba-contact-history'
    ) as ContactHistory;
    expect(chatHistoryEl).to.not.equal(null);

    const chatboxDiv = chat.shadowRoot.querySelector(
      '.chatbox'
    ) as HTMLDivElement;
    expect(chatboxDiv).to.equal(null);

    const reopenButton = chat.shadowRoot.querySelector(
      'temba-button#reopen-button'
    ) as HTMLDivElement;
    expect(reopenButton).to.not.equal(null);

    await assertScreenshot(
      'contacts/contact-active-ticket-closed-show-reopen-button',
      getClip(chat)
    );
  });

  it('show history and hide chatbox if contact is archived and ticket is closed', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();

    const chat: ContactChat = await getContactChat({
      contact: 'contact-barack-archived',
    });

    const tickets: TicketList = await getTicketList({
      endpoint: '/test-assets/tickets/ticket-barack-closed.json',
    });
    chat.currentTicket = tickets.items[0];
    chat.refresh();

    await waitFor(0);
    await chat.httpComplete;

    const chatHistoryEl = chat.shadowRoot.querySelector(
      'temba-contact-history'
    ) as ContactHistory;
    expect(chatHistoryEl).to.not.equal(null);

    const chatboxDiv = chat.shadowRoot.querySelector(
      '.chatbox'
    ) as HTMLDivElement;
    expect(chatboxDiv).to.equal(null);

    const reopenButton = chat.shadowRoot.querySelector(
      'temba-button#reopen-button'
    ) as HTMLDivElement;
    expect(reopenButton).to.equal(null);

    await assertScreenshot(
      'contacts/contact-archived-ticket-closed-hide-chatbox',
      getClip(chat)
    );
  });
});
