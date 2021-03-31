import { fixture, assert, expect } from '@open-wc/testing';
import sinon from 'sinon';
import { ContactHistory } from '../src/contacts/ContactHistory';
import { stubbable, Stubbable } from '../src/utils';
import {
  assertScreenshot,
  getClip,
  getHTML,
  mockGET,
} from '../test/utils.test';
import './utils.test';

export const createHistory = async (def: string) => {
  const parentNode = document.createElement('div');
  parentNode.setAttribute(
    'style',
    'width: 500px;height:750px;display:flex;flex-direction:column'
  );
  return (await fixture(def, { parentNode })) as ContactHistory;
};

const getHistoryHTML = (attrs: any = {}) =>
  getHTML('temba-contact-history', attrs);

const getHistoryClip = (ele: ContactHistory) => {
  const clip = getClip(ele);
  clip.height = Math.min(clip.height, 750);
  clip.bottom = clip.top + clip.height;
  return clip;
};

// stub our current date for consistent screenshots
sinon.stub(stubbable, 'getCurrentDate').callsFake(() => {
  return new Date('2021-03-31T00:00:00.000-00:00');
});

describe('temba-contact-history', () => {
  beforeEach(() => {
    mockGET(
      /\/contact\/history\/1234\/.*/,
      '/test-assets/contacts/history.json'
    );
  });
  afterEach(() => {});

  it('can be created', async () => {
    const history = await createHistory(getHistoryHTML());
    assert.instanceOf(history, ContactHistory);
  });

  it('renders history', async () => {
    const history = await createHistory(
      getHistoryHTML({
        uuid: '1234',
      })
    );

    await history.httpComplete;

    // scrolling to the bottom should move us 417
    const top = history.scrollHeight - history.getBoundingClientRect().height;
    expect(top).to.equal(417);

    // make sure we actually scrolled to there
    expect(history.scrollTop).to.equal(top);

    await assertScreenshot('contacts/history', getHistoryClip(history));
  });

  it('expands event groups', async () => {
    const history = await createHistory(
      getHistoryHTML({
        uuid: '1234',
      })
    );

    await history.httpComplete;

    const groups = [2, 6];
    for (const idx of groups) {
      let group = history.shadowRoot.querySelector(
        `[data-group-index='${idx}']`
      ) as HTMLDivElement;
      group.click();
    }

    await assertScreenshot(
      'contacts/history-expanded',
      getHistoryClip(history)
    );
  });
});
