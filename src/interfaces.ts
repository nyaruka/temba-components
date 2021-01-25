import { CompletionOption } from "./completion/Completion";

export interface URN {
  scheme: string;
  path: string;
}

export interface Group {
  name: string;
  uuid: string;
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
  modified_on: Date;
  created_on: Date;
  last_seen_on: Date;
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

export interface CompletionResult {
  anchorPosition: Position;
  query: string;
  options: CompletionOption[];
  currentFunction: CompletionOption;
}

export enum CustomEventType {
  Loaded = "temba-loaded",
  Canceled = "temba-canceled",
  CursorChanged = "temba-cursor-changed",
  Selection = "temba-selection",
  ButtonClicked = "temba-button-clicked",
  DialogHidden = "temba-dialog-hidden",
  ScrollThreshold = "temba-scroll-threshold",
}
