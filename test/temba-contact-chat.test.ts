import { expect } from '@open-wc/testing';
import { useFakeTimers } from 'sinon';
import { ContactChat } from '../src/contacts/ContactChat';
import { ContactHistory } from '../src/contacts/ContactHistory';
import { CustomEventType } from '../src/interfaces';
import { TicketList } from '../src/list/TicketList';
import {
  assertScreenshot,
  getClip,
  getComponent,
  loadStore,
  mockGET,
  mockNow,
  mockPOST,
} from '../test/utils.test';

let clock: any;
mockNow('2021-03-31T00:31:00.000-00:00');

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

  // TODO: this should be waiting for an event instead
  await waitFor(100);
  return chat;
};

const list_TAG = 'temba-list';
const getTicketList = async (attrs: any = {}) => {
  const list = (await getComponent(list_TAG, attrs)) as TicketList;

  if (!list.endpoint) {
    return list;
  }

  return new Promise<TicketList>(resolve => {
    list.addEventListener(
      CustomEventType.FetchComplete,
      async () => {
        resolve(list);
      },
      { once: true }
    );
  });
};

describe('temba-contact-chat - contact tests', () => {
  // map requests for contact history to our static files
  // we'll just us the same historylist for everybody for now
  beforeEach(() => {
    mockGET(
      /\/contact\/history\/contact-.*/,
      '/test-assets/contacts/history.json'
    );
    clock = useFakeTimers();
  });

  afterEach(function () {
    clock.restore();
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
    expect(chatHistoryEl).to.not.equal(null, 'Chat history missing');

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

// handleSend success responses
// with text, no attachments
// no text, with attachments
// with text and no attachments

// handleSend fail responses
// text contains more than 640 chars
// attachments contain more than 10+ items
// text contains more than 640 chars AND attachments contain more than 10+ items
// generic error

describe('temba-contact-chat - contact tests - handle send tests - text no attachments', () => {
  it('with text no attachments - success response', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active',
    });

    const data = { text: { eng: 'blah' }, attachments: { eng: [] } };
    mockPOST(
      /api\/v2\/broadcasts\.json\?payload=\/test-assets\/compose\/compose-text-no-attachments-success/,
      data
    );
  });
  it('with text no attachments - failure response', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active',
    });

    const data = {
      text: ['Translations must have no more than 640 characters.'],
    };
    mockPOST(
      /api\/v2\/broadcasts\.json\?payload=\/test-assets\/compose\/compose-text-no-attachments-failure/,
      data
    );
  });
});

describe('temba-contact-chat - contact tests - handle send tests - attachments no text', () => {
  it('with attachments no text - success response', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active',
    });

    // todo
    // const data = {"text":{"eng":""},"attachments":{"eng":[]}}
    // mockPOST(/api\/v2\/broadcasts\.json\?payload=\/test-assets\/compose\/compose-attachments-no-text-success/, data);
    expect(true).equals(false);
  });
  it('with attachments no text - failure response', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active',
    });

    // todo
    // const data = {"text":{"eng":""},"attachments":{"eng":[]}}
    // mockPOST(/api\/v2\/broadcasts\.json\?payload=\/test-assets\/compose\/compose-attachments-no-text-failure/, data);
    expect(true).equals(false);
  });
});

describe('temba-contact-chat - contact tests - handle send tests - text and attachments', () => {
  it('with text and attachments - success response', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active',
    });

    // todo
    // const data = {"text":{"eng":""},"attachments":{"eng":[]}}
    // mockPOST(/api\/v2\/broadcasts\.json\?payload=\/test-assets\/compose\/compose-text-and-attachments-success/, data);
    expect(true).equals(false);
  });
  it('with text and attachments - failure response due to text', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active',
    });

    const data = {
      text: ['Translations must have no more than 640 characters.'],
    };
    mockPOST(
      /api\/v2\/broadcasts\.json\?payload=\/test-assets\/compose\/compose-text-and-attachments-failure-text/,
      data
    );
  });
  it('with text and attachments - failure response due to attachments', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active',
    });

    // todo
    // const data = {"text":{"eng":""},"attachments":{"eng":[]}}
    // mockPOST(/api\/v2\/broadcasts\.json\?payload=\/test-assets\/compose\/compose-text-and-attachments-failure-attachments/, data);
    expect(true).equals(false);
  });
  it('with text and attachments - failure response due to both', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active',
    });

    // todo
    // const data = {"text":{"eng":""},"attachments":{"eng":[]}}
    // mockPOST(/api\/v2\/broadcasts\.json\?payload=\/test-assets\/compose\/compose-text-and-attachments-failure-all/, data);
    expect(true).equals(false);
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

    mockGET(/\/api\/v2\/tickets\.json.*/, '/test-assets/tickets/empty.json');
    clock = useFakeTimers();
  });

  afterEach(function () {
    clock.restore();
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
      getClip(chat),
      {
        clock: clock,
        predicate: () => {
          return chat.getContactHistory().getEventsPane().scrollTop === 1004;
        },
      }
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
      getClip(chat),
      {
        clock: clock,
        predicate: () => {
          return chat.getContactHistory().getEventsPane().scrollTop === 921;
        },
      }
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
      getClip(chat),
      {
        clock: clock,
        predicate: () => {
          return chat.getContactHistory().getEventsPane().scrollTop === 870;
        },
      }
    );
  });
});
