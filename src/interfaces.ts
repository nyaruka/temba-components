import { CompletionOption } from "./completion/Completion";

export interface URN {
  scheme: string;
  path: string;
}

export interface Contact {
  urns: URN[];
  primary_urn_formatted: string;
  name: string;
  fields: { [uuid: string]: { text: string } };
  created_on: Date;
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
}
