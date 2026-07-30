import { assert, fixture } from '@open-wc/testing';
import { Store } from '../src/store/Store';
import {
  setRealtimeContext,
  subscribeToNotifications
} from '../src/live/Realtime';
import { setSocketProvider } from '../src/live/SocketService';
import { mockAssetResolver, MockSocketProvider } from './utils.test';

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
        'notifications:org-uuid:user-uuid',
        'org:org-uuid'
      ]);
    } finally {
      setRealtimeContext(null);
      setSocketProvider(previousProvider);
    }
  });

  it('lazily resolves assets once and fans out organization changes', async () => {
    const mockSocket = new MockSocketProvider();
    const previousProvider = setSocketProvider(mockSocket);
    const flowUuid = '11111111-1111-4111-8111-111111111111';
    const groupUuid = '3da236a9-9eed-4db3-a18e-cfb58030c249';
    const contactUuid = '22222222-2222-4222-8222-222222222222';

    try {
      mockAssetResolver();
      const store = await createStore(`
        <temba-store
          org="org-uuid"
          user="user-uuid"
          assets="/test-assets/store/assets.json"
        ></temba-store>
      `);
      const events = [];
      store.watchAssets(
        [
          { type: 'flow', uuid: flowUuid },
          { type: 'group', uuid: groupUuid },
          { type: 'contact', uuid: contactUuid }
        ],
        (event) => events.push(event)
      );
      await Promise.resolve();

      mockSocket.serverPublish('org:org-uuid', {
        type: 'asset_changed',
        asset: {
          type: 'contact',
          uuid: '99999999-9999-4999-8999-999999999999',
          name: 'Unrelated'
        }
      });
      assert.isNull(
        store.getAsset('contact', '99999999-9999-4999-8999-999999999999')
      );
      assert.deepEqual(events, [null]);

      assert.isNull(store.getAsset('flow', flowUuid));

      const requested = [
        {
          type: 'flow',
          uuid: flowUuid
        },
        {
          type: 'group',
          uuid: groupUuid
        },
        {
          type: 'contact',
          uuid: contactUuid
        }
      ];
      const assetRequestsBefore = (window.fetch as any)
        .getCalls()
        .filter((call) =>
          `${call.args[0]}`.includes('/store/assets.json')
        ).length;
      const first = await store.resolveAssets(requested);
      const second = await store.resolveAssets(requested);
      const assetRequests = (window.fetch as any)
        .getCalls()
        .filter((call) => `${call.args[0]}`.includes('/store/assets.json'));
      const request = assetRequests[assetRequests.length - 1];
      assert.equal(assetRequests.length, assetRequestsBefore + 1);
      assert.equal(request.args[1].method, 'POST');
      assert.deepEqual(JSON.parse(request.args[1].body), {
        flow: [flowUuid],
        group: [groupUuid],
        contact: [contactUuid]
      });

      assert.equal(store.getAsset('flow', flowUuid).name, 'Current Child Flow');
      assert.equal(store.getAsset('group', groupUuid).name, 'Farmers');
      assert.equal(store.getAsset('contact', contactUuid).name, 'Alice');
      assert.deepEqual(second, first);
      assert.deepEqual(events, [null]);

      mockSocket.serverPublish('org:org-uuid', {
        type: 'asset_changed',
        asset: {
          type: 'group',
          uuid: '3da236a9-9eed-4db3-a18e-cfb58030c249',
          name: 'Customers'
        }
      });

      assert.equal(events.length, 2);
      assert.equal(events[1].asset.name, 'Customers');
      assert.equal(
        store.getAsset('group', '3da236a9-9eed-4db3-a18e-cfb58030c249').name,
        'Customers'
      );

      mockSocket.serverPublish('org:org-uuid', {
        type: 'asset_changed',
        asset: {
          type: 'contact',
          uuid: '22222222-2222-4222-8222-222222222222',
          name: 'Alicia'
        }
      });
      assert.equal(
        store.getAsset('contact', '22222222-2222-4222-8222-222222222222').name,
        'Alicia'
      );
    } finally {
      setRealtimeContext(null);
      setSocketProvider(previousProvider);
    }
  });
});
