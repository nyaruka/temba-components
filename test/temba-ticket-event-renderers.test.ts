import { expect, fixture, html } from '@open-wc/testing';
import { renderTicketAssigneeChanged } from '../src/events/eventRenderers';
import { TicketEvent } from '../src/events';

// Build a TicketEvent fixture. Each branch passes partial user objects
// matching the runtime shape the renderer reads (`name`, `email`,
// `uuid`); cast as TicketEvent so the test isn't tied to type variance
// between Chat.ts's User and interfaces.ts's User.
const makeEvent = (overrides: any = {}): TicketEvent => {
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
    const adam = { uuid: 'u-adam', name: 'Adam', email: 'adam@example.com' };
    const event = makeEvent({ _user: adam, assignee: adam });

    const el = await fixture(
      html`<div>${renderTicketAssigneeChanged(event)}</div>`
    );
    expect(el.textContent).to.contain('took this ticket');
    expect(el.textContent).to.not.contain('assigned this ticket to');
  });

  it('renders "<actor> assigned this ticket to <assignee>" for cross-user assignment', async () => {
    const event = makeEvent({
      _user: { uuid: 'u-adam', name: 'Adam', email: 'adam@example.com' },
      assignee: { uuid: 'u-sally', name: 'Sally', email: 'sally@example.com' }
    });

    const el = await fixture(
      html`<div>${renderTicketAssigneeChanged(event)}</div>`
    );
    expect(el.textContent).to.contain('assigned this ticket to');
    expect(el.textContent).to.not.contain('took this ticket');
  });

  it('does not collapse to "took this ticket" when both emails are missing', async () => {
    // Without an email guard, two undefined === undefined would match
    // and wrongly render self-assignment. The guard requires both sides
    // to have a real email value before collapsing.
    const event = makeEvent({
      _user: { uuid: 'u-adam', name: 'Adam' },
      assignee: { uuid: 'u-sally', name: 'Sally' }
    });

    const el = await fixture(
      html`<div>${renderTicketAssigneeChanged(event)}</div>`
    );
    expect(el.textContent).to.contain('assigned this ticket to');
    expect(el.textContent).to.not.contain('took this ticket');
  });

  it('renders "<actor> unassigned this ticket" when assignee is absent', async () => {
    const event = makeEvent({
      _user: { uuid: 'u-adam', name: 'Adam', email: 'adam@example.com' }
    });

    const el = await fixture(
      html`<div>${renderTicketAssigneeChanged(event)}</div>`
    );
    expect(el.textContent).to.contain('unassigned this ticket');
  });

  it('renders "This ticket was assigned to <assignee>" for system assignment', async () => {
    const event = makeEvent({
      assignee: { uuid: 'u-sally', name: 'Sally', email: 'sally@example.com' }
    });

    const el = await fixture(
      html`<div>${renderTicketAssigneeChanged(event)}</div>`
    );
    expect(el.textContent).to.contain('This ticket was assigned to');
  });

  it('renders "This ticket was unassigned" when there is no actor or assignee', async () => {
    const event = makeEvent();

    const el = await fixture(
      html`<div>${renderTicketAssigneeChanged(event)}</div>`
    );
    expect(el.textContent).to.contain('This ticket was unassigned');
  });
});
