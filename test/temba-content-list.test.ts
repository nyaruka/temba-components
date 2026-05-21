import { assert, expect } from '@open-wc/testing';
import { CustomEventType } from '../src/interfaces';
import { ContentList } from '../src/list/ContentList';
import { ContactList } from '../src/list/ContactList';
import { FlowList } from '../src/list/FlowList';
import { MsgList } from '../src/list/MsgList';
import {
  assertScreenshot,
  getClip,
  getComponent,
  loadStore,
  mockNow
} from './utils.test';

const TAG = 'temba-content-list';

const getList = async (attrs: any = {}) => {
  const list = (await getComponent(TAG, attrs, '', 700)) as ContentList;
  if (!list.endpoint) return list;
  return new Promise<ContentList>((resolve) => {
    list.addEventListener(CustomEventType.FetchComplete, () => resolve(list), {
      once: true
    });
  });
};

describe('temba-content-list', () => {
  let nowStub: any;
  beforeEach(() => {
    // Pin "now" so duration cells render stable text across runs.
    nowStub = mockNow('2026-05-11T14:00:00Z');
  });
  afterEach(() => {
    if (nowStub) nowStub.restore();
  });

  it('can be created', async () => {
    const list: ContentList = await getList();
    assert.instanceOf(list, ContentList);
  });

  it('fetches items from endpoint', async () => {
    const list: ContentList = await getList({
      endpoint: '/test-assets/content-list/items.json'
    });
    // protected state — cast to any for test access
    expect((list as any).items.length).to.equal(3);
    expect((list as any).total).to.equal(3);
  });

  it('renders default columns from item keys', async () => {
    const list = (await getList({
      endpoint: '/test-assets/content-list/items.json'
    })) as ContentList;
    list.columns = [
      { key: 'name', label: 'Name' },
      { key: 'value', label: 'Value' }
    ];
    await list.updateComplete;
    const rows = list.shadowRoot!.querySelectorAll('.row');
    expect(rows.length).to.equal(3);
    // first row should mention "Alpha"
    expect(rows[0].textContent).to.contain('Alpha');
  });

  it('fires temba-bulk-action when an action is clicked', async () => {
    const list = (await getList({
      endpoint: '/test-assets/content-list/items.json'
    })) as ContentList;
    list.columns = [{ key: 'name' }];
    list.bulkActions = [{ key: 'delete', label: 'Delete' }];
    // pre-select an item
    (list as any).selectedIds = new Set(['u-1']);
    await list.updateComplete;

    let bulkDetail: any = null;
    list.addEventListener(CustomEventType.BulkAction, (e: Event) => {
      bulkDetail = (e as CustomEvent).detail;
    });

    const action = list.shadowRoot!.querySelector(
      '.bulk-action'
    ) as HTMLElement;
    assert.exists(action, 'bulk action button should render');
    action.click();

    expect(bulkDetail).to.deep.equal({ action: 'delete', ids: ['u-1'] });
  });

  it('renders the messages list (screenshot)', async () => {
    await loadStore();
    const list = (await getComponent(
      'temba-msg-list',
      { endpoint: '/test-assets/content-list/messages.json' },
      '',
      1100
    )) as MsgList;
    await new Promise<void>((resolve) => {
      list.addEventListener(CustomEventType.FetchComplete, () => resolve(), {
        once: true
      });
    });
    await list.updateComplete;
    await assertScreenshot('content-list/messages', getClip(list));
  });

  it('renders the contacts list (screenshot)', async () => {
    await loadStore();
    const list = (await getComponent(
      'temba-contact-list',
      { endpoint: '/test-assets/content-list/contacts.json' },
      '',
      1100
    )) as ContactList;
    await new Promise<void>((resolve) => {
      list.addEventListener(CustomEventType.FetchComplete, () => resolve(), {
        once: true
      });
    });
    // ContactList loads featured fields via a separate async fetch
    // that's not gated on FetchComplete. Wait for the columns to
    // include at least one custom field so the pinned-column layout
    // is settled before snapshotting.
    while ((list as any).featuredFields?.length === 0) {
      await new Promise((r) => setTimeout(r, 10));
    }
    await list.updateComplete;
    await assertScreenshot('content-list/contacts', getClip(list));
  });

  it('renders the flows list (screenshot)', async () => {
    await loadStore();
    const list = (await getComponent(
      'temba-flow-list',
      { endpoint: '/test-assets/content-list/flows.json' },
      '',
      1100
    )) as FlowList;
    await new Promise<void>((resolve) => {
      list.addEventListener(CustomEventType.FetchComplete, () => resolve(), {
        once: true
      });
    });
    await list.updateComplete;
    await assertScreenshot('content-list/flows', getClip(list));
  });

  it('follows cursor pagination when the response has no count', async () => {
    const list = (await getList({
      endpoint: '/test-assets/content-list/cursor-page1.json'
    })) as ContentList;
    list.columns = [{ key: 'name', label: 'Name' }];
    await list.updateComplete;

    // a cursor response (no `count`) puts the list in cursor mode
    expect((list as any).cursorMode).to.equal(true);
    expect((list as any).items.length).to.equal(2);
    expect((list as any).items[0].name).to.equal('Alpha');

    // the footer drops the running total in cursor mode
    expect(list.shadowRoot!.querySelector('.pager-status')).to.equal(null);

    // previous is disabled on the first page, next is enabled
    const [prev, next] = list.shadowRoot!.querySelectorAll('.page-btn');
    expect(prev.hasAttribute('disabled')).to.equal(true);
    expect(next.hasAttribute('disabled')).to.equal(false);

    // clicking next follows the cursor URL to the second page
    const onPage2 = new Promise<void>((resolve) => {
      list.addEventListener(CustomEventType.FetchComplete, () => resolve(), {
        once: true
      });
    });
    (next as HTMLElement).click();
    await onPage2;
    await list.updateComplete;
    expect((list as any).items.length).to.equal(1);
    expect((list as any).items[0].name).to.equal('Charlie');

    // on the last page next is disabled, previous is enabled
    const [prev2, next2] = list.shadowRoot!.querySelectorAll('.page-btn');
    expect(prev2.hasAttribute('disabled')).to.equal(false);
    expect(next2.hasAttribute('disabled')).to.equal(true);
  });

  it('shows a result count in the search bar when search is active', async () => {
    const list = (await getList({
      endpoint: '/test-assets/content-list/items.json'
    })) as ContentList;
    list.columns = [{ key: 'name', label: 'Name' }];
    await list.updateComplete;

    // No search yet — the count is hidden even though the response
    // carried `count`, because there is no active query to qualify it.
    (list as any).searchOpen = true;
    await list.updateComplete;
    expect(list.shadowRoot!.querySelector('.searchbar .result-count')).to.equal(
      null
    );

    // Run a search; the same fixture comes back with count=3.
    (list as any).searchDraft = 'a';
    const onFetch = new Promise<void>((resolve) => {
      list.addEventListener(CustomEventType.FetchComplete, () => resolve(), {
        once: true
      });
    });
    (list as any).commitSearch();
    await onFetch;
    await list.updateComplete;

    const count = list.shadowRoot!.querySelector('.searchbar .result-count');
    expect(count).to.not.equal(null);
    expect(count!.textContent!.trim()).to.equal('3 results');
  });

  it('stays in cursor mode when a count is returned alongside cursor URLs', async () => {
    const list = (await getList({
      endpoint: '/test-assets/content-list/items.json'
    })) as ContentList;
    // Drive the detection directly with a synthetic cursor response.
    const cursorMode = (list as any).detectCursorMode({
      results: [],
      count: 42,
      next: '/x/?cursor=opaque-token',
      previous: null
    });
    expect(cursorMode).to.equal(true);

    // No cursor signal + count present → page mode.
    expect(
      (list as any).detectCursorMode({
        results: [],
        count: 42,
        next: '/x/?page=2',
        previous: null
      })
    ).to.equal(false);
  });

  it('fires temba-history-change with replace=false on page change and committed search', async () => {
    const list = (await getList({
      endpoint: '/test-assets/content-list/cursor-page1.json',
      'history-state-key': 'msgs'
    })) as ContentList;
    list.columns = [{ key: 'name', label: 'Name' }];
    await list.updateComplete;

    const events: any[] = [];
    list.addEventListener(CustomEventType.HistoryChange, (e: any) =>
      events.push(e.detail)
    );

    // paging — pushes a new history entry
    const onPage2 = new Promise<void>((resolve) => {
      list.addEventListener(CustomEventType.FetchComplete, () => resolve(), {
        once: true
      });
    });
    const [, next] = list.shadowRoot!.querySelectorAll('.page-btn');
    (next as HTMLElement).click();
    await onPage2;

    expect(events.length).to.be.greaterThan(0);
    const pageEvent = events[events.length - 1];
    expect(pageEvent.key).to.equal('msgs');
    expect(pageEvent.replace).to.equal(false);
    expect(pageEvent.state.page).to.equal(2);

    // committed search — also pushes a new entry
    events.length = 0;
    (list as any).searchDraft = 'a';
    const onSearch = new Promise<void>((resolve) => {
      list.addEventListener(CustomEventType.FetchComplete, () => resolve(), {
        once: true
      });
    });
    (list as any).commitSearch();
    await onSearch;

    expect(events.length).to.be.greaterThan(0);
    const searchEvent = events[events.length - 1];
    expect(searchEvent.replace).to.equal(false);
    expect(searchEvent.state.search).to.equal('a');
  });

  it('restores from history.state and re-fetches on popstate', async () => {
    // Seed the active history entry as if a prior visit had stashed
    // page/sort/search for this list.
    const seeded = {
      msgs: { page: 1, sort: '-name', search: 'b' }
    };
    history.replaceState(seeded, '');

    const list = (await getList({
      endpoint: '/test-assets/content-list/items.json',
      'history-state-key': 'msgs'
    })) as ContentList;
    list.columns = [{ key: 'name', label: 'Name' }];
    await list.updateComplete;

    expect((list as any).sort).to.equal('-name');
    expect((list as any).search).to.equal('b');

    // Simulate browser back to an entry with different list state.
    history.replaceState({ msgs: { page: 1, sort: 'name', search: '' } }, '');
    const onFetch = new Promise<void>((resolve) => {
      list.addEventListener(CustomEventType.FetchComplete, () => resolve(), {
        once: true
      });
    });
    window.dispatchEvent(new PopStateEvent('popstate'));
    await onFetch;

    expect((list as any).sort).to.equal('name');
    expect((list as any).search).to.equal('');
  });

  it('toggles sort direction on header click', async () => {
    const list = (await getList({
      endpoint: '/test-assets/content-list/items.json'
    })) as ContentList;
    list.columns = [{ key: 'name', sortable: true, label: 'Name' }];
    await list.updateComplete;

    const head = list.shadowRoot!.querySelector(
      '.head-cell.sortable'
    ) as HTMLElement;
    assert.exists(head);
    head.click();
    expect((list as any).sort).to.equal('name');
    head.click();
    expect((list as any).sort).to.equal('-name');
    head.click();
    expect((list as any).sort).to.equal('');
  });
});
