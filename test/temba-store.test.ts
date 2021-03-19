import { assert, fixture } from '@open-wc/testing';
import { Store } from '../src/store/Store';
import './utils';

const createStore = async (def: string): Promise<Store> => {
  const store = (await fixture(def)) as Store;
  await store.httpComplete;
  return store;
};

describe('temba-store', () => {
  it('is defined', async () => {
    const store = await createStore('<temba-store></temba-store>');
    assert.instanceOf(store, Store);
  });

  it('completion schema', async () => {
    const store: Store = await createStore(
      "<temba-store completions='/test-assets/store/completion.json'></temba-store>"
    );
    assert.equal(store.getCompletionSchema().types.length, 13);
  });

  it('function list', async () => {
    const store: Store = await createStore(
      "<temba-store functions='/test-assets/store/functions.json'></temba-store>"
    );
    assert.equal(store.getFunctions().length, 74);
  });

  it('globals', async () => {
    const store: Store = await createStore(
      "<temba-store globals='/test-assets/store/globals.json'></temba-store>"
    );
    assert.equal(store.getKeyedAssets().globals.length, 2);
  });

  it('fields', async () => {
    const store: Store = await createStore(
      "<temba-store fields='/test-assets/store/fields.json'></temba-store>"
    );

    assert.equal(store.getKeyedAssets().fields.length, 5);
  });
});
