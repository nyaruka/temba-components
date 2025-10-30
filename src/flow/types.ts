import { TemplateResult } from 'lit-html';
import { Action, Node, NodeUI } from '../store/flow-definition';

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
  editorType?: EditorType;
  dialogSize?: 'small' | 'medium' | 'large' | 'xlarge';
  action?: ActionConfig;
  showAsAction?: boolean; // if true, show in action dialog instead of splits (default: false - nodes show in splits)
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

  toFormData?: (node: Node, nodeUI?: any) => FormData;
  fromFormData?: (formData: FormData, originalNode: Node) => Node;
  toUIConfig?: (formData: FormData) => Record<string, any>;
  render?: (node: Node, nodeUI?: any) => TemplateResult;
  renderTitle?: (node: Node, nodeUI?: NodeUI) => TemplateResult;
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
  width?: string;

  // Conditional rendering
  conditions?: {
    visible?: (formData: Record<string, any>) => boolean;
    disabled?: (formData: Record<string, any>) => boolean;
  };

  // Optional field with reveal link
  // When set, the field is hidden by default and a link with this text is shown
  // Clicking the link reveals the field permanently (can't be hidden again)
  optionalLink?: string;
}

export interface TextFieldConfig extends BaseFieldConfig {
  type: 'text';
  placeholder?: string;
  flavor?: 'xsmall' | 'small' | 'large';
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
  collapsed?: boolean | ((formData: FormData) => boolean); // initial state if collapsible - can be a function
  helpText?: string;
  getGroupValueCount?: (formData: FormData) => number; // optional function to get count for bubble display
}

export type LayoutItem =
  | FieldItemConfig
  | RowLayoutConfig
  | GroupLayoutConfig
  | string; // string is shorthand for field

export interface ActionConfig extends FormConfig {
  name: string;
  editorType: EditorType;
  dialogSize?: 'small' | 'medium' | 'large' | 'xlarge';
  evaluated?: string[];
  hideFromActions?: boolean; // if true, don't show in action dialog (default: false - actions show in actions)
  render?: (node: any, action: any) => TemplateResult;

  form?: Record<string, FieldConfig>;
  layout?: LayoutItem[]; // optional layout configuration - array of layout items
  gutter?: LayoutItem[]; // fields to render in the dialog gutter (left side of buttons)

  toFormData?: (action: Action) => FormData;
  fromFormData?: (formData: FormData) => Action;
}

/**
 * Metadata for editor type groupings
 */
export interface EditorType {
  color: string;
  title: string;
  description: string;
}

/**
 * Editor type definitions - single source of truth for action/node categorization
 * Use as: EDITOR_TYPES.send.color, EDITOR_TYPES.send.title, etc.
 *
 * ACTION_EDITOR_TYPES: Order for action selector (top to bottom)
 * SPLIT_EDITOR_TYPES: Order for split selector (top to bottom)
 */
export const ACTION_EDITOR_TYPES: { [key: string]: EditorType } = {
  send: {
    color: '#3498db',
    title: 'Send',
    description: 'Actions that send messages or content to contacts'
  },
  update: {
    color: '#01c1af',
    title: 'Contact',
    description: 'Actions that update contact information'
  },
  save: {
    color: '#1a777c',
    title: 'Save',
    description: 'Actions that save or store data'
  },
  services: {
    color: '#f79035ff',
    title: 'Services',
    description: 'Call external services and APIs'
  },
  broadcast: {
    color: '#8e5ea7',
    title: 'Others',
    description: 'Actions that apply to other contacts or people'
  },
  trigger: {
    color: '#df419f',
    title: 'Trigger',
    description: 'Actions that trigger other behavior'
  },
  add: {
    color: '#309c42',
    title: 'Add',
    description: 'Add items or resources'
  },
  remove: {
    color: '#e74c3c',
    title: 'Remove',
    description: 'Remove items or resources'
  }
};

export const SPLIT_EDITOR_TYPES: { [key: string]: EditorType } = {
  wait: {
    color: '#4d7dad',
    title: 'Wait',
    description: 'Wait for user and split on their response'
  },
  split: {
    color: '#aaaaaa',
    title: 'Split',
    description: 'Split the flow based on conditions'
  }
};

export const EDITOR_TYPES = {
  ...ACTION_EDITOR_TYPES,
  ...SPLIT_EDITOR_TYPES
};
