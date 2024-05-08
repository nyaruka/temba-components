import { assert, waitUntil } from '@open-wc/testing';
import { ContactTickets } from '../src/contacts/ContactTickets';
import {
  assertScreenshot,
  getClip,
  getComponent,
  loadStore,
  mockGET,
  mockNow
} from './utils.test';

const TAG = 'temba-contact-tickets';
const getContactTickets = async (attrs: any = {}) => {
  const contactTickets = (await getComponent(
    TAG,
    attrs,
    '',
    400
  )) as ContactTickets;
  // wait for our contact to load
  await waitUntil(() => !!contactTickets.data);
  return contactTickets;
};

mockNow('2023-04-07T00:00:00.000-00:00');
describe('temba-contact-tickets', () => {
  beforeEach(() => {
    mockGET(
      /\/api\/v2\/tickets.json\?contact=24d64810-3315-4ff5-be85-48e3fe055bf9/,
      '/test-assets/contacts/contact-tickets.json'
    );
    loadStore();
  });

  it('renders default', async () => {
    const tickets: ContactTickets = await getContactTickets({
      contact: '24d64810-3315-4ff5-be85-48e3fe055bf9',
      agent: 'admin1@nyaruka.com'
    });
    assert.instanceOf(tickets, ContactTickets);
    await assertScreenshot('contacts/tickets', getClip(tickets));
  });

  it('shows assignment picker', async () => {
    const tickets: ContactTickets = await getContactTickets({
      contact: '24d64810-3315-4ff5-be85-48e3fe055bf9',
      agent: 'admin1@nyaruka.com'
    });

    // click on the avatar element
    (tickets.shadowRoot.querySelector('temba-user') as HTMLDivElement).click();
    assert.instanceOf(tickets, ContactTickets);
    await assertScreenshot('contacts/tickets-assignment', getClip(tickets));
  });
});
