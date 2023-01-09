import { fixture, assert, expect } from '@open-wc/testing';
import { useFakeTimers } from 'sinon';
import { ContactHistory } from '../src/contacts/ContactHistory';
import {
  assertScreenshot,
  getClip,
  getHTML,
  loadStore,
  mockGET,
  mockNow,
} from '../test/utils.test';
import './utils.test';

export const createHistory = async (def: string) => {
  const parentNode = document.createElement('div');
  parentNode.setAttribute(
    'style',
    'width: 500px;height:750px;display:flex;flex-direction:column;flex-grow:1;min-height:0;'
  );
  const history = (await fixture(def, { parentNode })) as ContactHistory;
  return history;
};

const getHistoryHTML = (attrs: any = {} as any) =>
  // attrs = "min-height:0;display:flex;flex-grow:1;flex-direction:column";
  getHTML('temba-contact-history', attrs);

const getHistoryClip = (ele: ContactHistory) => {
  const clip = getClip(ele);
  clip.height = Math.min(clip.height, 750);
  clip.bottom = clip.top + clip.height;
  return clip;
};

// stub our current date for consistent screenshots
mockNow('2021-03-31T00:31:00.000-00:00');
let clock: any;

describe('temba-contact-history', () => {
  beforeEach(async () => {
    clock = useFakeTimers();

    mockGET(
      /\/contact\/history\/contact-dave-active\/.*/,
      '/test-assets/contacts/history.json'
    );

    mockGET(
      /\/api\/v2\/tickets\.json\?contact=contact-dave-active/,
      '/test-assets/api/tickets.json'
    );

    await loadStore();
  });

  afterEach(function () {
    clock.restore();
  });

  it.only('can be created', async () => {
    const history = await createHistory(getHistoryHTML());
    assert.instanceOf(history, ContactHistory);
  });

  it('renders history', async () => {
    const history = await createHistory(
      getHistoryHTML({
        uuid: 'contact-dave-active',
      })
    );

    // we should have scrolled to the bottom
    const events = history.shadowRoot.querySelector('.events');
    const top = events.scrollHeight - events.getBoundingClientRect().height;

    expect(top).to.equal(549);
    await clock.runAllAsync();

    // make sure we actually scrolled to there
    expect(events.scrollTop).to.equal(top);
    await assertScreenshot('contacts/history', getHistoryClip(history));
  });

  it('expands event groups', async () => {
    const history = await createHistory(
      getHistoryHTML({
        uuid: 'contact-dave-active',
      })
    );

    // our groups with collapsed events
    const groups = [3, 5, 7];
    for (const idx of groups) {
      const group = history.shadowRoot.querySelector(
        `.event-count[data-group-index='${idx}']`
      ) as HTMLDivElement;
      group.click();
      await clock.runAllAsync();
      expect(group.parentElement.classList.contains('expanded')).equal(true);
    }
  });
});
