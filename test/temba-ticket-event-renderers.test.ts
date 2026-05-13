import { expect, fixture, html } from '@open-wc/testing';
import { renderTicketAssigneeChanged } from '../src/events/eventRenderers';
import { TicketEvent } from '../src/events';

const makeEvent = (overrides: Partial<TicketEvent> = {}): TicketEvent => {
  return {
    type: 'ticket_assignee_changed',
    uuid: 'evt-1',
    created_on: new Date(),
    ticket: { uuid: 'ticket-1' },
    ...overrides
  } as TicketEvent;
};

describe('renderTicketAssigneeChanged', () => {
  it('renders "took this ticket" when actor and assignee share the same email', async () => {
    const adam = { name: 'Adam', email: 'adam@example.com' };
    const event = makeEvent({ _user: adam, assignee: adam });

    const el = await fixture(html`<div>${renderTicketAssigneeChanged(event)}</div>`);
    expect(el.textContent).to.contain('took this ticket');
    expect(el.textContent).to.not.contain('assigned this ticket to');
  });

  it('renders "<actor> assigned this ticket to <assignee>" for cross-user assignment', async () => {
    const event = makeEvent({
      _user: { name: 'Adam', email: 'adam@example.com' },
      assignee: { name: 'Sally', email: 'sally@example.com' }
    });

    const el = await fixture(html`<div>${renderTicketAssigneeChanged(event)}</div>`);
    expect(el.textContent).to.contain('assigned this ticket to');
    expect(el.textContent).to.not.contain('took this ticket');
  });

  it('does not collapse to "took this ticket" when both emails are missing', async () => {
    // Without an email guard, two undefined === undefined would match
    // and wrongly render self-assignment. The guard requires both sides
    // to have a real email value before collapsing.
    const event = makeEvent({
      _user: { name: 'Adam' },
      assignee: { name: 'Sally' }
    });

    const el = await fixture(html`<div>${renderTicketAssigneeChanged(event)}</div>`);
    expect(el.textContent).to.contain('assigned this ticket to');
    expect(el.textContent).to.not.contain('took this ticket');
  });

  it('renders "<actor> unassigned this ticket" when assignee is absent', async () => {
    const event = makeEvent({
      _user: { name: 'Adam', email: 'adam@example.com' }
    });

    const el = await fixture(html`<div>${renderTicketAssigneeChanged(event)}</div>`);
    expect(el.textContent).to.contain('unassigned this ticket');
  });

  it('renders "This ticket was assigned to <assignee>" for system assignment', async () => {
    const event = makeEvent({
      assignee: { name: 'Sally', email: 'sally@example.com' }
    });

    const el = await fixture(html`<div>${renderTicketAssigneeChanged(event)}</div>`);
    expect(el.textContent).to.contain('This ticket was assigned to');
  });

  it('renders "This ticket was unassigned" when there is no actor or assignee', async () => {
    const event = makeEvent();

    const el = await fixture(html`<div>${renderTicketAssigneeChanged(event)}</div>`);
    expect(el.textContent).to.contain('This ticket was unassigned');
  });
});
