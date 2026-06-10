import '../temba-modules';
import { fixture, assert } from '@open-wc/testing';
import { Chat, ContactEvent } from '../src/display/Chat';
import { TembaUser } from '../src/display/TembaUser';

const createChat = async (attrs = ''): Promise<Chat> => {
  return (await fixture(
    `<temba-chat agent avatars ${attrs}></temba-chat>`
  )) as Chat;
};

const received = (uuid: string, text: string): ContactEvent =>
  ({
    uuid,
    type: 'msg_received',
    created_on: new Date(),
    msg: { text }
  }) as ContactEvent;

const getAvatar = async (chat: Chat): Promise<TembaUser> => {
  await chat.updateComplete;
  const user = chat.shadowRoot.querySelector('temba-user') as TembaUser;
  if (user) {
    await user.updateComplete;
  }
  return user;
};

describe('temba-chat contact avatars', () => {
  it('renders a name-based avatar for a contact message when contactName is set', async () => {
    const chat = await createChat(
      'contactname="Jane Doe" contactuuid="contact-1"'
    );
    chat.loadMessages([received('msg-1', 'hello there')]);

    const user = await getAvatar(chat);
    assert.instanceOf(user, TembaUser);
    assert.isNotOk(user.system);
    assert.equal(user.name, 'Jane Doe');
    assert.equal(user.initials, 'JD');
    assert.isNull(user.bgimage);
  });

  it('renders the contact icon for a nameless contact message', async () => {
    const chat = await createChat('contactuuid="contact-1"');
    chat.loadMessages([received('msg-1', 'hello there')]);

    const user = await getAvatar(chat);
    assert.instanceOf(user, TembaUser);
    assert.isNotOk(user.system);
    assert.equal(user.initials, '');
    assert.isNull(user.bgimage);
    assert.isNotNull(user.shadowRoot.querySelector('temba-icon'));
  });

  it('renders the system avatar for a contact message with no contact identity', async () => {
    const chat = await createChat();
    chat.loadMessages([received('msg-1', 'hello there')]);

    const user = await getAvatar(chat);
    assert.instanceOf(user, TembaUser);
    assert.isTrue(user.system);
    assert.isNotNull(user.bgimage);
  });
});

const created = (uuid: string, text: string): ContactEvent =>
  ({
    uuid,
    type: 'msg_created',
    created_on: new Date(),
    msg: { text }
  }) as ContactEvent;

describe('temba-chat typing indicator', () => {
  it('shows an animated typing bubble while the contact is typing', async () => {
    const chat = await createChat(
      'contactname="Jane Doe" contactuuid="contact-1"'
    );
    chat.loadMessages([received('msg-1', 'hello there')]);
    await chat.updateComplete;
    assert.isNull(chat.shadowRoot.querySelector('.typing-dots'));

    chat.typing = true;
    await chat.updateComplete;
    assert.isNotNull(chat.shadowRoot.querySelector('.typing-dots'));

    chat.typing = false;
    await chat.updateComplete;
    assert.isNull(chat.shadowRoot.querySelector('.typing-dots'));
  });

  it('joins the newest message group when it is from the contact', async () => {
    const chat = await createChat(
      'contactname="Jane Doe" contactuuid="contact-1"'
    );
    chat.loadMessages([received('msg-1', 'hello there')]);
    await chat.updateComplete;

    chat.typing = true;
    await chat.updateComplete;

    // typing bubble renders inside the contact's group, not as its own block
    const blocks = chat.shadowRoot.querySelectorAll('.block');
    assert.equal(blocks.length, 1);
    assert.isNotNull(blocks[0].querySelector('.typing-dots'));

    // and the typing bubble takes over as the latest bubble in the group
    const latest = blocks[0].querySelectorAll('.row.latest');
    assert.equal(latest.length, 1);
    assert.isNotNull(latest[0].querySelector('.typing-dots'));
  });

  it('renders as its own group when the newest message is outgoing', async () => {
    const chat = await createChat(
      'contactname="Jane Doe" contactuuid="contact-1"'
    );
    chat.loadMessages([created('msg-1', 'how can we help?')]);
    await chat.updateComplete;

    chat.typing = true;
    await chat.updateComplete;

    const blocks = chat.shadowRoot.querySelectorAll('.block');
    assert.equal(blocks.length, 2);
  });
});
