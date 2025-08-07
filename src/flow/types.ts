import { TemplateResult } from 'lit-html';
import { Action } from '../store/flow-definition';

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

// Widget configuration using discriminated union for type safety
export type WidgetConfig =
  | { type: 'temba-textinput'; attributes?: TextInputAttributes }
  | { type: 'temba-completion'; attributes?: CompletionAttributes }
  | { type: 'temba-select'; attributes?: SelectAttributes }
  | { type: 'temba-checkbox'; attributes?: CheckboxAttributes }
  | { type: 'temba-slider'; attributes?: SliderAttributes }
  | { type: string; attributes?: { [key: string]: any } }; // Generic fallback

// Property configuration with the clean structure you want
export interface PropertyConfig {
  // Form field metadata
  label?: string;
  helpText?: string;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;

  // Widget configuration
  widget: WidgetConfig;

  // Conditional behavior based on other field values
  conditions?: {
    // When to show this field
    visible?: (formData: any) => boolean;

    // When this field is disabled
    disabled?: (formData: any) => boolean;
  };
}

export interface NodeConfig {
  type: string;
  name?: string;
  color?: string;
  action?: ActionConfig;
  router?: {
    type: 'switch' | 'random';
    defaultCategory?: string;
    operand?: string;
    configurable?: boolean; // can the rules be configured in the UI
    rules?: {
      type: 'has_number_between' | 'has_string' | 'has_value' | 'has_not_value';
      arguments: string[];
      categoryName: string;
    }[];
  };
  properties?: { [key: string]: PropertyConfig };
  toFormData?: (node: any) => any;
  fromFormData?: (formData: any, originalNode: any) => any;
}

// New field configuration system for generic form generation
export interface BaseFieldConfig {
  label?: string;
  required?: boolean;
  evaluated?: boolean; // if this field supports expression evaluation
  dependsOn?: string[]; // fields this field depends on
  computeValue?: (values: Record<string, any>, currentValue: any) => any;
  shouldCompute?: (values: Record<string, any>, currentValue: any) => boolean;

  // Validation properties
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  helpText?: string;

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
  options: string[] | { value: string; label: string }[];
  multi?: boolean;
  searchable?: boolean;
  tags?: boolean;
  placeholder?: string;
  maxItems?: number;
  valueKey?: string;
  nameKey?: string;
  endpoint?: string;
  emails?: boolean;
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
  onItemChange?: (
    itemIndex: number,
    field: string,
    value: any,
    allItems: any[]
  ) => any[];
}

export interface CheckboxFieldConfig extends BaseFieldConfig {
  type: 'checkbox';
  size?: number;
  animateChange?: string;
}

export type FieldConfig =
  | TextFieldConfig
  | TextareaFieldConfig
  | SelectFieldConfig
  | KeyValueFieldConfig
  | ArrayFieldConfig
  | CheckboxFieldConfig;

export interface ActionConfig {
  name: string;
  color: string;
  evaluated?: string[];
  render?: (node: any, action: any) => TemplateResult;

  // New field configuration system
  fields?: Record<string, FieldConfig>;

  // Action editor configuration (legacy)
  // Form-level transformations
  toFormData?: (action: Action) => any;
  fromFormData?: (formData: any) => Action;
  form?: {
    [formFieldName: string]: PropertyConfig;
  };

  validate?: (action: Action) => ValidationResult;
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

// Default property type mappings
export function getDefaultComponent(value: any): WidgetConfig['type'] {
  if (typeof value === 'boolean') {
    return 'temba-checkbox';
  }
  if (typeof value === 'number') {
    return 'temba-textinput';
  }
  if (Array.isArray(value)) {
    return 'temba-select'; // For arrays, use multi-select
  }
  // Default to text input for strings and unknown types
  return 'temba-textinput';
}

// Get component properties for default mappings with proper typing
export function getDefaultComponentProps(value: any): PropertyConfig {
  if (typeof value === 'boolean') {
    return {
      widget: { type: 'temba-checkbox' }
    };
  }
  if (typeof value === 'number') {
    return {
      widget: {
        type: 'temba-textinput',
        attributes: { type: 'number' }
      }
    };
  }
  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === 'string') {
      return {
        widget: {
          type: 'temba-select',
          attributes: { multi: true, tags: true }
        }
      };
    }
    return {
      widget: {
        type: 'temba-select',
        attributes: { multi: true }
      }
    };
  }
  return {
    widget: { type: 'temba-textinput' }
  };
}

// Type guard functions for working with WidgetConfig
export function isTextInputWidget(
  config: WidgetConfig
): config is { type: 'temba-textinput'; attributes?: TextInputAttributes } {
  return config.type === 'temba-textinput';
}

export function isCompletionWidget(
  config: WidgetConfig
): config is { type: 'temba-completion'; attributes?: CompletionAttributes } {
  return config.type === 'temba-completion';
}

export function isSelectWidget(
  config: WidgetConfig
): config is { type: 'temba-select'; attributes?: SelectAttributes } {
  return config.type === 'temba-select';
}

export function isCheckboxWidget(
  config: WidgetConfig
): config is { type: 'temba-checkbox'; attributes?: CheckboxAttributes } {
  return config.type === 'temba-checkbox';
}

export function isSliderWidget(
  config: WidgetConfig
): config is { type: 'slider'; attributes?: SliderAttributes } {
  return config.type === 'temba-slider';
}
