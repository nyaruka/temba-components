import { expect, fixture, html } from '@open-wc/testing';
import { renderAirtimeCreatedEvent } from '../src/events/eventRenderers';
import { AirtimeCreatedEvent, AirtimeStatus } from '../src/events';

const makeEvent = (
  overrides: Partial<AirtimeCreatedEvent> = {}
): AirtimeCreatedEvent => {
  return {
    type: 'airtime_created',
    uuid: 'evt-1',
    created_on: new Date(),
    sender: 'tel:+250788111111',
    recipient: 'tel:+250788222222',
    currency: 'USD',
    amount: '1.50',
    ...overrides
  } as AirtimeCreatedEvent;
};

const withStatus = (status: AirtimeStatus): AirtimeCreatedEvent =>
  makeEvent({
    _status: { created_on: '2025-11-17T19:07:58.472259Z', status }
  });

describe('renderAirtimeCreatedEvent', () => {
  it('renders "Sending" for in-flight statuses', async () => {
    for (const status of ['created', 'confirmed', 'submitted'] as const) {
      const el = await fixture(
        html`<div>${renderAirtimeCreatedEvent(withStatus(status))}</div>`
      );
      expect(el.textContent, status).to.contain('Sending');
      expect(el.textContent, status).to.contain('1.50');
      expect(el.textContent, status).to.contain('USD');
    }
  });

  it('renders "Transferred" for completed', async () => {
    const el = await fixture(
      html`<div>${renderAirtimeCreatedEvent(withStatus('completed'))}</div>`
    );
    expect(el.textContent).to.contain('Transferred');
    expect(el.textContent).to.contain('1.50');
    expect(el.textContent).to.contain('USD');
  });

  it('renders "Airtime transfer failed" for terminal failure statuses', async () => {
    for (const status of [
      'rejected',
      'cancelled',
      'declined',
      'reversed'
    ] as const) {
      const el = await fixture(
        html`<div>${renderAirtimeCreatedEvent(withStatus(status))}</div>`
      );
      expect(el.textContent, status).to.contain('Airtime transfer failed');
    }
  });

  it('defaults to "Sending" when _status is missing', async () => {
    const el = await fixture(
      html`<div>${renderAirtimeCreatedEvent(makeEvent())}</div>`
    );
    expect(el.textContent).to.contain('Sending');
  });
});
