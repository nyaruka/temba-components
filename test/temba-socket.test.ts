import { assert } from '@open-wc/testing';
import { SocketManager } from '../src/live/SocketService';

class FakeSub {
  public handlers: { [event: string]: ((ctx: any) => void)[] } = {};
  public state = 'unsubscribed';
  public subscribeCalls = 0;
  public unsubscribeCalls = 0;
  public published: any[] = [];
  public denyPublishes = false;

  public publish(data: any): Promise<any> {
    if (this.denyPublishes) {
      return Promise.reject(new Error('permission denied'));
    }
    this.published.push(data);
    return Promise.resolve({});
  }

  public on(event: string, fn: (ctx: any) => void) {
    this.handlers[event] = this.handlers[event] || [];
    this.handlers[event].push(fn);
    return this;
  }

  public off(event: string, fn: (ctx: any) => void) {
    this.handlers[event] = (this.handlers[event] || []).filter(
      (handler) => handler !== fn
    );
    return this;
  }

  public subscribe() {
    this.subscribeCalls++;
    this.state = 'subscribed';
  }

  public unsubscribe() {
    this.unsubscribeCalls++;
    this.state = 'unsubscribed';
  }

  public emit(event: string, ctx: any) {
    (this.handlers[event] || []).forEach((handler) => handler(ctx));
  }
}

class FakeCentrifuge {
  public subs = new Map<string, FakeSub>();
  public removed: FakeSub[] = [];
  public published: { channel: string; data: any }[] = [];

  public publish(channel: string, data: any): Promise<any> {
    this.published.push({ channel, data });
    return Promise.resolve({});
  }

  public getSubscription(channel: string) {
    return this.subs.get(channel) || null;
  }

  public newSubscription(channel: string) {
    const sub = new FakeSub();
    this.subs.set(channel, sub);
    return sub;
  }

  public removeSubscription(sub: FakeSub) {
    this.removed.push(sub);
    this.subs.forEach((existing, channel) => {
      if (existing === sub) {
        this.subs.delete(channel);
      }
    });
  }
}

const createManager = () => {
  const fake = new FakeCentrifuge();
  let connections = 0;
  const manager = new SocketManager(() => {
    connections++;
    return fake as any;
  });
  return { fake, manager, connections: () => connections };
};

describe('SocketManager', () => {
  it('shares one connection and subscription across subscribers', () => {
    const { fake, manager, connections } = createManager();

    const seenA = [];
    const seenB = [];
    manager.subscribe('history:abc', (data) => seenA.push(data));
    manager.subscribe('history:abc', (data) => seenB.push(data));
    manager.subscribe('history:other', () => {});

    assert.equal(connections(), 1);
    assert.equal(fake.subs.size, 2);

    const sub = fake.subs.get('history:abc');
    assert.equal(sub.subscribeCalls, 1);

    sub.emit('publication', { data: { type: 'msg_created' } });
    assert.deepEqual(seenA, [{ type: 'msg_created' }]);
    assert.deepEqual(seenB, [{ type: 'msg_created' }]);
  });

  it('tears down the subscription when the last subscriber leaves', () => {
    const { fake, manager } = createManager();

    const first = manager.subscribe('history:abc', () => {});
    const second = manager.subscribe('history:abc', () => {});
    const sub = fake.subs.get('history:abc');

    first.unsubscribe();
    // safe to call twice, still counted once
    first.unsubscribe();
    assert.equal(sub.unsubscribeCalls, 0);

    second.unsubscribe();
    assert.equal(sub.unsubscribeCalls, 1);
    assert.deepEqual(fake.removed, [sub]);
  });

  it('stops delivering to unsubscribed handlers', () => {
    const { fake, manager } = createManager();

    const seenA = [];
    const seenB = [];
    const first = manager.subscribe('history:abc', (data) => seenA.push(data));
    manager.subscribe('history:abc', (data) => seenB.push(data));

    first.unsubscribe();
    fake.subs.get('history:abc').emit('publication', { data: 'hello' });

    assert.deepEqual(seenA, []);
    assert.deepEqual(seenB, ['hello']);
  });

  it('notifies late joiners on an already-live channel', (done) => {
    const { fake, manager } = createManager();

    manager.subscribe('history:abc', () => {});
    assert.equal(fake.subs.get('history:abc').state, 'subscribed');

    manager.subscribe(
      'history:abc',
      () => {},
      () => done()
    );
  });

  it('resubscribes a channel after full teardown', () => {
    const { fake, manager } = createManager();

    const first = manager.subscribe('history:abc', () => {});
    first.unsubscribe();

    const seen = [];
    manager.subscribe('history:abc', (data) => seen.push(data));
    const sub = fake.subs.get('history:abc');
    assert.equal(sub.subscribeCalls, 1);

    sub.emit('publication', { data: 'again' });
    assert.deepEqual(seen, ['again']);
  });

  it('publishes through the channel subscription when subscribed', async () => {
    const { fake, manager } = createManager();

    manager.subscribe('history:abc', () => {});
    await manager.publish('history:abc', { type: 'typing_started' });

    const sub = fake.subs.get('history:abc');
    assert.deepEqual(sub.published, [{ type: 'typing_started' }]);
    assert.deepEqual(fake.published, []);
  });

  it('publishes through the client without a subscription', async () => {
    const { fake, manager } = createManager();

    await manager.publish('history:abc', { type: 'typing_started' });
    assert.deepEqual(fake.published, [
      { channel: 'history:abc', data: { type: 'typing_started' } }
    ]);
  });

  it('propagates publish denials', async () => {
    const { fake, manager } = createManager();

    manager.subscribe('history:abc', () => {});
    fake.subs.get('history:abc').denyPublishes = true;

    let denied = false;
    await manager
      .publish('history:abc', { type: 'typing_started' })
      .catch(() => {
        denied = true;
      });
    assert.isTrue(denied);
  });
});
