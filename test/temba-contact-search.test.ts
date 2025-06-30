import { fixture, assert, expect } from '@open-wc/testing';
import { ContactSearch } from '../src/components/contactsearch/ContactSearch';
import { assertScreenshot, getClip, getHTML, mockPOST } from './utils.test';
import { useFakeTimers } from 'sinon';
import { CustomEventType } from '../src/components/interfaces';
import { Omnibox } from '../src/components/omnibox/Omnibox';

let clock: any;

function waitForSearch(search: ContactSearch) {
  return new Promise<ContactSearch>((resolve) => {
    search.addEventListener(
      CustomEventType.ContentChanged,
      async () => {
        await clock.runAll();
        resolve(search);
      },
      { once: true }
    );
  });
}

describe('temba-contact-search', () => {
  beforeEach(function () {
    clock = useFakeTimers();
  });

  afterEach(function () {
    clock.restore();
  });

  it('can be created', async () => {
    const search: ContactSearch = await fixture(
      getHTML('temba-contact-search')
    );
    assert.instanceOf(search, ContactSearch);
  });

  xit('handles bad queries', async () => {
    const endpoint = '/contact-search-bad';
    const search: ContactSearch = await fixture(
      getHTML('temba-contact-search', {
        advanced: true,
        endpoint
      })
    );

    // mock an error response
    mockPOST(
      /contact-search-bad/,
      { query: '', total: 0, error: "'Missing' is not a valid group name" },
      { 'X-Temba-Success': 'hide' }
    );

    search.query = 'group = "Missing"';

    // run the query
    await clock.runAll();
    await clock.runAll();
    await waitForSearch(search);

    expect(search.errors).to.deep.equal([
      "'Missing' is not a valid group name"
    ]);

    await search.updateComplete;
    await assertScreenshot('contact-search/missing-group', getClip(search));
  });

  xit('allows manual searches', async () => {
    const endpoint = '/contact-search-manual';
    const search: ContactSearch = await fixture(
      getHTML('temba-contact-search', {
        endpoint
      })
    );

    const omnibox = search.shadowRoot.querySelector('temba-omnibox') as Omnibox;
    omnibox.value = [];
    search.advanced = true;

    await search.updateComplete;

    // mock successful response with some warnings
    mockPOST(
      /contact-search-manual/,
      {
        query: 'group = "Doctors"',
        total: 1937,
        warnings: [
          'This flow does not specify a Facebook topic. You may still start this flow but Facebook contacts who have not sent an incoming message in the last 24 hours may not receive it.',
          'This flow does not use message templates. You may still start this flow but WhatsApp contacts who have not sent an incoming message in the last 24 hours may not receive it.'
        ],
        blockers: []
      },
      { 'X-Temba-Success': 'hide' }
    );

    search.query = 'group = "Testers"';

    // run the query
    await clock.runAll();
    await clock.runAll();
    await waitForSearch(search);
    await clock.runAll();

    await search.updateComplete;
    await assertScreenshot('contact-search/manual-search', getClip(search));
  });
});
