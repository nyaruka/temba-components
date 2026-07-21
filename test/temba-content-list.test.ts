import { assert, expect } from '@open-wc/testing';
import { stub } from 'sinon';
import { CustomEventType } from '../src/interfaces';
import { ContentList } from '../src/list/ContentList';
import { ContactList } from '../src/list/ContactList';
import { FlowList } from '../src/list/FlowList';
import { MsgList } from '../src/list/MsgList';
import { TriggerList } from '../src/list/TriggerList';
import {
  assertScreenshot,
  clearMockGets,
  getClip,
  getComponent,
  loadStore,
  mockGET,
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

  it('does not POST a clientOnly action, only fires the event', async () => {
    const list = (await getList({
      endpoint: '/test-assets/content-list/items.json'
    })) as ContentList;
    // An action-endpoint is set, but a clientOnly action must still
    // skip the POST and leave the work (e.g. opening a modal) to the host.
    list.actionEndpoint = '/test-assets/content-list/action';
    list.columns = [{ key: 'name' }];
    list.bulkActions = [{ key: 'send', label: 'Send', clientOnly: true }];
    (list as any).selectedIds = new Set(['u-1']);
    await list.updateComplete;

    const fetchStub = window.fetch as any;
    const countPosts = () =>
      fetchStub
        .getCalls()
        .filter((c: any) => (c.args[1] || {}).method === 'POST').length;
    const postsBefore = countPosts();

    let bulkDetail: any = null;
    list.addEventListener(CustomEventType.BulkAction, (e: Event) => {
      bulkDetail = (e as CustomEvent).detail;
    });

    const action = list.shadowRoot!.querySelector(
      '.bulk-action'
    ) as HTMLElement;
    assert.exists(action, 'bulk action button should render');
    action.click();
    await list.updateComplete;

    expect(bulkDetail).to.deep.equal({ action: 'send', ids: ['u-1'] });
    expect(countPosts()).to.equal(postsBefore);
  });

  it('folds the committed search into the content-menu-endpoint', async () => {
    const list = (await getList({
      endpoint: '/test-assets/content-list/items.json',
      // hosts bake the original request's query string into the
      // attribute, so a deep-linked search arrives pre-folded
      'content-menu-endpoint': '/contact/active/?search=stale'
    })) as ContentList;

    const header = () =>
      list
        .shadowRoot!.querySelector('temba-page-header')!
        .getAttribute('content-menu-endpoint');

    // no committed search → any search baked into the attribute is
    // stripped, so search-dependent items (e.g. Create Smart Group)
    // don't linger once the search is gone
    expect(header()).to.equal('/contact/active/');

    // a committed search is folded in so the server's build_context_menu
    // sees it (and can surface e.g. the Create Smart Group button)
    (list as any).search = 'age > 30';
    await list.updateComplete;
    expect(header()).to.contain('search=age');

    // clearing the search strips it again
    (list as any).search = '';
    await list.updateComplete;
    expect(header()).to.equal('/contact/active/');
  });

  it('marks the frame scrolled-down so the header gets a scroll shadow', async () => {
    const list = (await getList({
      endpoint: '/test-assets/content-list/items.json'
    })) as ContentList;
    list.columns = [{ key: 'name' }];
    await list.updateComplete;

    const scroll = list.shadowRoot!.querySelector(
      '.table-scroll'
    ) as HTMLElement;
    const frame = list.shadowRoot!.querySelector('.table-frame') as HTMLElement;

    // not scrolled yet
    expect(frame.classList.contains('scrolled-down')).to.be.false;

    // constrain the height so the body can scroll under the sticky header
    scroll.style.maxHeight = '40px';
    scroll.scrollTop = 100;
    scroll.dispatchEvent(new Event('scroll'));
    await list.updateComplete;

    expect(frame.classList.contains('scrolled-down')).to.be.true;
  });

  it('stacks the subtitle tight under the title and truncates it', async () => {
    const longSubtitle =
      'A long sub-header that should stay on the title side of the header and truncate with an ellipsis when it runs into the pagination and content menu on the right, rather than flowing full width.';
    const list = (await getList({
      endpoint: '/test-assets/content-list/items.json',
      subtitle: longSubtitle
    })) as ContentList;
    await list.updateComplete;

    const header = list.shadowRoot!.querySelector(
      'temba-page-header'
    ) as HTMLElement & { updateComplete: Promise<unknown> };
    await header.updateComplete;
    const sub = header.shadowRoot!.querySelector('.subtitle') as HTMLElement;
    const titleBlock = header.shadowRoot!.querySelector(
      '.title-block'
    ) as HTMLElement;
    const actions = header.shadowRoot!.querySelector('.actions') as HTMLElement;
    assert.exists(sub, 'subtitle should render');
    assert.exists(titleBlock, 'title block should render');

    // the subtitle lives in the left title block, not full width — it
    // stays left of the actions (pagination + content menu)
    expect(sub.getBoundingClientRect().right).to.be.at.most(
      actions.getBoundingClientRect().left + 1
    );

    // and it truncates rather than wrapping when it runs out of room
    const style = getComputedStyle(sub);
    expect(style.whiteSpace).to.equal('nowrap');
    expect(style.textOverflow).to.equal('ellipsis');
    expect(sub.scrollWidth).to.be.greaterThan(sub.clientWidth);

    // since it truncates, the full text is offered as a hover tooltip
    expect(sub.getAttribute('title')).to.equal(longSubtitle);
  });

  it('shows the empty state over the body, not as a table cell', async () => {
    const list = (await getList()) as ContentList;
    list.columns = [{ key: 'name' }];
    list.emptyMessage = 'No contacts';
    (list as any).items = [];
    (list as any).loading = false;
    (list as any).requestUpdate();
    await list.updateComplete;

    // rendered as a sibling overlay (centered in the container) rather
    // than a colspan row that would scroll off with an overflowing table
    const state = list.shadowRoot!.querySelector('.list-state') as HTMLElement;
    assert.exists(state, 'empty state should render');
    expect(state.textContent!.trim()).to.equal('No contacts');
    expect(list.shadowRoot!.querySelector('tbody td')).to.not.exist;
    expect(state.closest('.table-scroll')).to.equal(null);
  });

  it('suppresses the horizontal scroll when there are no rows', async () => {
    const list = (await getList()) as ContentList;
    list.columns = [{ key: 'name' }];
    list.minTableWidth = '1400px';
    (list as any).items = [];
    (list as any).loading = false;
    (list as any).requestUpdate();
    await list.updateComplete;

    const scroll = list.shadowRoot!.querySelector(
      '.table-scroll'
    ) as HTMLElement;
    const table = list.shadowRoot!.querySelector('table.table') as HTMLElement;

    // no rows → the scroller hides overflow-x and the forced min-width is
    // dropped, so a wide column set can't arm a horizontal scrollbar
    expect(scroll.classList.contains('no-rows')).to.be.true;
    expect(getComputedStyle(scroll).overflowX).to.equal('hidden');
    expect(table.style.minWidth).to.equal('');

    // once rows are present the scroll is armed again (min-width restored)
    (list as any).items = [{ uuid: 'u-1', name: 'Alpha' }];
    (list as any).requestUpdate();
    await list.updateComplete;
    expect(scroll.classList.contains('no-rows')).to.be.false;
    expect(table.style.minWidth).to.equal('1400px');
  });

  it('reflects membership from labelsKey across the selected rows', async () => {
    const list = (await getList()) as ContentList;
    (list as any).items = [
      { uuid: 'c1', groups: [{ uuid: 'g1' }, { uuid: 'g2' }] },
      { uuid: 'c2', groups: [{ uuid: 'g1' }] }
    ];
    (list as any).selectedIds = new Set(['c1', 'c2']);

    // g1 is on both selected rows → all; g2 on one → some; g3 on none
    expect((list as any).computeLabelState('g1', 'groups')).to.equal('all');
    expect((list as any).computeLabelState('g2', 'groups')).to.equal('some');
    expect((list as any).computeLabelState('g3', 'groups')).to.equal('none');
    // the default key ('labels') finds nothing on contact rows
    expect((list as any).computeLabelState('g1')).to.equal('none');
  });

  it('builds a contact-read href for message rows', async () => {
    const list = (await getComponent('temba-msg-list', {}, '', 700)) as MsgList;
    expect((list as any).getRowHref({ contact: { uuid: 'c-123' } })).to.equal(
      '/contact/read/c-123/'
    );
    // No uuid (or no contact at all) leaves the row non-navigating.
    expect((list as any).getRowHref({ contact: {} })).to.equal(null);
    expect((list as any).getRowHref({})).to.equal(null);
  });

  it('fires temba-redirected on row click when the row has an href', async () => {
    const list = (await getList({
      endpoint: '/test-assets/content-list/items.json'
    })) as ContentList;
    list.columns = [{ key: 'name' }];
    // Make rows navigate; this also marks them `.clickable`.
    (list as any).getRowHref = (item: any) => `/contact/read/${item.uuid}/`;
    (list as any).requestUpdate();
    await list.updateComplete;

    let redirectUrl: string | null = null;
    list.addEventListener(CustomEventType.Redirected, (e: Event) => {
      redirectUrl = (e as CustomEvent).detail.url;
    });

    const row = list.shadowRoot!.querySelector(
      'tr.row.clickable'
    ) as HTMLElement;
    assert.exists(row, 'first row should be clickable');
    row.click();

    // Routes through the SPA via the Redirected event rather than a
    // full-page window.location assignment.
    expect(redirectUrl).to.equal('/contact/read/u-1/');
  });

  it('opens a new tab on meta-click without firing temba-redirected', async () => {
    const list = (await getList({
      endpoint: '/test-assets/content-list/items.json'
    })) as ContentList;
    list.columns = [{ key: 'name' }];
    (list as any).getRowHref = (item: any) => `/contact/read/${item.uuid}/`;
    (list as any).requestUpdate();
    await list.updateComplete;

    let redirected = false;
    list.addEventListener(CustomEventType.Redirected, () => {
      redirected = true;
    });

    const openStub = stub(window, 'open');
    try {
      const row = list.shadowRoot!.querySelector(
        'tr.row.clickable'
      ) as HTMLElement;
      row.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          composed: true,
          metaKey: true
        })
      );
      expect(openStub.calledOnceWithExactly('/contact/read/u-1/', '_blank')).to
        .be.true;
      expect(redirected).to.be.false;
    } finally {
      openStub.restore();
    }
  });

  it('truncates a long message instead of widening the table (auto layout)', async () => {
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

    // the message list is auto layout (so Contact/Sent size to content)
    expect((list as any).fixedLayout).to.be.false;

    // the long first message overflows (ellipsizes) within its cell
    const msgText = list.shadowRoot!.querySelector(
      'tr.row td.grow .msg-text'
    ) as HTMLElement;
    assert.exists(msgText, 'message text should render');
    expect(msgText.scrollWidth).to.be.greaterThan(msgText.clientWidth);

    // ...rather than stretching the table past its scroll frame
    const scroll = list.shadowRoot!.querySelector(
      '.table-scroll'
    ) as HTMLElement;
    expect(scroll.scrollWidth).to.be.at.most(scroll.clientWidth + 1);
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

  it('renders attachment thumbnails immediately after the message text', async () => {
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

    const thumb = list.shadowRoot!.querySelector('.msg-thumb') as HTMLElement;
    assert.exists(thumb, 'a row should render an attachment thumbnail');
    const cell = thumb.closest('.msg-cell') as HTMLElement;
    const text = cell.querySelector('.msg-text') as HTMLElement;

    // the thumbnail trails the message text directly — separated only
    // by the cell's own gap, not pushed to the trailing edge
    const gap =
      thumb.getBoundingClientRect().left - text.getBoundingClientRect().right;
    expect(gap).to.be.greaterThan(0);
    expect(gap).to.be.lessThan(20);
  });

  it('starts an attachment-only message with the attachment', async () => {
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

    // the fixture's last row (Grace Liu) carries an attachment and no text
    const cells = Array.from(
      list.shadowRoot!.querySelectorAll('.msg-cell')
    ) as HTMLElement[];
    const cell = cells[cells.length - 1];
    const thumb = cell.querySelector('.msg-thumb') as HTMLElement;
    assert.exists(thumb, 'the attachment-only row should render a thumbnail');
    assert.notExists(
      cell.querySelector('.msg-text'),
      'an attachment-only row should render no text span'
    );

    // with no text span, the thumbnail sits at the cell's leading edge
    // rather than floating after an empty text placeholder
    expect(
      thumb.getBoundingClientRect().left - cell.getBoundingClientRect().left
    ).to.be.lessThan(2);
  });

  it('aligns the bulk bar with the row text when the row has no icon', async () => {
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

    (list as any).selectedIds = new Set(
      (list as any).items.map((i: any) => (list as any).rowId(i))
    );
    (list as any).requestUpdate();
    await list.updateComplete;

    const bar = list.shadowRoot!.querySelector('.bulk-bar') as HTMLElement;
    assert.exists(bar, 'bulk bar should render when rows are selected');

    // messages have no row icon, so the first chip's *left edge* (not its
    // icon) lines up with the first column's text — the bulk buttons
    // start at the contact name
    const chip = bar.querySelector('.bulk-action') as HTMLElement;
    const lead = list.shadowRoot!.querySelector(
      'tr.row td.cell .cell-inner'
    ) as HTMLElement;
    expect(
      Math.abs(
        chip.getBoundingClientRect().left - lead.getBoundingClientRect().left
      )
    ).to.be.lessThan(1.5);
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
    // is settled before snapshotting. Cap at 2s so a fixture change
    // that produces no featured fields fails fast with a clear
    // assertion instead of hanging until the mocha timeout.
    for (
      let i = 0;
      i < 200 && (list as any).featuredFields?.length === 0;
      i++
    ) {
      await new Promise((r) => setTimeout(r, 10));
    }
    expect((list as any).featuredFields?.length).to.be.greaterThan(0);
    await list.updateComplete;
    await assertScreenshot('content-list/contacts', getClip(list));
  });

  it('overlays the bulk action bar on the column header when rows are selected (screenshot)', async () => {
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
    for (
      let i = 0;
      i < 200 && (list as any).featuredFields?.length === 0;
      i++
    ) {
      await new Promise((r) => setTimeout(r, 10));
    }
    // select every row so the bulk bar shows over the column headers,
    // just right of the (now all-checked) select-all checkbox
    (list as any).selectedIds = new Set(
      (list as any).items.map((i: any) => i.uuid)
    );
    (list as any).requestUpdate();
    await list.updateComplete;

    const bar = list.shadowRoot!.querySelector('.bulk-bar') as HTMLElement;
    assert.exists(bar, 'bulk bar should render when rows are selected');

    // the first action chip's left edge lines up with the row's
    // leading content (the contact silhouette icon) — same rule as the
    // message list, where it aligns with the leading text
    const chip = bar.querySelector('.bulk-action') as HTMLElement;
    const lead = list.shadowRoot!.querySelector(
      'tr.row td.lead-cell .lead-icon'
    ) as HTMLElement;
    expect(
      Math.abs(
        chip.getBoundingClientRect().left - lead.getBoundingClientRect().left
      )
    ).to.be.lessThan(1.5);
    // the page header (search/menu) is NOT replaced
    assert.exists(
      list.shadowRoot!.querySelector('temba-page-header'),
      'page header stays put'
    );
    // let the checkbox check animation settle so the capture is stable
    await new Promise((r) => setTimeout(r, 300));
    await assertScreenshot('content-list/contacts-bulk', getClip(list));
  });

  it('collapses the bulk action labels to icons when the bar is too narrow', async () => {
    await loadStore();
    const list = (await getComponent(
      'temba-contact-list',
      { endpoint: '/test-assets/content-list/contacts.json' },
      '',
      360
    )) as ContactList;
    await new Promise<void>((resolve) => {
      list.addEventListener(CustomEventType.FetchComplete, () => resolve(), {
        once: true
      });
    });
    for (
      let i = 0;
      i < 200 && (list as any).featuredFields?.length === 0;
      i++
    ) {
      await new Promise((r) => setTimeout(r, 10));
    }
    (list as any).selectedIds = new Set(
      (list as any).items.map((i: any) => i.uuid)
    );
    (list as any).requestUpdate();
    await list.updateComplete;
    // the collapse decision is measured in updated() and sets reactive
    // state, so let that second render settle
    await list.updateComplete;

    const bar = list.shadowRoot!.querySelector('.bulk-bar') as HTMLElement;
    expect(bar.classList.contains('collapsed')).to.be.true;
    expect((list as any).bulkCollapsed).to.be.true;
    await new Promise((r) => setTimeout(r, 300));
    await assertScreenshot(
      'content-list/contacts-bulk-collapsed',
      getClip(list)
    );
  });

  it('shows the location leaf, a created-on column, and actual dates', async () => {
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
    for (
      let i = 0;
      i < 200 && (list as any).featuredFields?.length === 0;
      i++
    ) {
      await new Promise((r) => setTimeout(r, 10));
    }
    await list.updateComplete;

    // a created-on column is rendered alongside last-seen
    const colKeys = (list as any).columns.map((c: any) => c.key);
    expect(colKeys).to.include('created_on');
    expect(colKeys).to.include('last_seen_on');

    // location (ward) values show only the leaf, not the full hierarchy
    expect(
      (list as any).locationLeaf('Nigeria > Yobe > Nguru > Dabule')
    ).to.equal('Dabule');
    const text = list.shadowRoot!.textContent || '';
    expect(text).to.contain('Oakland');
    expect(text).to.not.contain('USA > California');

    // every date cell renders via the timedate format
    const displays = Array.from(
      list.shadowRoot!.querySelectorAll('temba-date')
    ).map((d) => d.getAttribute('display'));
    expect(displays.length).to.be.greaterThan(0);
    expect(displays.every((d) => d === 'timedate')).to.be.true;

    // empty field values render as the -- placeholder (one contact has no gender)
    expect(text).to.contain('--');

    // last-seen is no longer a pinned column
    const lastSeen = (list as any).columns.find(
      (c: any) => c.key === 'last_seen_on'
    );
    expect(lastSeen.pinned).to.be.undefined;
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

  it('renders the triggers list (screenshot)', async () => {
    await loadStore();
    const list = (await getComponent(
      'temba-trigger-list',
      { endpoint: '/test-assets/content-list/triggers.json' },
      '',
      1100
    )) as TriggerList;
    await new Promise<void>((resolve) => {
      list.addEventListener(CustomEventType.FetchComplete, () => resolve(), {
        once: true
      });
    });
    await list.updateComplete;
    await assertScreenshot('content-list/triggers', getClip(list));
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

  it('shows the run-search icon and its hint only while a pending draft is uncommitted', async () => {
    const list = (await getList({
      endpoint: '/test-assets/content-list/items.json'
    })) as ContentList;
    list.columns = [{ key: 'name', label: 'Name' }];
    await list.updateComplete;

    // Open search with no draft — nothing to run, so neither the run
    // icon nor the "↵ to search" hint is rendered.
    (list as any).searchOpen = true;
    await list.updateComplete;
    expect(list.shadowRoot!.querySelector('.searchbar .search-go')).to.equal(
      null
    );
    expect(list.shadowRoot!.querySelector('.searchbar .search-hint')).to.equal(
      null
    );

    // A draft that differs from the committed search is pending — the
    // icon and the hint appear (the click/Enter equivalent).
    (list as any).searchDraft = 'a';
    (list as any).requestUpdate();
    await list.updateComplete;
    expect(
      list.shadowRoot!.querySelector('.searchbar .search-go')
    ).to.not.equal(null);
    expect(
      list.shadowRoot!.querySelector('.searchbar .search-hint')
    ).to.not.equal(null);

    // Committing the draft clears the pending state, so the icon and the
    // hint go away again.
    const onFetch = new Promise<void>((resolve) => {
      list.addEventListener(CustomEventType.FetchComplete, () => resolve(), {
        once: true
      });
    });
    (list as any).commitSearch();
    await onFetch;
    await list.updateComplete;
    expect(list.shadowRoot!.querySelector('.searchbar .search-go')).to.equal(
      null
    );
    expect(list.shadowRoot!.querySelector('.searchbar .search-hint')).to.equal(
      null
    );

    // The result count is no longer in the search bar — it rides with
    // the pagination controls instead.
    expect(list.shadowRoot!.querySelector('.searchbar .result-count')).to.equal(
      null
    );
  });

  it('toggles the header Search button against the open search bar and cancels out', async () => {
    const list = (await getList({
      endpoint: '/test-assets/content-list/items.json'
    })) as ContentList;
    list.columns = [{ key: 'name', label: 'Name' }];
    await list.updateComplete;

    // Closed: the header Search action is the way in, the bar is absent.
    expect(
      list.shadowRoot!.querySelector('.header-actions .action')
    ).to.not.equal(null);
    expect(list.shadowRoot!.querySelector('.searchbar')).to.equal(null);

    // Opening hides the header Search action (it became the bar) and
    // surfaces the always-present Cancel control as the way out.
    (list as any).toggleSearch();
    await list.updateComplete;
    expect(list.shadowRoot!.querySelector('.header-actions .action')).to.equal(
      null
    );
    const cancel = list.shadowRoot!.querySelector(
      '.searchbar .search-cancel'
    ) as HTMLElement;
    expect(cancel).to.not.equal(null);

    // Cancel closes the bar and restores the header Search action.
    cancel.click();
    await list.updateComplete;
    expect((list as any).searchOpen).to.equal(false);
    expect(list.shadowRoot!.querySelector('.searchbar')).to.equal(null);
    expect(
      list.shadowRoot!.querySelector('.header-actions .action')
    ).to.not.equal(null);
  });

  it('shows the run-search icon whenever the draft varies from the results query, including when emptied', async () => {
    const list = (await getList({
      endpoint: '/test-assets/content-list/items.json'
    })) as ContentList;
    list.columns = [{ key: 'name', label: 'Name' }];

    // Results are based on a committed query and the box matches it —
    // nothing to run, so the icon isn't rendered.
    (list as any).searchOpen = true;
    (list as any).search = 'age > 30';
    (list as any).searchDraft = 'age > 30';
    (list as any).requestUpdate();
    await list.updateComplete;
    expect(list.shadowRoot!.querySelector('.searchbar .search-go')).to.equal(
      null
    );

    // Emptying the box while the results still reflect the old query is
    // a variance too — the icon appears so the user can run the now
    // empty (cleared) search.
    (list as any).searchDraft = '';
    (list as any).requestUpdate();
    await list.updateComplete;
    expect(
      list.shadowRoot!.querySelector('.searchbar .search-go')
    ).to.not.equal(null);
  });

  it('disables the search input while a search is in flight', async () => {
    const list = (await getList({
      endpoint: '/test-assets/content-list/items.json'
    })) as ContentList;
    list.columns = [{ key: 'name', label: 'Name' }];
    (list as any).searchOpen = true;
    await list.updateComplete;

    const input = () =>
      list.shadowRoot!.querySelector('.searchbar input') as HTMLInputElement;
    expect(input().disabled).to.equal(false);

    (list as any).searching = true;
    (list as any).requestUpdate();
    await list.updateComplete;
    expect(input().disabled).to.equal(true);
    // the run icon isn't rendered against the disabled box mid-search
    expect(list.shadowRoot!.querySelector('.searchbar .search-go')).to.equal(
      null
    );

    (list as any).searching = false;
    (list as any).requestUpdate();
    await list.updateComplete;
    expect(input().disabled).to.equal(false);
  });

  it('adopts a server-adjusted query, mirrors it into the box, and parks the cursor at the end', async () => {
    // The search response echoes a normalized query ("age>30" → "age > 30").
    mockGET(/items\.json\?.*search=/, {
      results: [{ uuid: 'u-1', name: 'Alpha' }],
      count: 1,
      query: 'age > 30'
    });
    try {
      const list = (await getList({
        endpoint: '/test-assets/content-list/items.json'
      })) as ContentList;
      list.columns = [{ key: 'name', label: 'Name' }];
      (list as any).searchOpen = true;
      await list.updateComplete;

      // Type an un-normalized query and run it.
      (list as any).searchDraft = 'age>30';
      const onFetch = new Promise<void>((resolve) => {
        list.addEventListener(CustomEventType.FetchComplete, () => resolve(), {
          once: true
        });
      });
      (list as any).commitSearch();
      await onFetch;
      await list.updateComplete;
      // let the post-fetch focus/caret microtask run
      await new Promise((r) => setTimeout(r, 0));

      // The box now shows the adjusted query, which is also the basis of
      // the results — so the Search button is hidden again.
      expect((list as any).searchDraft).to.equal('age > 30');
      expect((list as any).search).to.equal('age > 30');
      const input = list.shadowRoot!.querySelector(
        '.searchbar input'
      ) as HTMLInputElement;
      expect(input.value).to.equal('age > 30');
      expect(input.disabled).to.equal(false);
      expect(list.shadowRoot!.querySelector('.searchbar .search-go')).to.equal(
        null
      );

      // Caret parked at the end of the (adjusted) value.
      expect(input.selectionStart).to.equal('age > 30'.length);
      expect(input.selectionEnd).to.equal('age > 30'.length);
    } finally {
      clearMockGets();
    }
  });

  it('surfaces a query-validation error over the empty table, then clears it on a good search', async () => {
    // A bad query comes back list-shaped (empty) with an `error` message.
    mockGET(/items\.json\?.*search=/, {
      results: [],
      count: 0,
      error: "mismatched input '<EOF>'"
    });
    try {
      const list = (await getList({
        endpoint: '/test-assets/content-list/items.json'
      })) as ContentList;
      list.columns = [{ key: 'name', label: 'Name' }];
      (list as any).searchOpen = true;
      await list.updateComplete;

      (list as any).searchDraft = 'age >';
      let onFetch = new Promise<void>((resolve) => {
        list.addEventListener(CustomEventType.FetchComplete, () => resolve(), {
          once: true
        });
      });
      (list as any).commitSearch();
      await onFetch;
      await list.updateComplete;

      // The error takes over the empty-table slot (with error styling),
      // not the plain "nothing to show" copy.
      expect((list as any).searchError).to.equal("mismatched input '<EOF>'");
      const state = list.shadowRoot!.querySelector(
        '.list-state.error .state-error'
      ) as HTMLElement;
      assert.exists(state, 'error state should render');
      expect(state.textContent!.trim()).to.contain("mismatched input '<EOF>'");
      expect(list.shadowRoot!.querySelectorAll('tbody tr').length).to.equal(0);

      // A subsequent good search clears the error.
      clearMockGets();
      mockGET(/items\.json\?.*search=/, {
        results: [{ uuid: 'u-1', name: 'Alpha' }],
        count: 1
      });
      (list as any).searchDraft = 'age > 30';
      onFetch = new Promise<void>((resolve) => {
        list.addEventListener(CustomEventType.FetchComplete, () => resolve(), {
          once: true
        });
      });
      (list as any).commitSearch();
      await onFetch;
      await list.updateComplete;

      expect((list as any).searchError).to.equal('');
      expect(list.shadowRoot!.querySelector('.list-state.error')).to.equal(
        null
      );
    } finally {
      clearMockGets();
    }
  });

  it('shows the count in the pager in cursor mode', async () => {
    const list = (await getList({
      endpoint: '/test-assets/content-list/items.json'
    })) as ContentList;
    // Cursor list that also carries a count (e.g. the message list's
    // cheap folder count) — the pager should still show "N–M of Total".
    // `last` is derived from the rows shown, so seed a full page of items.
    Object.assign(list as any, {
      cursorMode: true,
      hasCount: true,
      total: 42,
      pageSize: 10,
      page: 2,
      items: Array.from({ length: 10 }, (_, i) => ({ uuid: `u-${i}` })),
      prevCursor: '/x?cursor=a',
      nextCursor: '/x?cursor=b'
    });
    (list as any).requestUpdate();
    await list.updateComplete;

    const status = list.shadowRoot!.querySelector(
      '.pager-status'
    ) as HTMLElement;
    assert.exists(status, 'pager status should render in counted cursor mode');
    const text = status.textContent!.replace(/\s+/g, ' ').trim();
    expect(text).to.contain('11');
    expect(text).to.contain('20');
    expect(text).to.contain('of 42');
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
    // the event carries the address-bar URL for the new state so the
    // host can reflect it when it pushes the history entry
    expect(searchEvent.url).to.contain('search=a');

    // clearing the search drops the param from the bubbled URL
    events.length = 0;
    const onClear = new Promise<void>((resolve) => {
      list.addEventListener(CustomEventType.FetchComplete, () => resolve(), {
        once: true
      });
    });
    (list as any).clearSearch();
    await onClear;

    const clearEvent = events[events.length - 1];
    expect(clearEvent.state.search).to.equal('');
    expect(clearEvent.url).to.not.contain('search=');
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

  it('falls back to URL params when history has no stash for the key', async () => {
    const originalUrl = window.location.pathname + window.location.search;
    // Fresh navigation: no stash for this key yet, but the link itself
    // deep-links a search (e.g. /contact/?search=age%3E10).
    history.replaceState({}, '', '?search=age+%3E+10&sort=-name');
    try {
      const list = (await getList({
        endpoint: '/test-assets/content-list/items.json',
        'history-state-key': 'contacts'
      })) as ContentList;
      list.columns = [{ key: 'name', label: 'Name' }];
      await list.updateComplete;

      expect((list as any).search).to.equal('age > 10');
      expect((list as any).sort).to.equal('-name');
      // the search bar opens showing the active query
      expect((list as any).searchOpen).to.equal(true);
      expect((list as any).searchDraft).to.equal('age > 10');
      // and the fetch carried it to the endpoint
      expect((list as any).currentUrl).to.contain('search=');

      // Once a stash exists for the key it wins over the (now stale)
      // query string still sitting in the URL.
      history.replaceState({ contacts: { page: 1, sort: '', search: '' } }, '');
      const onFetch = new Promise<void>((resolve) => {
        list.addEventListener(CustomEventType.FetchComplete, () => resolve(), {
          once: true
        });
      });
      window.dispatchEvent(new PopStateEvent('popstate'));
      await onFetch;
      expect((list as any).search).to.equal('');
      expect((list as any).searchOpen).to.equal(false);
    } finally {
      history.replaceState({}, '', originalUrl);
    }
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

  it('shows the label dropdown create row and fires temba-label-create', async () => {
    const list = (await getList({
      endpoint: '/test-assets/content-list/items.json'
    })) as ContentList;
    list.columns = [{ key: 'name', label: 'Name' }];
    const action = {
      key: 'label',
      label: 'Label',
      labelsEndpoint: '/test-assets/content-list/labels.json',
      allowCreate: true
    };
    list.bulkActions = [action];
    (list as any).selectedIds = new Set(
      (list as any).items.map((i: any) => (list as any).rowId(i))
    );
    (list as any).requestUpdate();
    await list.updateComplete;

    // before the dropdown's lazy fetch the create row isn't rendered yet
    assert.notExists(list.shadowRoot!.querySelector('.lbl-create'));

    await (list as any).handleLabelDropdownOpened(action);
    await list.updateComplete;

    const create = list.shadowRoot!.querySelector('.lbl-create') as HTMLElement;
    assert.exists(create, 'create row should render when allowCreate is set');

    let detail: any = null;
    list.addEventListener(CustomEventType.LabelCreate, ((e: CustomEvent) => {
      detail = e.detail;
    }) as EventListener);
    create.click();
    expect(detail.action).to.equal('label');
    expect(detail.ids).to.deep.equal(['u-1', 'u-2', 'u-3']);

    // a refresh (e.g. after the host's create modal submits) drops the
    // cached dropdown labels so the next open re-fetches them
    list.refresh();
    expect((list as any).labelsByActionKey).to.deep.equal({});
  });

  it('shows an empty state in the label dropdown without allowCreate', async () => {
    const list = (await getList({
      endpoint: '/test-assets/content-list/items.json'
    })) as ContentList;
    list.columns = [{ key: 'name', label: 'Name' }];
    const action = {
      key: 'label',
      label: 'Label',
      labelsEndpoint: '/test-assets/content-list/labels-empty.json'
    };
    list.bulkActions = [action];
    (list as any).selectedIds = new Set(['u-1']);
    (list as any).requestUpdate();
    await list.updateComplete;

    await (list as any).handleLabelDropdownOpened(action);
    await list.updateComplete;

    // fetched-empty with no create affordance reads as "No labels", not a
    // permanent "Loading…"
    const empty = list.shadowRoot!.querySelector(
      '.label-menu-empty'
    ) as HTMLElement;
    assert.exists(empty);
    expect(empty.textContent).to.contain('No labels');
    assert.notExists(list.shadowRoot!.querySelector('.lbl-create'));
  });
});
