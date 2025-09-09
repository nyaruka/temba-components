import { TemplateResult } from 'lit-html';
import { Action, Node } from '../store/flow-definition';

export interface ValidationResult {
  valid: boolean;
  errors: { [key: string]: string };
}

// Component attribute interfaces - these define what's allowed for each component type
export interface TextInputAttributes {
  type?: 'text' | 'email' | 'number' | 'url' | 'tel';
  placeholder?: string;
  clearable?: boolean;
  maxlength?: number;
  gsm?: boolean;
  autogrow?: boolean;
  textarea?: boolean;
  submitOnEnter?: boolean;
}

export interface CompletionAttributes {
  placeholder?: string;
  clearable?: boolean;
  maxlength?: number;
  gsm?: boolean;
  autogrow?: boolean;
  textarea?: boolean;
  expressions?: string;
  counter?: string;
  minHeight?: number;
}

export interface SelectAttributes {
  placeholder?: string;
  multi?: boolean;
  searchable?: boolean;
  tags?: boolean;
  emails?: boolean;
  clearable?: boolean;
  endpoint?: string;
  valueKey?: string;
  nameKey?: string;
  queryParam?: string;
  maxItems?: number;
  maxItemsText?: string;
  expressions?: string;
  options?: Array<{ name: string; value: any }>;
  sorted?: boolean;
  allowCreate?: boolean;
  jsonValue?: boolean;
  spaceSelect?: boolean;
  infoText?: string;
}

export interface CheckboxAttributes {
  label?: string;
  size?: number;
  disabled?: boolean;
  animateChange?: string;
}

export interface SliderAttributes {
  min?: number;
  max?: number;
  range?: boolean;
}

export interface FormData extends Record<string, any> {}

export interface FormConfig {
  form?: Record<string, FieldConfig>;
  layout?: LayoutItem[];
  gutter?: LayoutItem[];
  sanitize?: (formData: FormData) => void;
  validate?: (formData: FormData) => ValidationResult;
}

export interface NodeConfig extends FormConfig {
  type: string;
  name?: string;
  color?: string;
  dialogSize?: 'small' | 'medium' | 'large' | 'xlarge';
  action?: ActionConfig;
  router?: {
    type: 'switch' | 'random';
    defaultCategory?: string;
    operand?: string;
    configurable?: boolean; // can the rules be configured in the UI
    rules?: {
      type:
        | 'has_number_between'
        | 'has_string'
        | 'has_value'
        | 'has_not_value'
        | 'has_text';
      arguments: string[];
      categoryName: string;
    }[];
  };

  toFormData?: (node: Node) => FormData;
  fromFormData?: (formData: FormData, originalNode: Node) => Node;
  render?: (node: Node) => TemplateResult;
}

// New field configuration system for generic form generation
export interface BaseFieldConfig {
  label?: string | ((formData: Record<string, any>) => string);
  required?: boolean;
  evaluated?: boolean;
  dependsOn?: string[];
  computeValue?: (
    values: Record<string, any>,
    currentValue: any,
    originalValues?: Record<string, any>
  ) => any;

  // Validation properties
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  helpText?: string;

  // Layout properties
  maxWidth?: string;

  // Conditional rendering
  conditions?: {
    visible?: (formData: Record<string, any>) => boolean;
    disabled?: (formData: Record<string, any>) => boolean;
  };
}

export interface TextFieldConfig extends BaseFieldConfig {
  type: 'text';
  placeholder?: string;
}

export interface TextareaFieldConfig extends BaseFieldConfig {
  type: 'textarea';
  placeholder?: string;
  rows?: number;
  minHeight?: number;
}

export interface SelectFieldConfig extends BaseFieldConfig {
  type: 'select';
  options?: string[] | { value: string; name: string }[];
  multi?: boolean;
  clearable?: boolean;
  searchable?: boolean;
  tags?: boolean;
  placeholder?: string;
  maxItems?: number;
  valueKey?: string;
  nameKey?: string;
  endpoint?: string;
  emails?: boolean;
  getName?: (item: any) => string;
  flavor?: 'xsmall' | 'small' | 'large';
  createArbitraryOption?: (input: string, options: any[]) => any;
  allowCreate?: boolean;
  getDynamicOptions?: () => Array<{ value: string; name: string }>;
}

export interface KeyValueFieldConfig extends BaseFieldConfig {
  type: 'key-value';
  sortable?: boolean;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  minRows?: number;
}

export interface ArrayFieldConfig extends BaseFieldConfig {
  type: 'array';
  itemConfig: Record<string, FieldConfig>;
  sortable?: boolean;
  minItems?: number;
  maxItems?: number;
  itemLabel?: string;
  maintainEmptyItem?: boolean;
  onItemChange?: (
    itemIndex: number,
    field: string,
    value: any,
    allItems: any[]
  ) => any[];
  isEmptyItem?: (item: any) => boolean;
}

export interface CheckboxFieldConfig extends BaseFieldConfig {
  type: 'checkbox';
  size?: number;
  animateChange?: string;
  labelPadding?: string;
}

export interface MessageEditorFieldConfig extends BaseFieldConfig {
  type: 'message-editor';
  placeholder?: string;
  minHeight?: number;
  maxAttachments?: number;
  accept?: string;
  endpoint?: string;
  counter?: string;
  gsm?: boolean;
  autogrow?: boolean;
  disableCompletion?: boolean;
}

export type FieldConfig =
  | TextFieldConfig
  | TextareaFieldConfig
  | SelectFieldConfig
  | KeyValueFieldConfig
  | ArrayFieldConfig
  | CheckboxFieldConfig
  | MessageEditorFieldConfig;

// Layout configurations for better form organization
// Recursive layout system - any layout item can contain other layout items

export interface FieldItemConfig {
  type: 'field';
  field: string; // field name to render
}

export interface RowLayoutConfig {
  type: 'row';
  items: LayoutItem[]; // can contain fields, groups, or other rows
  gap?: string; // CSS gap value, defaults to '1rem'
}

export interface GroupLayoutConfig {
  type: 'group';
  label: string;
  items: LayoutItem[]; // can contain fields, rows, or other groups
  collapsible?: boolean;
  collapsed?: boolean | ((formData: any) => boolean); // initial state if collapsible - can be a function
  helpText?: string;
  getGroupValueCount?: (formData: any) => number; // optional function to get count for bubble display
}

export type LayoutItem =
  | FieldItemConfig
  | RowLayoutConfig
  | GroupLayoutConfig
  | string; // string is shorthand for field

export interface ActionConfig extends FormConfig {
  name: string;
  color: string;
  dialogSize?: 'small' | 'medium' | 'large' | 'xlarge';
  evaluated?: string[];
  render?: (node: any, action: any) => TemplateResult;

  form?: Record<string, FieldConfig>;
  layout?: LayoutItem[]; // optional layout configuration - array of layout items
  gutter?: LayoutItem[]; // fields to render in the dialog gutter (left side of buttons)

  toFormData?: (action: Action) => any;
  fromFormData?: (formData: any) => Action;
}

export const COLORS = {
  send: '#3498db',
  update: '#01c1af',
  broadcast: '#8e5ea7',
  call: '#e68628',
  create: '#df419f',
  save: '#1a777c',
  split: '#aaaaaa',
  execute: '#666666',
  wait: '#4d7dad',
  add: '#309c42',
  remove: '#e74c3c'
};
