import { Msg, ObjectReference, User } from './interfaces';

export interface EventGroup {
  type: string;
  events: ContactEvent[];
  open: boolean;
}

export interface ContactEvent {
  uuid?: string;
  type: string;
  created_on: string;
  _user?: ObjectReference;
}

export interface ChannelEvent extends ContactEvent {
  channel_event_type: string;
  duration: number;

  event: {
    type: string;
    channel: { uuid: string; name: string };
    duration?: number;
    optin?: {
      uuid: string;
      name: string;
    };
  };
}

export interface ContactLanguageChangedEvent extends ContactEvent {
  language: string;
}

export interface ContactStatusChangedEvent extends ContactEvent {
  status: string;
}

export interface OptInEvent extends ContactEvent {
  optin: {
    uuid: string;
    name: string;
  };
}

export interface CallEvent extends ContactEvent {
  call?: {
    uuid: string;
    urn: string;
  };
}

export interface ChatStartedEvent extends ContactEvent {
  params?: object;
}

export interface MsgEvent extends ContactEvent {
  msg: Msg;
  optin?: ObjectReference;
  _status?: string | { status: string; changed_on: string; reason: string };
  _failed_reason?: string; // deprecated
  _logs_url?: string;
}

export interface RunEvent extends ContactEvent {
  flow: ObjectReference;
  status: string;
}

export interface URNsChangedEvent extends ContactEvent {
  urns: string[];
}

export interface TicketEvent extends ContactEvent {
  ticket: {
    // ticket_opened
    uuid: string;
    topic?: ObjectReference;
  };
  ticket_uuid?: string; // all other event types
  assignee?: User;
  note?: string;
  topic?: ObjectReference;
}

export interface NameChangedEvent extends ContactEvent {
  name: string;
}

export interface UpdateFieldEvent extends ContactEvent {
  field: { key: string; name: string };
  value: { text: string };
}

export interface ContactGroupsEvent extends ContactEvent {
  groups_added: ObjectReference[];
  groups_removed: ObjectReference[];
}

export interface AirtimeTransferredEvent extends ContactEvent {
  sender: string;
  recipient: string;
  currency: string;
  amount: string;
}

export type CallStartedEvent = ContactEvent;

export interface ContactHistoryPage {
  has_older: boolean;
  recent_only: boolean;
  next_before: number;
  next_after: number;
  start_date: Date;
  events: ContactEvent[];
}
