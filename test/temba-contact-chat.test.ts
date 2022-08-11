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
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-dave-active',
    });

    await assertScreenshot('contacts/contact-chat', getClip(chat));
  });

  it('cannot send msg if contact is archived', async () => {
    await loadStore();
    const chat: ContactChat = await getContactChat({
      contact: 'contact-barak-archived',
    });

    // TODO: do some other assertions, make sure chat box is hidden etc.
    //       the current screenshot should fail since it's showing right
    //       for archived contacts still

    await assertScreenshot('contacts/contact-chat-archived', getClip(chat));
  });

  // it('cannot send msg if contact is archived', async () => {
  //   const chat: ContactChat = await fixture(getChatHTML());

  //   console.log('contactChat');
  //   console.log(chat);

  //   chat.currentContact = archivedContact;
  //   console.log('contactChat.currentContact');
  //   console.log(chat.currentContact);

  //   console.log('contactChat.shadowRoot');
  //   console.log(chat.shadowRoot);

  //   const chatWrapperDivEl = chat.shadowRoot.querySelector(
  //     '.chat-wrapper'
  //   ) as HTMLDivElement;
  //   console.log(chatWrapperDivEl);

  //   const chatboxDivEl = chat.shadowRoot.querySelector(
  //     '.chatbox'
  //   ) as HTMLDivElement;
  //   console.log(chatboxDivEl);

  //   expect(chatboxDivEl.getAttribute('visibility')).to.equal('hidden');
  //   await assertScreenshot('contacts/chat-archived', getClip(chatWrapperDivEl));
  // });
});

// const archivedContact = {
//   uuid: '4e4cdcc6-7b46-4027-8e0d-4e9a1e094b09',
//   name: 'Hallie Kardashian',
//   status: 'archived',
//   language: 'fra',
//   urns: ['tel:+250700009994'],
//   groups: [],
//   fields: {
//     gender: 'M',
//     age: '49',
//     joined: '2021-09-14T17:38:19.772634-03:00',
//     ward: null,
//     district: null,
//     state: null,
//   },
//   flow: null,
//   created_on: '2022-08-07T14:55:05.202452Z',
//   modified_on: '2022-08-11T08:03:06.598216Z',
//   last_seen_on: null,
//   blocked: false,
//   stopped: false,
//   ticket: {
//     uuid: '',
//     subject: '',
//     closed_on: '',
//     last_activity_on: '',
//     assignee: null,
//     topic: null,
//   },
// };
