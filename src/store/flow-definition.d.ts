export type LocalizationMap = Record<string, Record<string, any>>;

export type FlowTypes =
  | 'messaging'
  | 'messaging_background'
  | 'messaging_offline'
  | 'voice'
  | '-';

export type ActionType =
  | 'execute_actions'
  | 'add_contact_urn'
  | 'add_contact_groups'
  | 'add_input_labels'
  | 'remove_contact_groups'
  | 'set_contact_channel'
  | 'set_contact_field'
  | 'set_contact_name'
  | 'set_contact_language'
  | 'set_contact_status'
  | 'set_run_result'
  | 'call_classifier'
  | 'call_resthook'
  | 'call_webhook'
  | 'call_llm'
  | 'open_ticket'
  | 'send_msg'
  | 'send_email'
  | 'send_broadcast'
  | 'enter_flow'
  | 'start_session'
  | 'transfer_airtime'
  | 'split_by_airtime'
  | 'split_by_expression'
  | 'split_by_contact_field'
  | 'split_by_run_result'
  | 'split_by_run_result_delimited'
  | 'split_by_groups'
  | 'split_by_intent'
  | 'split_by_random'
  | 'split_by_resthook'
  | 'split_by_ticket'
  | 'split_by_scheme'
  | 'split_by_subflow'
  | 'split_by_webhook'
  | 'split_by_llm'
  | 'wait_for_response'
  | 'wait_for_menu'
  | 'wait_for_dial'
  | 'wait_for_digits'
  | 'wait_for_audio'
  | 'wait_for_video'
  | 'wait_for_location'
  | 'wait_for_image'
  | 'request_optin'
  | 'missing'
  | 'say_msg'
  | 'play_audio';

export interface Action {
  type: ActionType;
  uuid: string;
}

export interface NamedObject {
  uuid: string;
  name: string;
}

export interface Group extends NamedObject {
  status: string;
  system: boolean;
  query: string;
  count: number;
}

export interface SendMsg extends Action {
  text: string;
  quick_replies?: string[];
}

export interface SetRunResult extends Action {
  category: string;
  name: string;
  value: string;
}

export interface SetContactName extends Action {
  name: string;
}

export interface CallWebhook extends Action {
  url: string;
}

export interface AddToGroup extends Action {
  groups: Group[];
}

export interface RemoveFromGroup extends Action {
  groups: Group[];
  all_groups?: boolean;
}

export interface SetContactField extends Action {
  field: NamedObject;
  value: string;
}

export interface SetContactLanguage extends Action {
  language: string;
}

export interface SetContactStatus extends Action {
  status: 'active' | 'blocked' | 'stopped' | 'archived';
}

export interface SetContactChannel extends Action {
  channel: NamedObject;
}

export interface AddContactUrn extends Action {
  scheme: string;
  path: string;
}

export interface SendEmail extends Action {
  subject: string;
  body: string;
  addresses: string[];
}

export interface SendBroadcast extends Action {
  text: string;
  groups: Group[];
  contacts: NamedObject[];
}

export interface EnterFlow extends Action {
  flow: NamedObject;
}

export interface StartSession extends Action {
  flow: NamedObject;
  groups: Group[];
  contacts: NamedObject[];
  create_contact?: boolean;
}

export interface TransferAirtime extends Action {
  amounts: number[];
  result_name: string;
}

export interface CallClassifier extends Action {
  classifier: NamedObject;
  input: string;
  result_name: string;
}

export interface CallResthook extends Action {
  resthook: string;
  result_name: string;
}

export interface CallLLM extends Action {
  llm: NamedObject;
  instructions: string;
  result_name: string;
}

export interface OpenTicket extends Action {
  subject: string;
  body: string;
  assignee?: NamedObject;
  topic?: NamedObject;
}

export interface RequestOptin extends Action {
  optin: NamedObject;
}

export interface AddInputLabels extends Action {
  labels: NamedObject[];
}

export interface SayMsg extends Action {
  text: string;
  audio_url?: string;
}

export interface PlayAudio extends Action {
  audio_url: string;
}

export interface WaitForResponse extends Action {
  timeout?: number;
}

export interface WaitForMenu extends Action {
  menu: NamedObject;
  timeout?: number;
}

export interface WaitForDigits extends Action {
  count: number;
  timeout?: number;
}

export interface WaitForAudio extends Action {
  timeout?: number;
}

export interface WaitForVideo extends Action {
  timeout?: number;
}

export interface WaitForImage extends Action {
  timeout?: number;
}

export interface WaitForLocation extends Action {
  timeout?: number;
}

export interface Exit {
  uuid: string;
  destination_uuid?: string;
}

export type Hint = {
  type: 'digits' | 'audio' | 'image' | 'video' | 'location';
  count?: number;
};

export interface Timeout {
  category_uuid: string;
  seconds: number;
}

export interface Wait {
  type: 'msg' | 'dial';
  timeout?: Timeout;
  hint?: Hint;
  phone?: string;
  dial_limit_seconds?: number;
  call_limit_seconds?: number;
}

export interface Category {
  uuid: string;
  name: string;
  exit_uuid: string;
}

export interface Router {
  type: 'switch' | 'random';
  result_name?: string;
  categories: Category[];
  wait?: Wait;
}

export interface Node {
  uuid: string;
  actions: Action[];
  exits: Exit[];
  router?: Router;
}

export interface FlowPosition {
  left: number;
  top: number;
  right?: number;
  bottom?: number;
}

export interface NodeUI {
  position: FlowPosition;
  type?: ActionType;
  config?: Record<string, any>;
}

export interface StickyNote {
  position: FlowPosition;
  title: string;
  body: string;
  color: 'yellow' | 'blue' | 'pink' | 'green' | 'gray';
}

export interface FlowUI {
  nodes: Record<string, NodeUI>;
  stickies?: Record<string, StickyNote>;
  languages: Record<string, string>[];
  translation_filters?: { categories: boolean };
  auto_translations?: Record<string, Record<string, string[]>>;
}

export interface FlowDefinition {
  localization: LocalizationMap;
  language: string;
  name: string;
  nodes: Node[];
  uuid: string;
  type: FlowTypes;
  revision: number;
  spec_version: string;
  _ui: FlowUI;
}
