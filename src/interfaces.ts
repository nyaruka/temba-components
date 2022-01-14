export interface User {
  id?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
  created_on?: string;
}

export interface Ticket {
  uuid: string;
  subject: string;
  body?: string;
  closed_on: string;
  opened_on: string;
  status: string;
  contact: ObjectReference;
  ticketer: ObjectReference;
  topic: ObjectReference;
  assignee?: User;
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
  created_by?: User;
  attachments: string[];
}

export interface ObjectReference {
  uuid: string;
  name: string;
}

export interface ContactField {
  key: string;
  label: string;
  value_type: string;
  pinned: boolean;
}

export interface ContactGroup {
  uuid: string;
  count: number;
  name: string;
  query?: string;
  status: string;
}

export interface URN {
  scheme: string;
  path: string;
}

export interface Group {
  name: string;
  uuid: string;
  is_dynamic?: boolean;
}

export interface ContactTicket {
  name: string;
  uuid: string;
  status: string;

  contact: {
    uuid: string;
    name: string;
    created_on: Date;
    last_seen_on: Date;
  };
}

export interface Contact {
  name: string;
  uuid: string;
  stopped: boolean;
  blocked: boolean;
  urns: string[];
  lang: string;
  fields: { [key: string]: string };
  groups: Group[];
  modified_on: string;
  created_on: string;
  last_seen_on: string;

  last_msg?: Msg;
  direction?: string;
  ticket: {
    uuid: string;
    subject: string;
    closed_on?: string;
    last_activity_on: string;
    assignee?: User;
    topic?: ObjectReference;
  };
}

export interface FeatureProperties {
  name: string;
  osm_id: string;
  level: number;
  children?: FeatureProperties[];
  has_children?: boolean;
  aliases?: string;
  parent_osm_id?: string;
  id?: number;
  path?: string;
}

export interface Position {
  top: number;
  left: number;
}

export interface FunctionExample {
  template: string;
  output: string;
}

export interface CompletionOption {
  name?: string;
  summary: string;

  // functions
  signature?: string;
  detail?: string;
  examples?: FunctionExample[];
}

export interface CompletionResult {
  anchorPosition: Position;
  query: string;
  options: CompletionOption[];
  currentFunction: CompletionOption;
}

export interface CompletionProperty {
  key: string;
  help: string;
  type: string;
}

export interface CompletionType {
  name: string;

  key_source?: string;
  property_template?: CompletionProperty;
  properties?: CompletionProperty[];
}

export interface CompletionSchema {
  types: CompletionType[];
  root: CompletionProperty[];
  root_no_session: CompletionProperty[];
}

export type KeyedAssets = { [assetType: string]: string[] };

export enum CustomEventType {
  Loaded = 'temba-loaded',
  Canceled = 'temba-canceled',
  CursorChanged = 'temba-cursor-changed',
  Refreshed = 'temba-refreshed',
  Selection = 'temba-selection',
  ButtonClicked = 'temba-button-clicked',
  DialogHidden = 'temba-dialog-hidden',
  ScrollThreshold = 'temba-scroll-threshold',
  ContentChanged = 'temba-content-changed',
  ContextChanged = 'temba-context-changed',
  FetchComplete = 'temba-fetch-complete',
  Submitted = 'temba-submitted',
  Redirected = 'temba-redirected',
  NoPath = 'temba-no-path',
}
