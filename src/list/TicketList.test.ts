import { fixture, expect, assert } from '@open-wc/testing';
import { TicketList } from './TicketList';

export const getHTML = () => {
  return `<temba-tickets></temba-tickets>`;
};

describe('temba-contacts', () => {
  beforeEach(() => {});
  afterEach(() => {});

  it('can be created', async () => {
    const remote: TicketList = await fixture(getHTML());
    assert.instanceOf(remote, TicketList);
  });
});
