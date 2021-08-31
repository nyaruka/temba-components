import { assert, expect } from '@open-wc/testing';
import sinon from 'sinon';
import { TembaList } from '../src/list/TembaList';
import { assertScreenshot, getClip, getComponent } from './utils.test';

const TAG = 'temba-list';
const getList = async (attrs: any = {}) => {
  const list = (await getComponent(TAG, attrs)) as TembaList;

  // wait for the fetch
  await list.httpComplete;

  return list;
};

describe('temba-list', () => {
  it('can be created', async () => {
    const list: TembaList = await getList();
    assert.instanceOf(list, TembaList);
    expect(list.items.length).to.equal(0);
  });

  it('shows empty list with bad endpoint', async () => {
    const list: TembaList = await getList({ endpoint: 'expected-404.json' });
    expect(list.items.length).to.equal(0);
  });

  it('renders with endpoint', async () => {
    const list: TembaList = await getList({
      endpoint: '/test-assets/list/temba-list.json',
    });
    expect(list.items.length).to.equal(4);
    await assertScreenshot('list/items', getClip(list));
  });

  it('fires change event on cursor change', async () => {
    const list: TembaList = await getList({
      endpoint: '/test-assets/list/temba-list.json',
    });

    const changeEvent = sinon.spy();

    list.addEventListener('change', changeEvent);
    list.cursorIndex = 1;

    // let our event fire
    await waitFor(0);

    assert(changeEvent.called, 'change event not fired');
    await assertScreenshot('list/items-selected', getClip(list));
  });

  it('fires change when first element changes after fetch', async () => {
    const list: TembaList = await getList({
      endpoint: '/test-assets/list/temba-list.json',
    });

    // spy on change event
    const changeEvent = sinon.spy();
    list.addEventListener('change', changeEvent);

    // don't let our list reset on endpoint change
    list.preserve = true;
    list.endpoint = '/test-assets/list/temba-list-shorter.json';

    // refresh our endpoint and wait for event to fire
    await waitFor(0);
    await list.httpComplete;

    assert(changeEvent.called, 'change event not fired');
    await assertScreenshot('list/items-updated', getClip(list));
  });
});
