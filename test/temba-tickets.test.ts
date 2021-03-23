import { fixture, assert } from '@open-wc/testing';
import { TicketList } from '../src/list/TicketList';
import './utils.test';

export const getHTML = () => {
  return `<temba-tickets></temba-tickets>`;
};

describe('temba-ticket-list', () => {
  beforeEach(() => {});
  afterEach(() => {});

  it('can be created', async () => {
    const tickets: TicketList = await fixture(getHTML());
    assert.instanceOf(tickets, TicketList);
  });
});
