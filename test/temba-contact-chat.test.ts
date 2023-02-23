import { expect } from '@open-wc/testing';
import { useFakeTimers } from 'sinon';
import { Button } from '../src/button/Button';
import { Attachment, Compose } from '../src/compose/Compose';
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
import {
  getFailText,
  getSuccessFiles,
  getSuccessText,
  updateComponent,
} from './temba-compose.test';

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

describe('temba-contact-chat - contact tests - handle send tests - text no attachments', () => {
  beforeEach(() => {
    //todo
  });
  afterEach(() => {
    //todo
  });

  it('with text no attachments - success', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active',
    });
    const compose = chat.shadowRoot.querySelector('temba-compose') as Compose;
    await updateComponent(compose, getSuccessText());

    const response_body = {
      contacts: [{ uuid: 'contact-dave-active', name: 'Dave Matthews' }],
      text: { eng: 'sà-wàd-dee!' },
      attachments: { eng: [] },
    };
    mockPOST(/api\/v2\/broadcasts\.json/, response_body);

    const send = compose.shadowRoot.querySelector(
      'temba-button#send-button'
    ) as Button;
    send.click();

    await assertScreenshot(
      'contacts/compose-text-no-attachments-success',
      getClip(chat)
    );
  });

  it('with text no attachments - failure - more than 640 chars', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active',
    });
    const compose = chat.shadowRoot.querySelector('temba-compose') as Compose;
    // set the chatbox to a string that is 640+ chars
    await updateComponent(compose, getFailText());

    const response_body = {
      text: ['Text must have no more than 640 characters.'],
    };
    const response_headers = {};
    const response_status = '401';
    mockPOST(
      /api\/v2\/broadcasts\.json/,
      response_body,
      response_headers,
      response_status
    );

    const send = compose.shadowRoot.querySelector(
      'temba-button#send-button'
    ) as Button;
    send.click();

    await assertScreenshot(
      'contacts/compose-text-no-attachments-failure',
      getClip(chat)
    );
  });
});

describe('temba-contact-chat - contact tests - handle send tests - attachments no text', () => {
  beforeEach(() => {
    //todo
  });
  afterEach(() => {
    //todo
  });

  it('with attachments no text - success', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active',
    });
    const compose = chat.shadowRoot.querySelector('temba-compose') as Compose;
    const attachments = getSuccessFiles();
    await updateComponent(compose, null, attachments);
    const response_body = {
      contacts: [{ uuid: 'contact-dave-active', name: 'Dave Matthews' }],
      text: { eng: '' },
      attachments: { eng: attachments },
    };
    const response_headers = {};
    const response_status = '200';
    mockPOST(
      /api\/v2\/broadcasts\.json/,
      response_body,
      response_headers,
      response_status
    );

    const send = compose.shadowRoot.querySelector(
      'temba-button#send-button'
    ) as Button;
    send.click();

    await assertScreenshot(
      'contacts/compose-attachments-no-text-success',
      getClip(chat)
    );
  });
  it('with attachments no text - failure - more than 10 items', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active',
    });
    const compose = chat.shadowRoot.querySelector('temba-compose') as Compose;
    // set the attachments to a list that is 10+ items
    await updateComponent(compose, null, getSuccessFiles(11));

    const response_body = {
      attachments: ['Attachments must have no more than 10 items.'],
    };
    const response_headers = {};
    const response_status = '401';
    mockPOST(
      /api\/v2\/broadcasts\.json/,
      response_body,
      response_headers,
      response_status
    );

    const send = compose.shadowRoot.querySelector(
      'temba-button#send-button'
    ) as Button;
    send.click();

    await assertScreenshot(
      'contacts/compose-attachments-no-text-failure',
      getClip(chat)
    );
  });
});

describe('temba-contact-chat - contact tests - handle send tests - text and attachments', () => {
  beforeEach(() => {
    //todo
  });
  afterEach(() => {
    //todo
  });

  it('with text and attachments - success', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active',
    });
    const compose = chat.shadowRoot.querySelector('temba-compose') as Compose;
    await updateComponent(compose, getSuccessText(), getSuccessFiles());

    const text = getSuccessText();
    const attachments = getSuccessFiles();
    const response_body = {
      contacts: [{ uuid: 'contact-dave-active', name: 'Dave Matthews' }],
      text: { eng: text },
      attachments: { eng: attachments },
    };
    mockPOST(/api\/v2\/broadcasts\.json/, response_body);

    const send = compose.shadowRoot.querySelector(
      'temba-button#send-button'
    ) as Button;
    send.click();

    await assertScreenshot(
      'contacts/compose-text-and-attachments-success',
      getClip(chat)
    );
  });

  it('with text and attachments - failure - more than 640 chars', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active',
    });
    const compose = chat.shadowRoot.querySelector('temba-compose') as Compose;
    // set the chatbox to a string that is 640+ chars
    await updateComponent(compose, getFailText(), getSuccessFiles());

    const response_body = {
      text: ['Text must have no more than 640 characters.'],
    };
    const response_headers = {};
    const response_status = '401';
    mockPOST(
      /api\/v2\/broadcasts\.json/,
      response_body,
      response_headers,
      response_status
    );

    const send = compose.shadowRoot.querySelector(
      'temba-button#send-button'
    ) as Button;
    send.click();

    await assertScreenshot(
      'contacts/compose-text-and-attachments-failure-text',
      getClip(chat)
    );
  });

  it('with text and attachments - failure - more than 10 items', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active',
    });
    const compose = chat.shadowRoot.querySelector('temba-compose') as Compose;
    // set the attachments to a list that is 10+ items
    await updateComponent(compose, getSuccessText(), getSuccessFiles(11));

    const response_body = {
      attachments: ['Attachments must have no more than 10 items.'],
    };
    const response_headers = {};
    const response_status = '401';
    mockPOST(
      /api\/v2\/broadcasts\.json/,
      response_body,
      response_headers,
      response_status
    );

    const send = compose.shadowRoot.querySelector(
      'temba-button#send-button'
    ) as Button;
    send.click();

    await assertScreenshot(
      'contacts/compose-text-and-attachments-failure-attachments',
      getClip(chat)
    );
  });

  it('with text and attachments - failure - more than 640 chars and more than 10 items', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active',
    });
    const compose = chat.shadowRoot.querySelector('temba-compose') as Compose;
    // set the chatbox to a string that is 640+ chars
    // set the attachments to a list that is 10+ items
    await updateComponent(compose, getFailText(), getSuccessFiles(11));

    const response_body = {
      text: ['Text must have no more than 640 characters.'],
    };
    const response_headers = {};
    const response_status = '401';
    mockPOST(
      /api\/v2\/broadcasts\.json/,
      response_body,
      response_headers,
      response_status
    );

    const send = compose.shadowRoot.querySelector(
      'temba-button#send-button'
    ) as Button;
    send.click();

    await assertScreenshot(
      'contacts/compose-text-and-attachments-failure-text-and-attachments',
      getClip(chat)
    );
  });

  it('with text and attachments - failure - generic', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active',
    });
    const compose = chat.shadowRoot.querySelector('temba-compose') as Compose;
    await updateComponent(compose, getSuccessText(), getSuccessFiles());

    const response_body = {};
    const response_headers = {};
    const response_status = '500';
    mockPOST(
      /api\/v2\/broadcasts\.json/,
      response_body,
      response_headers,
      response_status
    );

    const send = compose.shadowRoot.querySelector(
      'temba-button#send-button'
    ) as Button;
    send.click();

    await assertScreenshot(
      'contacts/compose-text-and-attachments-failure-generic',
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
