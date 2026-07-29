import { fixture, assert } from '@open-wc/testing';
import { CustomEventType } from '../src/interfaces';
import { TicketList } from '../src/list/TicketList';
import {
  assertScreenshot,
  getClip,
  getComponent,
  loadStore,
  mockGET,
  mockNow
} from './utils.test';

export const getHTML = () => {
  return `<temba-ticket-list></temba-ticket-list>`;
};

const getList = async (endpoint: string) => {
  const list = (await getComponent(
    'temba-ticket-list',
    { endpoint },
    '',
    300,
    600
  )) as TicketList;
  await new Promise<void>((resolve) => {
    list.addEventListener(
      CustomEventType.FetchComplete,
      () => {
        resolve();
      },
      { once: true }
    );
  });
  await list.updateComplete;
  return list;
};

const openTicket = (uuid: string, lastActivity: string) => {
  return {
    name: 'Contact',
    ticket: { uuid, last_activity_on: lastActivity, closed_on: null }
  };
};

const closedTicket = (uuid: string, lastActivity: string) => {
  return {
    name: 'Contact',
    ticket: {
      uuid,
      last_activity_on: lastActivity,
      closed_on: lastActivity
    }
  };
};

describe('temba-ticket-list', () => {
  it('can be created', async () => {
    const tickets: TicketList = await fixture(getHTML());
    assert.instanceOf(tickets, TicketList);
  });

  it('sorts open tickets above closed tickets', async () => {
    const tickets: TicketList = await fixture(getHTML());
    const items = [
      closedTicket('c1', '2024-01-04T00:00:00.000Z'),
      openTicket('o1', '2024-01-01T00:00:00.000Z'),
      closedTicket('c2', '2024-01-02T00:00:00.000Z'),
      openTicket('o2', '2024-01-03T00:00:00.000Z')
    ];

    items.sort((tickets as any).compareItems);
    assert.deepEqual(
      items.map((item) => item.ticket.uuid),
      ['o2', 'o1', 'c1', 'c2']
    );
  });

  it('separates closed tickets with a divider', async () => {
    const now = mockNow('2024-05-01T12:00:00.000Z');
    mockGET(/\/api\/v2\/users\.json\?uuid=/, {
      results: [
        {
          uuid: 'u1000000-0000-0000-0000-000000000001',
          email: 'agent1@nyaruka.com',
          first_name: 'Agnes',
          last_name: 'McAgent',
          avatar: null
        }
      ]
    });

    await loadStore();
    const list = await getList('/test-assets/list/tickets-merged.json');
    assert.equal(list.items.length, 6);

    await assertScreenshot('list/tickets-merged', getClip(list));

    // selecting a closed ticket gets the standard selection treatment
    list.cursorIndex = 4;
    await list.updateComplete;
    await assertScreenshot('list/tickets-merged-selected', getClip(list));
    now.restore();
  });

  it('refreshes using the newest activity in the list', async () => {
    const tickets: TicketList = await fixture(getHTML());
    tickets.endpoint = '/ticket/folder/mine/';

    // the closed ticket in the middle of the list has the newest activity
    tickets.items = [
      openTicket('o1', '2024-01-02T00:00:00.000Z'),
      closedTicket('c1', '2024-01-05T00:00:00.000Z'),
      closedTicket('c2', '2024-01-01T00:00:00.000Z')
    ];

    const newest = new Date('2024-01-05T00:00:00.000Z').getTime() * 1000;
    assert.equal(
      tickets.getRefreshEndpoint(),
      `/ticket/folder/mine/?after=${newest}`
    );
  });
});
