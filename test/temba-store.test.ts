import { assert, fixture } from '@open-wc/testing';
import { Store } from '../src/store/Store';
import {
  setRealtimeContext,
  subscribeToNotifications
} from '../src/live/Realtime';
import { setSocketProvider } from '../src/live/SocketService';
import { MockSocketProvider } from './utils.test';

const createStore = async (def: string): Promise<Store> => {
  const store = (await fixture(def)) as Store;
  await store.initialHttpComplete;
  return store;
};

describe('temba-store', () => {
  it('is defined', async () => {
    const store = await createStore('<temba-store></temba-store>');
    assert.instanceOf(store, Store);
  });

  it('completion schema', async () => {
    const store: Store = await createStore(
      "<temba-store completion='/test-assets/store/editor.json'></temba-store>"
    );
    assert.equal(store.getCompletionSchema().types.length, 16);
    assert.equal(store.getFunctions().length, 80);
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

    assert.equal(store.getKeyedAssets().fields.length, 8);
  });

  it('exposes postUrl', async () => {
    const store = await createStore('<temba-store></temba-store>');
    const response = await store.postUrl('/no-endpoint');
    assert.equal(response.status, 404);
  });

  it('sets the realtime context from org and user', async () => {
    const mockSocket = new MockSocketProvider();
    const previousProvider = setSocketProvider(mockSocket);

    try {
      // subscribe before the store exists, it should be waiting on context
      subscribeToNotifications(() => {});
      assert.deepEqual(mockSocket.activeChannels(), []);

      await createStore(
        "<temba-store org='org-uuid' user='user-uuid'></temba-store>"
      );
      assert.deepEqual(mockSocket.activeChannels(), [
        'notifications:org-uuid:user-uuid'
      ]);
    } finally {
      setRealtimeContext(null);
      setSocketProvider(previousProvider);
    }
  });
});
