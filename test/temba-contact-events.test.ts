import { assert, expect } from '@open-wc/testing';
import { ContactEvents } from '../src/live/ContactEvents';
import {
  getComponent,
  loadStore,
  mockGET,
  waitForCondition
} from './utils.test';

const TAG = 'temba-contact-events';

const FIRST_PAGE = {
  now: '2024-06-01T12:00:00+00:00',
  future: [
    {
      type: 'scheduled_broadcast',
      scheduled: '2024-06-05T12:00:00+00:00',
      repeat_period: 'D',
      message: 'A scheduled reminder'
    },
    {
      type: 'scheduled_trigger',
      scheduled: '2024-06-07T12:00:00+00:00',
      repeat_period: 'W',
      flow: { uuid: 'flow-2', name: 'Survey' }
    },
    {
      type: 'campaign_event',
      scheduled: '2024-06-10T12:00:00+00:00',
      campaign: { uuid: 'camp-1', name: 'Onboarding' },
      flow: { uuid: 'flow-1', name: 'Welcome' }
    }
  ],
  past: [
    {
      type: 'sent_broadcast',
      scheduled: '2024-05-20T12:00:00+00:00',
      message: 'Welcome aboard'
    },
    {
      type: 'campaign_event',
      scheduled: '2024-05-10T12:00:00+00:00',
      campaign: { uuid: 'camp-1', name: 'Onboarding' },
      message: 'Day 1 tip'
    }
  ],
  next_before: '2024-05-10T12:00:00+00:00'
};

const OLDER_PAGE = {
  now: '2024-06-01T12:00:00+00:00',
  future: [],
  past: [
    {
      type: 'campaign_event',
      scheduled: '2024-04-01T12:00:00+00:00',
      campaign: { uuid: 'camp-2', name: 'Follow Up' },
      message: 'An older event'
    }
  ],
  next_before: null
};

const getEvents = async (data: any = FIRST_PAGE): Promise<ContactEvents> => {
  // a paged request (?before=) takes precedence over the first-page mock
  mockGET(/contact\/events\/.*before=/, OLDER_PAGE);
  mockGET(/contact\/events\//, data);

  const events = (await getComponent(
    TAG,
    { contact: 'contact-dave-active' },
    '',
    600
  )) as ContactEvents;

  await waitForCondition(() => !!events.data);
  await events.updateComplete;
  return events;
};

describe(TAG, () => {
  it('renders a timeline of past and future events', async () => {
    await loadStore();
    const events = await getEvents();
    assert.instanceOf(events, ContactEvents);

    const root = events.shadowRoot;
    expect(root.querySelector('.timeline')).to.not.equal(null);

    // 3 future + 2 past events, each filled or outlined accordingly
    expect(root.querySelectorAll('.dot.future').length).to.equal(3);
    expect(root.querySelectorAll('.dot.past').length).to.equal(2);

    // a single "now" marker sits between them
    expect(root.querySelectorAll('.dot.now').length).to.equal(1);
  });

  it('renders an empty state when there are no events', async () => {
    await loadStore();
    const events = await getEvents({
      now: '2024-06-01T12:00:00+00:00',
      future: [],
      past: [],
      next_before: null
    });

    expect(events.shadowRoot.querySelector('.empty')).to.not.equal(null);
    expect(events.shadowRoot.querySelector('.timeline')).to.equal(null);
  });

  it('pages back through older events', async () => {
    await loadStore();
    const events = await getEvents();

    // the pager is shown while there are older events to load
    const pager = events.shadowRoot.querySelector('.show-older') as HTMLElement;
    expect(pager).to.not.equal(null);

    pager.click();
    await waitForCondition(
      () => events.shadowRoot.querySelector('.show-older') === null
    );
    await events.updateComplete;

    // the older page is appended and the pager is gone
    expect(events.shadowRoot.querySelectorAll('.dot.past').length).to.equal(3);
  });

  it('fires a selection event when an event is clicked', async () => {
    await loadStore();
    const events = await getEvents();

    let selected: any = null;
    events.addEventListener('temba-selection', (e: CustomEvent) => {
      selected = e.detail;
    });

    const entry = events.shadowRoot.querySelector(
      '.event.clickable'
    ) as HTMLElement;
    entry.click();

    expect(selected).to.not.equal(null);
  });
});
