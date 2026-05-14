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
