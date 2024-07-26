import { html, TemplateResult } from 'lit';
import { Msg, ObjectReference, User } from '../interfaces';
import { Icon } from '../vectoricon';

export interface EventGroup {
  type: string;
  events: ContactEvent[];
  open: boolean;
}

export interface ContactEvent {
  type: string;
  created_on: string;
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
    body: string;
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

export const renderAttachment = (attachment: string): TemplateResult => {
  const idx = attachment.indexOf(':');
  const attType = attachment.substr(0, idx);
  const url = attachment.substr(idx + 1);
  const [mediaType, ext] = attType.split('/', 2);

  let inner = null;
  if (mediaType === 'image') {
    inner = html`
      <img src="${url}" style="height:auto;width:100%;display:block;" />
    `;
  } else if (ext === 'pdf') {
    return html`<div
      style="width:100%;height:300px;border-radius:calc(var(--curvature) * 2.5);box-shadow:0px 0px 12px 0px rgba(0,0,0,.1), 0px 0px 2px 0px rgba(0,0,0,.15);overflow:hidden"
    ><embed src="${url}#view=Fit" type="application/pdf" frameBorder="0" scrolling="auto" height="100%" width="100%"></embed></div>`;
  } else if (mediaType === 'video') {
    return html`<video
      style="border-radius:var(--curvature);box-shadow:0px 0px 12px 0px rgba(0,0,0,.1), 0px 0px 2px 0px rgba(0,0,0,.15);max-width:400px"
      height="auto"
      controls
    >
      <source src="${url}" type="video/mp4" />
    </video> `;
  } else if (mediaType === 'audio') {
    return html`<audio
      style="border-radius: 99px; box-shadow:0px 0px 12px 0px rgba(0,0,0,.1), 0px 0px 2px 0px rgba(0,0,0,.15);"
      src="${url}"
      type="${attType}"
      controls
    >
      <a target="_" href="${url}">${url}</a>
    </audio>`;
  } else if (attType === 'geo') {
    const [lat, long] = url.split(',');
    const latFloat = parseFloat(lat);
    const longFloat = parseFloat(long);
    const geo = `${lat}000000%2C${long}000000`;

    return html` <iframe
      style="border-radius: var(--curvature);box-shadow:0px 0px 12px 0px rgba(0,0,0,.1), 0px 0px 2px 0px rgba(0,0,0,.15);"
      width="300"
      height="300"
      frameborder="0"
      scrolling="no"
      marginheight="0"
      marginwidth="0"
      src="https://www.openstreetmap.org/export/embed.html?bbox=${longFloat -
      0.005}000000%2C${latFloat - 0.005}%2C${longFloat +
      0.005}000000%2C${latFloat +
      0.005}000000&amp;layer=mapnik&amp;marker=${geo}"
    ></iframe>`;
  } else {
    return html`<div style="display:flex">
      <temba-icon name="${Icon.download}"></temba-icon>
      <div>Attachment ${ext}</div>
    </div>`;
  }

  return html`<div style="">${inner}</div>`;
};
