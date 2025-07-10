import { assert, expect } from '@open-wc/testing';
import * as sinon from 'sinon';
import { useFakeTimers } from 'sinon';
import { CustomEventType } from '../src/interfaces';
import { TembaList } from '../src/list/TembaList';
import { assertScreenshot, getClip, getComponent } from './utils.test';
let clock;
const TAG = 'temba-list';
const getList = async (attrs = {}) => {
    const list = (await getComponent(TAG, attrs));
    if (!list.endpoint) {
        return list;
    }
    return new Promise((resolve) => {
        list.addEventListener(CustomEventType.FetchComplete, async () => {
            resolve(list);
        }, { once: true });
    });
};
describe('temba-list', () => {
    beforeEach(function () {
        clock = useFakeTimers();
    });
    afterEach(function () {
        clock.restore();
    });
    it('can be created', async () => {
        const list = await getList();
        assert.instanceOf(list, TembaList);
        expect(list.items.length).to.equal(0);
    });
    it('shows empty list with bad endpoint', async () => {
        const list = await getList({ endpoint: 'expected-404.json' });
        expect(list.items.length).to.equal(0);
    });
    it('renders with endpoint', async () => {
        const list = await getList({
            endpoint: '/test-assets/list/temba-list.json'
        });
        expect(list.items.length).to.equal(4);
        await assertScreenshot('list/items', getClip(list));
    });
    it('fires change event on cursor change', async () => {
        const list = await getList({
            endpoint: '/test-assets/list/temba-list.json'
        });
        const changeTest = new Promise((resolve) => {
            list.addEventListener('change', () => {
                resolve();
            });
        });
        list.cursorIndex = 1;
        await changeTest;
        await assertScreenshot('list/items-selected', getClip(list));
    });
    it('fires change when first element changes after fetch', async () => {
        const list = await getList({
            endpoint: '/test-assets/list/temba-list.json'
        });
        // spy on change event
        const changeEvent = sinon.spy();
        list.addEventListener('change', changeEvent);
        const refreshTest = new Promise((resolve) => {
            list.addEventListener(CustomEventType.FetchComplete, () => {
                resolve();
            });
        });
        list.endpoint = '/test-assets/list/temba-list-shorter.json';
        await refreshTest;
        assert(changeEvent.called, 'change event not fired');
        await assertScreenshot('list/items-updated', getClip(list));
    });
});
//# sourceMappingURL=temba-list.test.js.map