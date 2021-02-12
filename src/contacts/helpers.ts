import axios, { AxiosResponse, CancelTokenSource } from "axios";
import { getUrl } from "../utils";

export const SCROLL_THRESHOLD = 100;
export const SIMULATED_WEB_SLOWNESS = 500;
export const MAX_CHAT_REFRESH = 15000;
export const MIN_CHAT_REFRESH = 1000;

export interface EventGroup {
  type: string;
  events: ContactEvent[];
  open: boolean;
}

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
  created_on: string;
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

let cancelToken: CancelTokenSource = undefined;

export const fetchContactHistory = (
  endpoint: string,
  before: number = undefined,
  after: number = undefined,
  limit: number = undefined
): Promise<ContactHistoryPage> => {
  // make sure we cancel any previous request
  if (cancelToken) {
    cancelToken.cancel();
  }

  const CancelToken = axios.CancelToken;

  return new Promise<ContactHistoryPage>((resolve, reject) => {
    if (cancelToken) {
      cancelToken.cancel();
    }

    cancelToken = CancelToken.source();

    let url = endpoint;
    if (before) {
      url += `&before=${before}`;
    }

    if (after) {
      url += `&after=${after}`;
    }

    window.setTimeout(() => {
      getUrl(url, cancelToken.token)
        .then((response: AxiosResponse) => {
          resolve(response.data as ContactHistoryPage);
        })
        .catch((error) => reject(error));
    }, SIMULATED_WEB_SLOWNESS);
  });
};
