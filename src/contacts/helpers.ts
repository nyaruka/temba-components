import { AxiosResponse } from "axios";
import { getUrl } from "../utils";

export interface ObjectReference {
  uuid: string;
  name: string;
}

export interface Msg {
  text: string;
  status: string;
  channel: ObjectReference;
  quick_replies: string[];
  urn: string;
  id: number;
}

export enum Events {
  MESSAGE_CREATED = "msg_created",
  MESSAGE_RECEIVED = "msg_received",
  BROADCAST_CREATED = "broadcast_created",

  FLOW_ENTERED = "flow_entered",
  FLOW_EXITED = "flow_exited",
  RUN_RESULT_CHANGED = "run_result_changed",
  CONTACT_FIELD_CHANGED = "contact_field_changed",
  CONTACT_GROUPS_CHANGED = "contact_groups_changed",
  CAMPAIGN_FIRED = "campaign_fired",
  WEBHOOK_CALLED = "webhook_called",

  ERROR = "error",
  FAILURE = "failure",
}

export interface ContactEvent {
  type: string;
  created_on: Date;
}

export interface MsgEvent extends ContactEvent {
  msg: Msg;
  status: string;
  logs_url: string;

  recipient_count?: number;
}

export interface FlowEvent extends ContactEvent {
  flow: ObjectReference;
  status: string;
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
}

export interface ContactHistoryPage {
  has_older: boolean;
  recent_only: boolean;
  next_before: number;
  next_after: number;
  start_date: Date;
  events: ContactEvent[];
}

export const fetchContactHistory = (
  endpoint: string,
  before: number = undefined,
  after: number = undefined,
  limit: number = undefined
): Promise<ContactHistoryPage> => {
  return new Promise<ContactHistoryPage>((resolve, reject) => {
    let url = endpoint;
    if (before) {
      url += `&before=${before}`;
    }

    getUrl(url)
      .then((response: AxiosResponse) => {
        resolve(response.data as ContactHistoryPage);
      })
      .catch((error) => reject(error));
  });
};

// 1612816161547
// 1612815806414808
