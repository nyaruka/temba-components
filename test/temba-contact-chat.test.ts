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
  getSuccessFiles,
  updateAttachments,
  updateChatbox,
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
  it('with text no attachments - success response', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active',
    });
    const compose = chat.shadowRoot.querySelector('temba-compose') as Compose;
    await updateChatbox(compose);

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
      'contacts/compose-chatbox-with-text-no-attachments-success',
      getClip(chat)
    );
  });

  it('with text no attachments - more than 640 chars - failure response', async () => {
    // we are a StoreElement, so load a store first
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active',
    });
    const compose = chat.shadowRoot.querySelector('temba-compose') as Compose;
    // set the chatbox to a string that is 640+ chars
    const text =
      "p}h<r0P<?SCIbV1+pwW1Hj8g^J&=Sm2f)K=5LjFFUZ№5@ybpoLZ7DJ(27qdWxQMaO)I1nB4(D%d3c(H)QXOF6F?4>&d{lhd5?0`Lio!yAGMO№*AxN5{z5s.IO*dy?tm}vXJ#Lf-HlD;xmNp}0<P42=w#ll9)B-e9>Q#'{~Vp<dl:xC9`T^lhh@TosCZ^:(H<Ji<E(~PojvYk^rPB+poYy^Ne~Su1:9?IgH'4S5Q9v0g№FEIUc~!{S7;746j'Sd@Nfu3=x?CsuR;YLP4j+AOzDARZG?0(Ji(NMg=r%n0Fq?R1?E%Yf`bcoVZAJ^bl0J'^@;lH>T.HmxYxwS;1?(bfrh?pRdd73:iMxrfx5luQ(}<dCD1b3g'G0CtkB№;8KkbL=>krG{RO%Va4wwr%P>jE*+n(E11}Ju9#<.f^)<MTH09^b{RQv7~H`#@Hda6{MV&H@xdyEKq#M@nZng8WTU66!F@*!)w*EpQ+65XKuQCaESgq=PHmtqi@l;F?PHvl^g@Z:+}}Xyr`IC2=3?20^I'qSU*tkyinM^JF.ZI>}~XzRQJn№v3o-w?Vy&gC:c.l(&9{`M#-'N}{T#7lw8(4:iY621'>C^.&hVZn:R!G}Ek){D#'KkiJWawq#7~GLBN*?V!ncw)d%&(tXj";
    await updateChatbox(compose, text);

    const response_body = {
      text: ['Translations must have no more than 640 characters.'],
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
      'contacts/compose-chatbox-with-text-no-attachments-failure',
      getClip(chat)
    );
  });

  describe('temba-contact-chat - contact tests - handle send tests - attachments no text', () => {
    it('with attachments no text - success response', async () => {
      // we are a StoreElement, so load a store first
      await loadStore();
      const chat: ContactChat = await getContactChat({
        contact: 'contact-dave-active',
      });
      const compose = chat.shadowRoot.querySelector('temba-compose') as Compose;
      await updateAttachments(compose);

      const attachments = getSuccessFiles();
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
        'contacts/compose-chatbox-no-text-with-attachments-success',
        getClip(chat)
      );
    });
    it.only('with attachments no text - more than 10 items - failure response', async () => {
      // we are a StoreElement, so load a store first
      await loadStore();
      const chat: ContactChat = await getContactChat({
        contact: 'contact-dave-active',
      });
      const compose = chat.shadowRoot.querySelector('temba-compose') as Compose;
      // set the attachments to a list that is 10+ items
      const attachments = getSuccessFiles(11);
      await updateAttachments(compose, attachments);

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
        'contacts/compose-chatbox-no-text-with-attachments-failure',
        getClip(chat)
      );
    });
  });

  // describe('temba-contact-chat - contact tests - handle send tests - text and attachments', () => {
  //   it('with text and attachments - success response', async () => {
  //     // we are a StoreElement, so load a store first
  //     await loadStore();
  //     const chat: ContactChat = await getContactChat({
  //       contact: 'contact-dave-active',
  //     });

  //     // todo
  //     // const data = {"text":{"eng":""},"attachments":{"eng":[]}}
  //     // mockPOST(/api\/v2\/broadcasts\.json\?payload=\/test-assets\/compose\/compose-text-and-attachments-success/, data);
  //     expect(true).equals(false);
  //   });
  //   it('with text and attachments - failure response due to text', async () => {
  //     // we are a StoreElement, so load a store first
  //     await loadStore();
  //     const chat: ContactChat = await getContactChat({
  //       contact: 'contact-dave-active',
  //     });

  //     const data = {
  //       text: ['Translations must have no more than 640 characters.'],
  //     };
  //     mockPOST(
  //       /api\/v2\/broadcasts\.json\?payload=\/test-assets\/compose\/compose-text-and-attachments-failure-text/,
  //       data
  //     );
  //   });
  //   it('with text and attachments - failure response due to attachments', async () => {
  //     // we are a StoreElement, so load a store first
  //     await loadStore();
  //     const chat: ContactChat = await getContactChat({
  //       contact: 'contact-dave-active',
  //     });

  //     // todo
  //     // const data = {"text":{"eng":""},"attachments":{"eng":[]}}
  //     // mockPOST(/api\/v2\/broadcasts\.json\?payload=\/test-assets\/compose\/compose-text-and-attachments-failure-attachments/, data);
  //     expect(true).equals(false);
  //   });
  //   it('with text and attachments - failure response due to both', async () => {
  //     // we are a StoreElement, so load a store first
  //     await loadStore();
  //     const chat: ContactChat = await getContactChat({
  //       contact: 'contact-dave-active',
  //     });

  //     // todo
  //     // const data = {"text":{"eng":""},"attachments":{"eng":[]}}
  //     // mockPOST(/api\/v2\/broadcasts\.json\?payload=\/test-assets\/compose\/compose-text-and-attachments-failure-all/, data);
  //     expect(true).equals(false);
  //   });
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
