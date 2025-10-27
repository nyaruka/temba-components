import { SinonStub, useFakeTimers } from 'sinon';
import { Compose } from '../src/form/Compose';
import { ContactChat } from '../src/live/ContactChat';
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
  updateComponent
} from '../test/utils.test';

import { expect, oneEvent } from '@open-wc/testing';

let clock: any;

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
  await clock.tick(0);
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
    mockGET(
      /\/contact\/history\/contact-.*/,
      '/test-assets/contacts/history.json'
    );

    mockGET(
      /\/api\/v2\/users\.json\?email=admin1%40nyaruka\.com/,
      '/test-assets/api/users/admin1.json'
    );

    mockAPI();
    clock = useFakeTimers();
  });

  afterEach(function () {
    clock.restore();
    mockedNow.restore();
  });

  // temporarily disabled as it's too flaky in CI
  xit('show history and show chatbox if contact is active', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active'
    });

    await assertScreenshot('contacts/chat-for-active-contact', getClip(chat));
  });

  it('show history and hide chatbox if contact is archived', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-barack-archived'
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

  it('show history and hide chatbox if contact is stopped', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-tim-stopped'
    });

    await assertScreenshot('contacts/chat-for-stopped-contact', getClip(chat));
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
      contact: { uuid: 'contact-dave-active', name: 'Dave Matthews' },
      text: text,
      attachments: []
    };
    mockPOST(/api\/v2\/messages\.json/, response_body);

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
      contact: { uuid: 'contact-dave-active', name: 'Dave Matthews' },
      text: '',
      attachments: response_attachments
    };
    const response_headers = {};
    const response_status = '200';
    mockPOST(
      /api\/v2\/messages\.json/,
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
      contact: { uuid: 'contact-dave-active', name: 'Dave Matthews' },
      text: text,
      attachments: response_attachments
    };
    mockPOST(/api\/v2\/messages\.json/, response_body);

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

  it('should not change assignee when topic changes and server auto-assigns', async () => {
    await loadStore();

    // Create a ticket with no assignee
    const unassignedTicket = {
      uuid: 'test-ticket-uuid',
      contact: {
        uuid: 'contact-dave-active',
        name: 'Dave Matthews'
      },
      status: 'open',
      subject: 'Test Ticket',
      topic: {
        uuid: 'topic-1',
        name: 'Support'
      },
      assignee: null,
      opened_on: '2021-03-31T00:00:00.000Z',
      closed_on: null
    };

    // After topic change, server auto-assigns the ticket
    const autoAssignedTicket = {
      ...unassignedTicket,
      topic: {
        uuid: 'topic-2',
        name: 'Billing'
      },
      assignee: {
        email: 'admin1@nyaruka.com',
        name: 'Adam McAdmin'
      }
    };

    // Mock the ticket endpoint to return assigned ticket after refresh
    mockGET(
      /\/api\/v2\/tickets\.json\?uuid=test-ticket-uuid/,
      '/test-assets/api/tickets.json',
      { results: [autoAssignedTicket] }
    );

    // Mock topic change action
    mockPOST(/\/api\/v2\/ticket_actions\.json/, {}, {});

    // Create chat with the ticket
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active'
    });
    chat.currentTicket = unassignedTicket;
    await chat.requestUpdate();
    await clock.tick(0);

    // Get the user select component
    const userSelect = chat.shadowRoot.querySelector('temba-user-select');
    expect(userSelect).to.exist;

    // Verify it starts empty (no assignee)
    expect((userSelect as any).values.length).to.equal(0);

    // Listen for ticket updated event
    const ticketUpdatedPromise = oneEvent(
      chat,
      CustomEventType.TicketUpdated,
      false
    );

    // Simulate topic change
    const topicSelect = chat.shadowRoot.querySelector('temba-select');
    expect(topicSelect).to.exist;

    // Change to a new topic
    const newTopic = { uuid: 'topic-2', name: 'Billing' };
    (topicSelect as any).values = [newTopic];

    // Fire change event - this triggers handleTopicChanged
    topicSelect.dispatchEvent(new CustomEvent('change', { bubbles: true }));

    // Wait for the ticket to be updated
    await ticketUpdatedPromise;
    await chat.requestUpdate();
    await clock.tick(100);

    // After the fix, the assignee widget should remain empty
    // even though the server auto-assigned the ticket
    expect((userSelect as any).values.length).to.equal(
      0,
      'Assignee should remain null after topic change'
    );
    expect(chat.currentTicket.assignee).to.be.null;
  });

  it('should preserve existing assignee when topic changes', async () => {
    await loadStore();

    // Create a ticket with an existing assignee
    const assignedTicket = {
      uuid: 'test-ticket-uuid-2',
      contact: {
        uuid: 'contact-dave-active',
        name: 'Dave Matthews'
      },
      status: 'open',
      subject: 'Test Ticket 2',
      topic: {
        uuid: 'topic-1',
        name: 'Support'
      },
      assignee: {
        email: 'agent1@nyaruka.com',
        name: 'Agnes McAgent'
      },
      opened_on: '2021-03-31T00:00:00.000Z',
      closed_on: null
    };

    // After topic change, server tries to auto-assign to different user
    const serverAssignedTicket = {
      ...assignedTicket,
      topic: {
        uuid: 'topic-2',
        name: 'Billing'
      },
      assignee: {
        email: 'admin1@nyaruka.com',
        name: 'Adam McAdmin'
      }
    };

    // Mock the ticket endpoint
    mockGET(
      /\/api\/v2\/tickets\.json\?uuid=test-ticket-uuid-2/,
      '/test-assets/api/tickets.json',
      { results: [serverAssignedTicket] }
    );

    mockPOST(/\/api\/v2\/ticket_actions\.json/, {}, {});

    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active'
    });
    chat.currentTicket = assignedTicket;
    await chat.requestUpdate();
    await clock.tick(0);

    const userSelect = chat.shadowRoot.querySelector('temba-user-select');
    expect(userSelect).to.exist;

    // Verify it starts with the original assignee
    expect((userSelect as any).values.length).to.equal(1);
    expect((userSelect as any).values[0].email).to.equal('agent1@nyaruka.com');

    const ticketUpdatedPromise = oneEvent(
      chat,
      CustomEventType.TicketUpdated,
      false
    );

    // Change topic
    const topicSelect = chat.shadowRoot.querySelector('temba-select');
    const newTopic = { uuid: 'topic-2', name: 'Billing' };
    (topicSelect as any).values = [newTopic];
    topicSelect.dispatchEvent(new CustomEvent('change', { bubbles: true }));

    await ticketUpdatedPromise;
    await chat.requestUpdate();
    await clock.tick(100);

    // Assignee should still be the original one
    expect((userSelect as any).values.length).to.equal(1);
    expect((userSelect as any).values[0].email).to.equal(
      'agent1@nyaruka.com',
      'Original assignee should be preserved'
    );
    expect(chat.currentTicket.assignee.email).to.equal('agent1@nyaruka.com');
  });
});
