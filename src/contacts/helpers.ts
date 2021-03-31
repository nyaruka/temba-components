import { Contact } from '../interfaces';
import { fetchResults, getUrl, postUrl, WebResponse } from '../utils';

export const SCROLL_THRESHOLD = 100;
export const SIMULATED_WEB_SLOWNESS = 0;
export const MAX_CHAT_REFRESH = 10000;
export const MIN_CHAT_REFRESH = 500;

export interface EventGroup {
  type: string;
  events: ContactEvent[];
  open: boolean;
  closing: boolean;
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
  direction: string;
  type: string;
}

export enum Events {
  MESSAGE_CREATED = 'msg_created',
  MESSAGE_RECEIVED = 'msg_received',
  BROADCAST_CREATED = 'broadcast_created',

  FLOW_ENTERED = 'flow_entered',
  FLOW_EXITED = 'flow_exited',
  RUN_RESULT_CHANGED = 'run_result_changed',
  CONTACT_FIELD_CHANGED = 'contact_field_changed',
  CONTACT_GROUPS_CHANGED = 'contact_groups_changed',
  CONTACT_NAME_CHANGED = 'contact_name_changed',
  CONTACT_URNS_CHANGED = 'contact_urns_changed',
  CAMPAIGN_FIRED = 'campaign_fired',
  WEBHOOK_CALLED = 'webhook_called',
  EMAIL_SENT = 'email_sent',
  INPUT_LABELS_ADDED = 'input_labels_added',
  TICKET_OPENED = 'ticket_opened',
  ERROR = 'error',
  FAILURE = 'failure',
}

export interface ContactEvent {
  type: string;
  created_on: string;
}

export interface MsgEvent extends ContactEvent {
  msg: Msg;
  status: string;
  logs_url: string;
  msg_type: string;

  recipient_count?: number;
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

export interface TicketOpenedEvent extends ContactEvent {
  ticket: {
    uuid: string;
    ticketer: ObjectReference;
    subject: string;
    body: string;
    external_id: string;
  };
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

export interface ContactHistoryPage {
  has_older: boolean;
  recent_only: boolean;
  next_before: number;
  next_after: number;
  start_date: Date;
  events: ContactEvent[];
}

export const closeTicket = (uuid: string): Promise<WebResponse> => {
  const formData = new FormData();
  formData.append('status', 'C');
  return postUrl(`/ticket/update/${uuid}/?_format=json`, formData);
};

export const fetchContact = (endpoint: string): Promise<Contact> => {
  return new Promise<Contact>((resolve, reject) => {
    fetchResults(endpoint).then((contacts: Contact[]) => {
      if (contacts && contacts.length === 1) {
        resolve(contacts[0]);
      } else {
        reject('No contact found');
      }
    });
  });
};

// let pendingRequests: CancelTokenSource[] = [];

export const fetchContactHistory = (
  reset: boolean,
  endpoint: string,
  before: number = undefined,
  after: number = undefined,
  limit: number = undefined
): Promise<ContactHistoryPage> => {
  if (reset) {
    /* pendingRequests.forEach(token => {
      token.cancel();
    });
    pendingRequests = [];*/
  }

  return new Promise<ContactHistoryPage>((resolve, reject) => {
    // const CancelToken = axios.CancelToken;
    // const cancelToken = CancelToken.source();
    // pendingRequests.push(cancelToken);

    let url = endpoint;
    if (before) {
      url += `&before=${before}`;
    }

    if (after) {
      url += `&after=${after}`;
    }

    getUrl(url)
      .then((response: WebResponse) => {
        // pendingRequests = pendingRequests.filter((token: CancelTokenSource) => {
        // token.token !== response.config.cancelToken;
        // });

        resolve(response.json as ContactHistoryPage);
      })
      .catch(error => {
        // canceled
      });
  });
};
