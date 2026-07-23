import { SinonStub, useFakeTimers } from 'sinon';
import { Compose } from '../src/form/Compose';
import { ContactChat } from '../src/live/ContactChat';
import { setSocketProvider, SocketProvider } from '../src/live/SocketService';
import { Attachment, CustomEventType } from '../src/interfaces';
import {
  assertScreenshot,
  clearMockPosts,
  getClip,
  getComponent,
  getValidAttachments,
  getValidText,
  loadStore,
  mockAPI,
  mockGET,
  mockNow,
  mockPOST,
  MockSocketProvider,
  updateComponent
} from '../test/utils.test';

import { expect, oneEvent } from '@open-wc/testing';

let clock: any;

let mockSocket: MockSocketProvider;
let previousSocketProvider: SocketProvider;

const TAG = 'temba-contact-chat';

// polls with short real sleeps (so mocked HTTP roundtrips can complete) while
// advancing fake timers, until the predicate holds
const settle = async (
  predicate: () => boolean,
  tickMs = 0,
  maxAttempts = 400
) => {
  for (let i = 0; i < maxAttempts; i++) {
    await waitFor(10);
    clock.tick(tickMs);
    if (predicate()) {
      return;
    }
  }
  throw new Error('Condition not met while settling');
};

// the contact and its history have loaded and rendered
const chatLoaded = (chat: ContactChat) => {
  const inner = chat.shadowRoot.querySelector('temba-chat') as any;
  return !!(
    chat.currentContact &&
    inner &&
    !inner.fetching &&
    inner.messageGroups.length > 0
  );
};

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

  // wait for contact data and history to load (real HTTP), flushing fake
  // timers so addMessages' setTimeout(fn, 0) fires
  await settle(() => chatLoaded(chat));
  return chat;
};

const getResponseSuccessFiles = (attachments: Attachment[]) => {
  const response_attachments = attachments.map((attachment) => {
    return { content_type: attachment.content_type, url: attachment.url };
  });
  return response_attachments;
};

describe('temba-contact-chat', () => {
  let mockedNow: SinonStub;
  // map requests for contact history to our static files
  // we'll just us the same historylist for everybody for now
  beforeEach(() => {
    mockedNow = mockNow('2021-03-31T00:31:00.000-00:00');
    clearMockPosts();

    // the catch-up fetch on subscribe (after=) finds nothing new - without
    // this it races the initial history fetch for the same page of events and
    // the rendered grouping depends on which one lands first
    mockGET(/\/contact\/chat\/contact-.*\?after=/, { events: [], next: null });
    mockGET(
      /\/contact\/chat\/contact-.*/,
      '/test-assets/contacts/history.json'
    );

    mockGET(
      /\/api\/v2\/users\.json\?email=admin1%40nyaruka\.com/,
      '/test-assets/api/users/admin1.json'
    );

    mockAPI();
    clock = useFakeTimers();

    mockSocket = new MockSocketProvider();
    previousSocketProvider = setSocketProvider(mockSocket);
  });

  afterEach(function () {
    clock.restore();
    mockedNow.restore();
    setSocketProvider(previousSocketProvider);
  });

  it('show history and show chatbox if contact is active', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active',
      showMessageLogsAfter: '2025-01-01T00:00:00.000Z'
    });

    await assertScreenshot('contacts/chat-for-active-contact', getClip(chat));
  });

  it('show history and hide chatbox if contact is archived', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-barack-archived',
      showMessageLogsAfter: '2025-01-01T00:00:00.000Z'
    });

    await assertScreenshot('contacts/chat-for-archived-contact', getClip(chat));
  });

  it('show history and hide chatbox if contact is blocked', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-michelle-blocked'
    });

    await assertScreenshot('contacts/chat-for-blocked-contact', getClip(chat));
  });

  it('reloads history when the same contact is set again after clearing', async () => {
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-barack-archived'
    });
    expect(chat.currentContact).to.not.be.null;

    // dismissing the chat (mobile back) clears everything
    chat.contact = null;
    chat.currentTicket = null;
    chat.currentContact = null;
    await chat.updateComplete;
    expect(chat.data, 'data should clear with the contact').to.be.null;

    // re-selecting the same ticket sets the same contact again
    chat.contact = 'contact-barack-archived';
    await settle(() => chatLoaded(chat));

    expect(chat.currentContact, 'contact should reload').to.not.be.null;
    const inner = chat.shadowRoot.querySelector('temba-chat') as any;
    expect(inner.messageGroups.length).to.be.greaterThan(0);
  });

  it('show history and hide chatbox if contact is stopped', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-tim-stopped'
    });

    await assertScreenshot('contacts/chat-for-stopped-contact', getClip(chat));
  });

  it('keeps flow footer from blocking scrollbar drag interactions', async () => {
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active'
    });

    const flowFooter = chat.shadowRoot.querySelector(
      '.flow-footer'
    ) as HTMLElement;
    const inFlow = flowFooter.querySelector('.in-flow') as HTMLElement;

    expect(flowFooter).to.exist;
    expect(inFlow).to.exist;
    expect(getComputedStyle(flowFooter).pointerEvents).to.equal('none');
    expect(getComputedStyle(inFlow).pointerEvents).to.equal('auto');
  });

  it('sends text without attachments', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active'
    });
    const compose = chat.shadowRoot.querySelector('temba-compose') as Compose;
    const text = getValidText();
    await updateComponent(compose, text);

    const response_body = {
      event: {
        uuid: 'msg-uuid',
        contact: { uuid: 'contact-dave-active', name: 'Dave Matthews' },
        msg: {
          text: text,
          attachments: []
        }
      }
    };
    mockPOST(/contact\/chat\/contact-dave-active\//, response_body);

    const listener = oneEvent(compose, CustomEventType.Submitted, false);
    await typeInto('temba-contact-chat:temba-compose', text, true, true);
    expect(await listener).to.exist;

    await assertScreenshot('contacts/chat-sends-text-only', getClip(chat));
  });

  it('sends attachments without text', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active'
    });
    const compose = chat.shadowRoot.querySelector('temba-compose') as Compose;
    const attachments = getValidAttachments();
    await updateComponent(compose, null, attachments);
    const response_attachments = getResponseSuccessFiles(attachments);
    const response_body = {
      event: {
        uuid: 'msg-uuid',
        contact: { uuid: 'contact-dave-active', name: 'Dave Matthews' },
        msg: {
          text: '',
          attachments: response_attachments
        }
      }
    };
    const response_headers = {};
    const response_status = '200';
    mockPOST(
      /contact\/chat\/contact-dave-active\//,
      response_body,
      response_headers,
      response_status
    );

    const listener = oneEvent(compose, CustomEventType.Submitted, false);
    await typeInto('temba-contact-chat:temba-compose', '', false, true);
    expect(await listener).to.exist;

    await assertScreenshot(
      'contacts/chat-sends-attachments-only',
      getClip(chat)
    );
  });

  it('sends text with attachments', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active'
    });
    const compose = chat.shadowRoot.querySelector('temba-compose') as Compose;
    const text = getValidText();
    const attachments = getValidAttachments();
    await updateComponent(compose, text, attachments);
    const response_attachments = getResponseSuccessFiles(attachments);
    const response_body = {
      event: {
        uuid: 'msg-uuid',
        contact: { uuid: 'contact-dave-active', name: 'Dave Matthews' },
        msg: {
          text,
          attachments: response_attachments
        }
      }
    };
    mockPOST(/contact\/chat\/contact-dave-active\//, response_body);

    // press enter
    const listener = oneEvent(compose, CustomEventType.Submitted, false);
    await typeInto('temba-contact-chat:temba-compose', '', false, true);
    expect(await listener).to.exist;

    await assertScreenshot(
      'contacts/chat-sends-text-and-attachments',
      getClip(chat)
    );
  });

  it('shows failure message with retry', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active'
    });
    const compose = chat.shadowRoot.querySelector('temba-compose') as Compose;
    await updateComponent(compose, getValidText(), getValidAttachments());

    const response_body = {};
    const response_headers = {};
    const response_status = '500';
    mockPOST(
      /api\/v2\/messages\.json/,
      response_body,
      response_headers,
      response_status
    );

    // press
    const listener = oneEvent(compose, CustomEventType.Submitted, false);
    await typeInto('temba-contact-chat:temba-compose', '', false, true);
    expect(await listener).to.exist;

    await assertScreenshot('contacts/chat-failure', getClip(chat));
  });

  it('hides search toggle when showSearch is not set', async () => {
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active'
    });

    const searchToggle = chat.shadowRoot.querySelector(
      '.search-toggle'
    ) as HTMLElement;
    expect(searchToggle).to.not.exist;

    await assertScreenshot('contacts/chat-no-search', getClip(chat));
  });

  it('searches messages and shows results', async () => {
    await loadStore();

    // mock the search endpoint to return results for "primus"
    mockGET(
      /\/contact\/chat_search\/.*\?text=primus/,
      '/test-assets/contacts/chat-search-primus.json'
    );

    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active',
      showSearch: true
    });

    // click the search toggle button
    const searchToggle = chat.shadowRoot.querySelector(
      '.search-toggle'
    ) as HTMLElement;
    expect(searchToggle).to.exist;
    searchToggle.click();

    // wait for search mode to activate, the input to render and the 150ms
    // slide-in animation (real time) to finish
    await waitFor(200);
    clock.tick(100);
    await chat.updateComplete;

    await assertScreenshot('contacts/chat-search-open', getClip(chat));

    // type "primus" into the search input
    const textInput = chat.shadowRoot.querySelector('.search-input') as any;
    expect(textInput).to.exist;
    textInput.value = 'primus';
    textInput.dispatchEvent(new Event('input', { bubbles: true }));
    await chat.updateComplete;

    // trigger search via the same UI action users use
    const searchGo = chat.shadowRoot.querySelector('.search-go') as HTMLElement;
    expect(searchGo).to.exist;
    searchGo.click();

    // wait for the search API response and results to load
    await settle(
      () => chat.searchResults && chat.searchResults.length > 0,
      50,
      30
    );

    expect(chat.searchResults.length).to.equal(2);
    expect(chat.searchIndex).to.equal(0);

    // wait for the navigation to settle (fade out + load + fade in), then
    // give the 150ms opacity transition (real time) room to finish
    const inner = chat.shadowRoot.querySelector('temba-chat') as any;
    await settle(() => inner.style.opacity === '1', 50, 30);
    await waitFor(200);
    await chat.updateComplete;

    await assertScreenshot('contacts/chat-search-result', getClip(chat));
  });

  it('shows no results message when search has no matches', async () => {
    await loadStore();

    // mock the search endpoint to return empty results
    mockGET(
      /\/contact\/chat_search\/.*\?text=xyznotfound/,
      '/test-assets/contacts/chat-search-empty.json'
    );

    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active',
      showSearch: true
    });

    // open search mode
    const searchToggle = chat.shadowRoot.querySelector(
      '.search-toggle'
    ) as HTMLElement;
    searchToggle.click();
    // include real time for the 150ms slide-in animation before screenshots
    await waitFor(200);
    clock.tick(100);
    await chat.updateComplete;

    // type a query with no matches
    const textInput = chat.shadowRoot.querySelector('.search-input') as any;
    textInput.value = 'xyznotfound';
    textInput.dispatchEvent(new Event('input', { bubbles: true }));
    await chat.updateComplete;

    // trigger search via the same UI action users use
    const searchGo = chat.shadowRoot.querySelector('.search-go') as HTMLElement;
    expect(searchGo).to.exist;
    searchGo.click();

    // wait for the search API response
    await settle(() => chat.searchNoResults, 50, 30);
    await chat.updateComplete;

    expect(chat.searchResults.length).to.equal(0);
    expect(chat.searchNoResults).to.be.true;

    await assertScreenshot('contacts/chat-search-no-results', getClip(chat));
  });

  it('subscribes to the contact history channel', async () => {
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active'
    });

    expect(mockSocket.activeChannels()).to.deep.equal([
      `history:${chat.currentContact.uuid}`
    ]);
  });

  it('renders events published on the socket', async () => {
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active'
    });

    const eventUUID = '01998888-0000-7000-8000-000000000001';
    mockSocket.publish(`history:${chat.currentContact.uuid}`, {
      uuid: eventUUID,
      type: 'msg_received',
      created_on: '2025-09-25T12:00:00.000000+00:00',
      msg: {
        urn: 'tel:+250788123123',
        text: 'hello over the socket',
        channel: { uuid: '8a81e9e0-10a0-4319-9b00-ce723cfa8303', name: 'SMS' }
      }
    });

    // flush the render timeouts in addMessages
    const tembaChat = chat.shadowRoot.querySelector('temba-chat');
    await settle(
      () =>
        !!tembaChat.shadowRoot.querySelector(`.row[data-uuid="${eventUUID}"]`),
      50,
      10
    );
    await chat.updateComplete;

    // the event was ingested and is now our newest seen event
    expect(chat.afterUUID).to.equal(eventUUID);

    // and it rendered in the chat
    const row = tembaChat.shadowRoot.querySelector(
      `.row[data-uuid="${eventUUID}"]`
    );
    expect(row).to.exist;
  });

  it('ignores socket events while searching', async () => {
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active',
      showSearch: true
    });

    // enter search mode
    const searchToggle = chat.shadowRoot.querySelector(
      '.search-toggle'
    ) as HTMLElement;
    searchToggle.click();
    await waitFor(10);
    clock.tick(100);
    await chat.updateComplete;

    const before = chat.afterUUID;
    mockSocket.publish(`history:${chat.currentContact.uuid}`, {
      uuid: '01998888-0000-7000-8000-000000000002',
      type: 'msg_received',
      created_on: '2025-09-25T12:00:00.000000+00:00',
      msg: { text: 'should be ignored' }
    });

    expect(chat.afterUUID).to.equal(before);
  });

  it('keeps the contact channel subscribed across ticket changes', async () => {
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active'
    });

    const contactChannel = `history:${chat.currentContact.uuid}`;
    expect(mockSocket.activeChannels()).to.deep.equal([contactChannel]);
    const contactSub = mockSocket.subs[0];

    const makeTicket = (uuid: string) =>
      ({
        uuid,
        topic: { uuid: 'topic-1', name: 'General' },
        assignee: null,
        closed_on: null
      }) as any;

    chat.currentTicket = makeTicket('ticket-1');
    await chat.updateComplete;
    expect(mockSocket.activeChannels()).to.deep.equal([
      contactChannel,
      `${contactChannel}:ticket-1`
    ]);

    chat.currentTicket = makeTicket('ticket-2');
    await chat.updateComplete;
    expect(mockSocket.activeChannels()).to.deep.equal([
      contactChannel,
      `${contactChannel}:ticket-2`
    ]);

    // the contact subscription was never torn down along the way
    expect(contactSub.unsubscribed).to.be.false;
  });

  it('never pairs a ticket with the previous contact during a contact switch', async () => {
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active'
    });

    const makeTicket = (uuid: string) =>
      ({
        uuid,
        topic: { uuid: 'topic-1', name: 'General' },
        assignee: null,
        closed_on: null
      }) as any;

    chat.currentTicket = makeTicket('ticket-dave');
    await chat.updateComplete;
    expect(mockSocket.activeChannels()).to.deep.equal([
      'history:contact-dave-active',
      'history:contact-dave-active:ticket-dave'
    ]);

    // the agent clicks a ticket for a different contact - the new ticket is
    // set synchronously while the new contact is still fetching
    chat.contact = 'contact-barack-archived';
    chat.currentTicket = makeTicket('ticket-barack');
    await chat.updateComplete;

    // the ticket channel is held back until the contact catches up
    expect(mockSocket.activeChannels()).to.deep.equal([
      'history:contact-dave-active'
    ]);

    // let the contact fetch land
    await settle(() => chat.currentContact?.uuid === 'contact-barack-archived');
    await chat.updateComplete;

    expect(mockSocket.activeChannels()).to.deep.equal([
      'history:contact-barack-archived',
      'history:contact-barack-archived:ticket-barack'
    ]);

    // at no point was the new ticket paired with the old contact
    const mismatched = mockSocket.subs.filter(
      (sub) => sub.channel === 'history:contact-dave-active:ticket-barack'
    );
    expect(mismatched).to.be.empty;
  });

  it('fills in missing user avatars from the store cache', async () => {
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active'
    });

    const channel = `history:${chat.currentContact.uuid}`;
    const userUUID = 'aaaa1111-0000-4000-8000-000000000001';

    // a hydrated event seeds the avatar cache
    mockSocket.publish(channel, {
      uuid: '01998888-0000-7000-8000-000000000003',
      type: 'ticket_note_added',
      created_on: '2025-09-25T12:00:00.000000+00:00',
      note: 'first note',
      _user: {
        uuid: userUUID,
        name: 'Ann Admin',
        avatar: '/media/avatars/ann.jpg'
      }
    });

    // an unhydrated ref for the same user gets the cached avatar
    const unhydrated = {
      uuid: '01998888-0000-7000-8000-000000000004',
      type: 'ticket_note_added',
      created_on: '2025-09-25T12:01:00.000000+00:00',
      note: 'second note',
      _user: { uuid: userUUID, name: 'Ann Admin' }
    };
    mockSocket.publish(channel, unhydrated);

    expect(unhydrated._user['avatar']).to.equal('/media/avatars/ann.jpg');
  });

  it('unsubscribes when removed from the page', async () => {
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active'
    });

    expect(mockSocket.activeChannels().length).to.equal(1);
    chat.remove();
    expect(mockSocket.activeChannels().length).to.equal(0);
  });

  const getTembaChat = (chat: ContactChat) =>
    chat.shadowRoot.querySelector('temba-chat') as any;

  const getTypingRow = async (chat: ContactChat) => {
    const tembaChat = getTembaChat(chat);
    await tembaChat.updateComplete;
    return tembaChat.shadowRoot.querySelector('.row.typing');
  };

  const serverTyping = (
    chat: ContactChat,
    type: string,
    user = { uuid: 'user-bob', name: 'Bob' }
  ) => {
    mockSocket.serverPublish(`history:${chat.currentContact.uuid}`, {
      uuid: `01998888-0000-7000-8000-00000000${
        type === 'typing_started' ? '1111' : '2222'
      }`,
      type,
      created_on: '2025-09-25T12:00:00.000000+00:00',
      _user: user,
      direction: 'outgoing'
    });
  };

  const setComposeText = async (chat: ContactChat, text: string) => {
    const compose = chat.shadowRoot.querySelector('temba-compose');
    compose.dispatchEvent(
      new CustomEvent(CustomEventType.ContentChanged, {
        detail: { und: { text } }
      })
    );
    // let publish promises settle
    await waitFor(1);
  };

  it('shows and clears a typing indicator from socket typing events', async () => {
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active'
    });

    serverTyping(chat, 'typing_started');
    expect(await getTypingRow(chat)).to.exist;

    serverTyping(chat, 'typing_stopped');
    expect(await getTypingRow(chat)).to.not.exist;
  });

  it('shows and clears contact typing with no user attached', async () => {
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active'
    });
    const channel = `history:${chat.currentContact.uuid}`;

    // contact typing events arrive with a direction but no _user
    mockSocket.serverPublish(channel, {
      uuid: '01998888-0000-7000-8000-000000004444',
      type: 'typing_started',
      created_on: '2025-09-25T12:00:00.000000+00:00',
      direction: 'incoming'
    });
    expect(await getTypingRow(chat)).to.exist;

    mockSocket.serverPublish(channel, {
      uuid: '01998888-0000-7000-8000-000000005555',
      type: 'typing_stopped',
      created_on: '2025-09-25T12:00:01.000000+00:00',
      direction: 'incoming'
    });
    expect(await getTypingRow(chat)).to.not.exist;
  });

  it('decays a typing indicator without fresh pulses', async () => {
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active'
    });

    serverTyping(chat, 'typing_started');
    expect(await getTypingRow(chat)).to.exist;

    clock.tick(10001);
    expect(await getTypingRow(chat)).to.not.exist;
  });

  it('ignores echoes of our own typing events', async () => {
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active',
      user: 'user-me'
    });

    serverTyping(chat, 'typing_started', { uuid: 'user-me', name: 'Me' });
    expect(await getTypingRow(chat)).to.not.exist;
  });

  it('publishes typing pulses while composing and a stop when emptied', async () => {
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active'
    });
    const channel = `history:${chat.currentContact.uuid}`;

    await setComposeText(chat, 'hello there');
    expect(mockSocket.published.length).to.equal(1);
    expect(mockSocket.published[0].channel).to.equal(channel);
    expect(mockSocket.published[0].data.type).to.equal('typing_started');

    // pulses repeat while composing
    clock.tick(4000);
    expect(mockSocket.published.length).to.equal(2);
    expect(mockSocket.published[1].data.type).to.equal('typing_started');

    // emptying the box stops pulsing and publishes a stop
    await setComposeText(chat, '');
    expect(mockSocket.published.length).to.equal(3);
    expect(mockSocket.published[2].data.type).to.equal('typing_stopped');

    clock.tick(8000);
    expect(mockSocket.published.length).to.equal(3);
  });

  it('includes the external id of the last incoming message in pulses', async () => {
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active'
    });

    // an incoming message with an external id arrives
    mockSocket.serverPublish(`history:${chat.currentContact.uuid}`, {
      uuid: '01998888-0000-7000-8000-000000003333',
      type: 'msg_received',
      created_on: '2025-09-25T12:00:00.000000+00:00',
      msg: { text: 'hi', external_id: 'ex123' }
    });

    await setComposeText(chat, 'typing away');
    expect(mockSocket.published.length).to.equal(1);
    expect(mockSocket.published[0].data.msg_external_id).to.equal('ex123');
  });

  it('silently disables pulsing when publishes are denied', async () => {
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active'
    });

    mockSocket.publishError = { code: 103, message: 'permission denied' };
    await setComposeText(chat, 'hello');

    // the denial disabled pulsing - no retries, no stop event
    clock.tick(20000);
    await setComposeText(chat, 'hello again');
    await setComposeText(chat, '');
    expect(mockSocket.published.length).to.equal(0);
  });

  it('keeps pulsing through temporary publish errors', async () => {
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active'
    });

    // the first pulse hits a temporary server error
    mockSocket.publishError = {
      code: 100,
      message: 'internal server error',
      temporary: true
    };
    await setComposeText(chat, 'hello');
    expect(mockSocket.published.length).to.equal(0);

    // the server recovers and the next pulse goes through
    mockSocket.publishError = null;
    clock.tick(4000);
    await waitFor(1);
    expect(mockSocket.published.length).to.equal(1);
    expect(mockSocket.published[0].data.type).to.equal('typing_started');
  });

  it('publishes typing_stopped when a send empties the compose', async () => {
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active'
    });

    await setComposeText(chat, 'hello there');
    expect(mockSocket.published.length).to.equal(1);
    expect(mockSocket.published[0].data.type).to.equal('typing_started');

    // a successful send resets the compose, which fires a content-changed with
    // the (now empty) language entry dropped entirely - model that here
    const compose = chat.shadowRoot.querySelector('temba-compose');
    compose.dispatchEvent(
      new CustomEvent(CustomEventType.ContentChanged, { detail: {} })
    );
    await waitFor(1);

    expect(mockSocket.published.length).to.equal(2);
    expect(mockSocket.published[1].data.type).to.equal('typing_stopped');
  });

  it('publishes pulses for a non-default compose language', async () => {
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active'
    });
    const channel = `history:${chat.currentContact.uuid}`;

    // composing in a non-'und' language must still drive pulses
    const compose = chat.shadowRoot.querySelector('temba-compose');
    compose.dispatchEvent(
      new CustomEvent(CustomEventType.ContentChanged, {
        detail: { eng: { text: 'hola' } }
      })
    );
    await waitFor(1);

    expect(mockSocket.published.length).to.equal(1);
    expect(mockSocket.published[0].channel).to.equal(channel);
    expect(mockSocket.published[0].data.type).to.equal('typing_started');
  });
});
