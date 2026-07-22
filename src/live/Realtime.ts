import { Notification } from '../interfaces';
import {
  PublicationHandler,
  SocketSubscription,
  subscribeToSocket
} from './SocketService';

/**
 * Typed access to our realtime topics. SocketService owns the shared
 * connection and per-channel fan-out; this module owns how topics map to
 * channel names, including the page identity (org and user uuids) needed to
 * address user-scoped channels.
 *
 * The identity arrives via temba-store (hydrated from the page template), so
 * user-scoped subscriptions requested before the store mounts are queued and
 * activate when the context is set. On pages with no authenticated context
 * they simply never activate.
 */

export interface RealtimeSubscription {
  unsubscribe(): void;
}

export interface RealtimeContext {
  org: string;
  user: string;
}

interface PendingSubscription {
  resolveChannel: (ctx: RealtimeContext) => string;
  onPublication: PublicationHandler;
  onSubscribed?: () => void;
  sub: SocketSubscription;
  cancelled: boolean;
}

let context: RealtimeContext = null;
const pending: PendingSubscription[] = [];

/**
 * Sets (or clears, with null) the page's realtime identity, flushing any
 * subscriptions that were waiting on it. Set once per page load - an org
 * switch is a full page load. Returns the previous context.
 */
export const setRealtimeContext = (
  ctx: RealtimeContext | null
): RealtimeContext | null => {
  const previous = context;
  context = ctx;
  if (ctx) {
    while (pending.length > 0) {
      const p = pending.shift();
      if (!p.cancelled) {
        p.sub = subscribeToSocket(
          p.resolveChannel(ctx),
          p.onPublication,
          p.onSubscribed
        );
      }
    }
  } else {
    pending.length = 0;
  }
  return previous;
};

const subscribeWhenReady = (
  resolveChannel: (ctx: RealtimeContext) => string,
  onPublication: PublicationHandler,
  onSubscribed?: () => void
): RealtimeSubscription => {
  if (context) {
    return subscribeToSocket(
      resolveChannel(context),
      onPublication,
      onSubscribed
    );
  }

  const p: PendingSubscription = {
    resolveChannel,
    onPublication,
    onSubscribed,
    sub: null,
    cancelled: false
  };
  pending.push(p);
  return {
    unsubscribe: () => {
      p.cancelled = true;
      if (p.sub) {
        p.sub.unsubscribe();
        p.sub = null;
      }
    }
  };
};

/**
 * The current user's notifications in the current workspace. onSubscribed
 * fires on every (re)subscribe, including after reconnects, so subscribers
 * can catch up on anything missed while offline.
 */
export const subscribeToNotifications = (
  onNotification: (notification: Notification) => void,
  onSubscribed?: () => void
): RealtimeSubscription => {
  return subscribeWhenReady(
    (ctx) => `notifications:${ctx.org}:${ctx.user}`,
    (data) => onNotification(data as Notification),
    onSubscribed
  );
};

/**
 * A contact's history events, or a ticket's detail events when a ticket is
 * given. Needs no page context so subscribes immediately.
 */
export const subscribeToContactHistory = (
  contact: string,
  ticket: string | null,
  onEvent: (event: any) => void,
  onSubscribed?: () => void
): RealtimeSubscription => {
  return subscribeToSocket(
    ticket ? `history:${contact}:${ticket}` : `history:${contact}`,
    onEvent,
    onSubscribed
  );
};
