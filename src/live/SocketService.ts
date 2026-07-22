import { Centrifuge, Subscription, SubscriptionState } from 'centrifuge';

/**
 * Access to our realtime messaging socket (centrifugo). The server lives
 * behind the same origin at /ws/connect and authenticates connections with
 * the browser's session cookie (via a server-side connect proxy), so no
 * token handling is needed here.
 *
 * The connection is owned by a SocketManager which is page-scoped - it hangs
 * off `window` rather than any component, so it survives components mounting
 * and unmounting, and vanilla js on the containing page can share the same
 * connection:
 *
 *   const sub = window.sockets.subscribe('notifications:<org>:<user>', (event) => {
 *     ...
 *   });
 *   sub.unsubscribe();
 *
 * Any number of subscribers (components or page js) can watch the same
 * channel - the underlying centrifugo subscription is created on first use
 * and torn down when the last subscriber leaves. The connection itself stays
 * open for the life of the page. Each published event arrives as raw JSON.
 */

export interface SocketSubscription {
  unsubscribe(): void;
}

export type PublicationHandler = (data: any) => void;

export interface SocketProvider {
  subscribe(
    channel: string,
    onPublication: PublicationHandler,
    onSubscribed?: () => void
  ): SocketSubscription;

  publish(channel: string, data: any): Promise<void>;
}

interface ChannelEntry {
  sub: Subscription;
  count: number;
}

export class SocketManager implements SocketProvider {
  private socket: Centrifuge = null;
  private channels = new Map<string, ChannelEntry>();
  private createSocket: () => Centrifuge;

  constructor(createSocket?: () => Centrifuge) {
    this.createSocket =
      createSocket ||
      (() => {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const socket = new Centrifuge(
          `${protocol}://${window.location.host}/ws/connect`
        );
        socket.connect();
        return socket;
      });
  }

  /**
   * Publishes data on a channel. The server proxies client publications
   * (e.g. typing events on history channels) to mailroom for authorization
   * and fan-out; a rejection means the publication was denied.
   */
  public publish(channel: string, data: any): Promise<void> {
    if (!this.socket) {
      this.socket = this.createSocket();
    }

    // prefer the channel's live subscription when we have one
    const entry = this.channels.get(channel);
    const published = entry
      ? entry.sub.publish(data)
      : this.socket.publish(channel, data);
    return published.then(() => undefined);
  }

  public subscribe(
    channel: string,
    onPublication: PublicationHandler,
    onSubscribed?: () => void
  ): SocketSubscription {
    if (!this.socket) {
      this.socket = this.createSocket();
    }

    let entry = this.channels.get(channel);
    if (!entry) {
      entry = {
        sub:
          this.socket.getSubscription(channel) ||
          this.socket.newSubscription(channel),
        count: 0
      };
      this.channels.set(channel, entry);
      entry.sub.subscribe();
    }
    entry.count++;

    const sub = entry.sub;
    const pubHandler = (ctx: { data: any }) => onPublication(ctx.data);
    sub.on('publication', pubHandler);

    let subHandler: () => void = null;
    if (onSubscribed) {
      // fires on every (re)subscribe, including after reconnects, so
      // subscribers can catch up on anything missed while offline
      subHandler = () => onSubscribed();
      sub.on('subscribed', subHandler);

      // late joiners on an already-live channel won't see a subscribed
      // event, so give them their initial one
      if (sub.state === SubscriptionState.Subscribed) {
        window.setTimeout(() => subHandler && subHandler(), 0);
      }
    }

    let active = true;
    return {
      unsubscribe: () => {
        if (!active) {
          return;
        }
        active = false;

        sub.off('publication', pubHandler);
        if (subHandler) {
          sub.off('subscribed', subHandler);
          subHandler = null;
        }

        entry.count--;
        if (entry.count === 0) {
          this.channels.delete(channel);
          sub.unsubscribe();
          this.socket.removeSubscription(sub);
        }
      }
    };
  }
}

// the page-scoped manager, shared with vanilla js as window.sockets and
// reused if another copy of this module already created it
const getManager = (): SocketManager => {
  const w = window as any;
  if (!w.sockets) {
    w.sockets = new SocketManager();
  }
  return w.sockets;
};
getManager();

// when set, components subscribe through this instead of the page manager
let provider: SocketProvider = null;

export const subscribeToSocket = (
  channel: string,
  onPublication: PublicationHandler,
  onSubscribed?: () => void
): SocketSubscription => {
  return (provider || getManager()).subscribe(
    channel,
    onPublication,
    onSubscribed
  );
};

export const publishToSocket = (channel: string, data: any): Promise<void> => {
  return (provider || getManager()).publish(channel, data);
};

// for tests to swap in a mock provider, returns the previous provider
export const setSocketProvider = (newProvider: SocketProvider) => {
  const previous = provider;
  provider = newProvider;
  return previous;
};
