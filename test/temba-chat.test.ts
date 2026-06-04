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
