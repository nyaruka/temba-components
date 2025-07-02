import { Msg, ObjectReference, User } from './interfaces';

export interface EventGroup {
  type: string;
  events: ContactEvent[];
  open: boolean;
}

export interface ContactEvent {
  type: string;
  created_on: string;
  created_by?: User;
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
  step_uuid: string;
  session_uuid: string;
}

export interface OptinRequestedEvent extends ContactEvent {
  optin: {
    uuid: string;
    name: string;
  };
}

export interface MsgEvent extends ContactEvent {
  msg: Msg;
  status: string;
  failed_reason?: string;
  failed_reason_display?: string;
  logs_url: string;
  msg_type: string;
  recipient_count?: number;
  created_by?: User;
  optin?: ObjectReference;
}

export interface FlowEvent extends ContactEvent {
  flow: ObjectReference;
  status: string;
}

export interface EmailSentEvent extends ContactEvent {
  to: string[];
  subject: string;
  body: string;
}

export interface URNsChangedEvent extends ContactEvent {
  urns: string[];
}

export interface TicketEvent extends ContactEvent {
  note?: string;
  assignee?: User;
  ticket: {
    uuid: string;
    topic?: ObjectReference;
    closed_on?: string;
    opened_on?: string;
  };
  topic?: ObjectReference;
  created_by?: User;
}

export interface LabelsAddedEvent extends ContactEvent {
  labels: ObjectReference[];
}

export interface NameChangedEvent extends ContactEvent {
  name: string;
}

export interface UpdateFieldEvent extends ContactEvent {
  field: { key: string; name: string };
  value: { text: string };
}

export interface ErrorMessageEvent extends ContactEvent {
  text: string;
}

export interface UpdateResultEvent extends ContactEvent {
  name: string;
  value: string;
  category: string;
  input: string;
}

export interface ContactGroupsEvent extends ContactEvent {
  groups_added: ObjectReference[];
  groups_removed: ObjectReference[];
}

export interface WebhookEvent extends ContactEvent {
  status: string;
  status_code: number;
  elapsed_ms: number;
  logs_url: string;
  url: string;
}

export interface AirtimeTransferredEvent extends ContactEvent {
  sender: string;
  recipient: string;
  currency: string;
  desired_amount: string;
  actual_amount: string;
  logs_url: string;
}

export type CallStartedEvent = ContactEvent;
export interface CampaignFiredEvent extends ContactEvent {
  campaign: { uuid: string; id: number; name: string };
  campaign_event: {
    id: number;
    offset_display: string;
    relative_to: { key: string; name: string };
  };
  fired_result: string;
}

export interface ContactHistoryPage {
  has_older: boolean;
  recent_only: boolean;
  next_before: number;
  next_after: number;
  start_date: Date;
  events: ContactEvent[];
}
