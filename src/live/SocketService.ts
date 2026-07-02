import { Centrifuge } from 'centrifuge';

/**
 * Thin wrapper around our realtime messaging socket (centrifugo). The server
 * lives behind the same origin at /ws/connect and authenticates connections
 * with the browser's session cookie (via a server-side connect proxy), so no
 * token handling is needed here. Components subscribe to channels like
 * "history:<contact-uuid>" and receive each published event as raw JSON.
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
}

let socket: Centrifuge = null;

const getSocket = (): Centrifuge => {
  if (!socket) {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    socket = new Centrifuge(`${protocol}://${window.location.host}/ws/connect`);
    socket.connect();
  }
  return socket;
};

/**
 * Default provider backed by a single shared centrifugo connection, created
 * lazily on first subscribe and kept open for the life of the page. Assumes
 * one subscriber per channel at a time, which holds for our components.
 */
class CentrifugoProvider implements SocketProvider {
  public subscribe(
    channel: string,
    onPublication: PublicationHandler,
    onSubscribed?: () => void
  ): SocketSubscription {
    const socket = getSocket();
    const sub =
      socket.getSubscription(channel) || socket.newSubscription(channel);

    sub.on('publication', (ctx) => onPublication(ctx.data));
    if (onSubscribed) {
      // fires on every (re)subscribe, including after reconnects, so
      // subscribers can catch up on anything missed while offline
      sub.on('subscribed', () => onSubscribed());
    }
    sub.subscribe();

    return {
      unsubscribe: () => {
        sub.unsubscribe();
        sub.removeAllListeners();
        socket.removeSubscription(sub);
      }
    };
  }
}

let provider: SocketProvider = new CentrifugoProvider();

export const subscribeToSocket = (
  channel: string,
  onPublication: PublicationHandler,
  onSubscribed?: () => void
): SocketSubscription => {
  return provider.subscribe(channel, onPublication, onSubscribed);
};

// for tests to swap in a mock provider, returns the previous provider
export const setSocketProvider = (newProvider: SocketProvider) => {
  const previous = provider;
  provider = newProvider;
  return previous;
};
