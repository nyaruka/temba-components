import { fixture, expect, assert } from '@open-wc/testing';
import { TembaList } from './TembaList';
import moxios from 'moxios';
import contacts_1 from '../../test-assets/lists/contacts_1.json';
import contacts_2 from '../../test-assets/lists/contacts_2.json';
import contacts_1_updated from '../../test-assets/lists/contacts_1_updated.json';
import contacts_2_updated from '../../test-assets/lists/contacts_2_updated.json';
import sinon, { clock } from 'sinon';

export const getListHTML = (attrs: any = {}) => {
  return `<temba-list valueKey="uuid" ${Object.keys(attrs)
    .map((name: string) => `${name}='${attrs[name]}'`)
    .join('')}></temba-list>`;
};

export const createList = async (def: string, delay: number = 0) => {
  var clock = sinon.useFakeTimers();
  const list: TembaList = await fixture(def);
  clock.tick(1);
  await list.updateComplete;
  await (window as any).waitFor(delay);
  clock.restore();
  return list;
};

export const refresh = async (list: TembaList) => {
  list.refreshKey = Math.random() + new Date().getTime() + '';
  await list.updateComplete;
  await (window as any).waitFor(0);
};

export const overrideStub = (url: string, response: {}) => {
  const l = moxios.stubs.count();
  for (let i = 0; i < l; i++) {
    const stub = moxios.stubs.at(i) as any;
    if (stub.url === url) {
      const oldResponse = stub.response;
      const restoreFunc = () => (stub.response = oldResponse);
      stub.response = response;
      return restoreFunc;
    }
  }
};

describe('temba-list', () => {
  beforeEach(() => {});
  afterEach(() => {});

  it('can be created', async () => {
    const list: TembaList = await fixture(getListHTML());
    assert.instanceOf(list, TembaList);
  });

  describe('endpoints', () => {
    beforeEach(() => {
      moxios.install();
      moxios.stubRequest('/contacts.json', {
        status: 200,
        responseText: JSON.stringify(contacts_1),
      });

      moxios.stubRequest('/contacts.json?page=2', {
        status: 200,
        responseText: JSON.stringify(contacts_2),
      });
    });

    afterEach(() => {
      moxios.uninstall();
    });

    it('fetches pages across scroll threshold', async () => {
      const list: TembaList = await createList(
        getListHTML({ endpoint: '/contacts.json' })
      );

      // we have one result per page, confirm we got both pages
      expect(list.items.length).to.equal(2);
      expect(list.pages).to.equal(2);
    });

    it('maintains selection across refreshes', async () => {
      const list: TembaList = await createList(
        getListHTML({ endpoint: '/contacts.json' })
      );

      expect(list.selected.name).to.equal('Ben Haggerty');

      // select our second item
      list.cursorIndex = 1;
      await list.updateComplete;

      // now trigger a refresh
      await refresh(list);
      expect(list.selected.name).to.equal('(206) 555-2381');

      // reselect our first contact
      list.cursorIndex = 0;
      await list.updateComplete;
      await refresh(list);
      expect(list.selected.name).to.equal('Ben Haggerty');

      // now the second contact sends in a message
      overrideStub('/contacts.json', {
        status: 200,
        responseText: JSON.stringify(contacts_1_updated),
      });

      overrideStub('/contacts.json?page=2', {
        status: 200,
        responseText: JSON.stringify(contacts_2_updated),
      });

      // we have Ben selected in the first position before refresh
      expect(list.cursorIndex).to.equal(0);
      expect(list.selected.name).to.equal('Ben Haggerty');
      expect(list.items[0].name).to.equal('Ben Haggerty');

      await refresh(list);

      // after refreshing our items should swap places
      expect(list.items[0].name).to.equal('(206) 555-2381');
      expect(list.items[1].name).to.equal('Ben Haggerty');

      // but we should still have Ben selected but in the second position
      expect(list.selected.name).to.equal('Ben Haggerty');
      expect(list.cursorIndex).to.equal(1);
    });
  });
});
