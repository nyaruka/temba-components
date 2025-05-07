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
  quick_replies: string[];
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

export interface FlowUI {
  nodes: Record<string, NodeUI>;
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
