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

// TODO clarify if this is needed for creating a chatbox
// with a notion of both contacts and tickets
// const getTicketChat = async (attrs: any = {}) => {
//   attrs['endpoint'] = '/test-assets/tickets/';

//   // add some sizes and styles to force our chat history to scroll
//   const chat = (await getComponent(
//     TAG,
//     attrs,
//     '',
//     500,
//     500,
//     'display:flex;flex-direction:column;flex-grow:1;min-height:0;'
//   )) as ContactChat;

//   // wait for our contact to load
//   await delay(100);

//   return chat;
// };

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

  it('show chat history if contact is active', async () => {
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

  it('show chatbox if contact is active', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active',
    });

    const chatboxDivEl = chat.shadowRoot.querySelector(
      '.chatbox'
    ) as HTMLDivElement;
    expect(chatboxDivEl).to.not.equal(null);

    const reactivateButton = chat.shadowRoot.querySelector(
      'temba-button#reactivate-button'
    ) as HTMLDivElement;
    expect(reactivateButton).to.equal(null);

    const reopenButton = chat.shadowRoot.querySelector(
      'temba-button#reopen-button'
    ) as HTMLDivElement;
    expect(reopenButton).to.equal(null);

    await assertScreenshot(
      'contacts/contact-active-show-chatbox',
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

  it('show reactivate button if contact is archived', async () => {
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

    const reopenButton = chat.shadowRoot.querySelector(
      'temba-button#reopen-button'
    ) as HTMLDivElement;
    expect(reopenButton).to.equal(null);

    await assertScreenshot(
      'contacts/contact-archived-show-reactivate-button',
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

  it('show reactivate button if contact is blocked', async () => {
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

    const reopenButton = chat.shadowRoot.querySelector(
      'temba-button#reopen-button'
    ) as HTMLDivElement;
    expect(reopenButton).to.equal(null);

    await assertScreenshot(
      'contacts/contact-blocked-show-reactivate-button',
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

  it('show reactivate button if contact is stopped', async () => {
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

    const reopenButton = chat.shadowRoot.querySelector(
      'temba-button#reopen-button'
    ) as HTMLDivElement;
    expect(reopenButton).to.equal(null);

    await assertScreenshot(
      'contacts/contact-stopped-show-reactivate-button',
      getClip(chat)
    );
  });

  // it('show chatbox if contact is active and ticket is open', async () => {
  //   // we are a StoreElement, so load a store first
  //   await loadStore();
  //   const chat: ContactChat = await getTicketChat({
  //     ticket: 'tickets-dave-active',
  //   });

  //   const chatboxDiv = chat.shadowRoot.querySelector(
  //     '.chatbox'
  //   ) as HTMLDivElement;
  //   expect(chatboxDiv).to.not.equal(null);

  //   const reactivateButton = chat.shadowRoot.querySelector(
  //     'temba-button#reactivate-button'
  //   ) as HTMLDivElement;
  //   expect(reactivateButton).to.equal(null);

  //   const reopenButton = chat.shadowRoot.querySelector(
  //     'temba-button#reopen-button'
  //   ) as HTMLDivElement;
  //   expect(reopenButton).to.equal(null);

  //   await assertScreenshot(
  //     'contacts/contact-active-ticket-open-show-chatbox',
  //     getClip(chat)
  //   );
  // });

  // it('show reopen button if contact is active and ticket is closed', async () => {
  //     // we are a StoreElement, so load a store first
  //     await loadStore();
  //     const chat: ContactChat = await getTicketChat({
  //       ticket: 'tickets-dave-active',
  //     });

  //     chat.currentTicket.uuid = "31e48a8e-ed79-4bf0-9aa7-5f84b92853c7"
  //     chat.refresh();

  //     const chatboxDiv = chat.shadowRoot.querySelector(
  //       '.chatbox'
  //     ) as HTMLDivElement;
  //     expect(chatboxDiv).to.equal(null);

  //     const reactivateButton = chat.shadowRoot.querySelector(
  //       'temba-button#reactivate-button'
  //     ) as HTMLDivElement;
  //     expect(reactivateButton).to.equal(null);

  //     const reopenButton = chat.shadowRoot.querySelector(
  //       'temba-button#reopen-button'
  //     ) as HTMLDivElement;
  //     expect(reopenButton).to.not.equal(null);

  //     await assertScreenshot(
  //       'contacts/contact-active-ticket-closed-show-reopen-button',
  //       getClip(chat)
  //     );
  // });

  // it('hide chatbox if contact is archived and ticket is closed', async () => {
  //     // we are a StoreElement, so load a store first
  //     await loadStore();
  //     const chat: ContactChat = await getTicketChat({
  //       ticket: 'tickets-barack-archived',
  //     });

  //     chat.currentTicket.uuid = "bc907086-e9e7-4d5c-ba72-ef6a2059b0ae"
  //     chat.refresh();

  //     const chatboxDiv = chat.shadowRoot.querySelector(
  //       '.chatbox'
  //     ) as HTMLDivElement;
  //     expect(chatboxDiv).to.equal(null);

  //     const reactivateButton = chat.shadowRoot.querySelector(
  //       'temba-button#reactivate-button'
  //     ) as HTMLDivElement;
  //     expect(reactivateButton).to.equal(null);

  //     const reopenButton = chat.shadowRoot.querySelector(
  //       'temba-button#reopen-button'
  //     ) as HTMLDivElement;
  //     expect(reopenButton).to.equal(null);

  //     await assertScreenshot(
  //       'contacts/contact-archived-ticket-closed-hide-chatbox',
  //       getClip(chat)
  //     );
  // });

  // // for the case when a contact is active and has
  // // 0 open and 1+ closed tickets OR 1+ open and 0 closed tickets
  // // and the user is viewing the ticket list containing 0 tickets
  // it('hide chatbox if contact is active and list contains 0 tickets', async () => {
  //     // we are a StoreElement, so load a store first
  //     await loadStore();
  //     const chat: ContactChat = await getTicketChat({
  //       ticket: 'tickets-carter-active',
  //     });

  //     chat.contact = null;
  //     chat.currentContact = null;
  //     chat.currentTicket = null;
  //     chat.refresh();

  //     const chatboxDiv = chat.shadowRoot.querySelector(
  //       '.chatbox'
  //     ) as HTMLDivElement;
  //     expect(chatboxDiv).to.equal(null);

  //     const reactivateButton = chat.shadowRoot.querySelector(
  //       'temba-button#reactivate-button'
  //     ) as HTMLDivElement;
  //     expect(reactivateButton).to.equal(null);

  //     const reopenButton = chat.shadowRoot.querySelector(
  //       'temba-button#reopen-button'
  //     ) as HTMLDivElement;
  //     expect(reopenButton).to.equal(null);

  //     await assertScreenshot(
  //       'contacts/contact-archived-0-tickets-hide-chatbox',
  //       getClip(chat)
  //     );
  // });
});
