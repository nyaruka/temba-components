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
    // When this field is required (overrides base required)
    required?: (formData: any) => boolean;
    // When this field is disabled
    disabled?: (formData: any) => boolean;
  };

  // Data transformation functions
  toFormValue?: (actionValue: any) => any;
  fromFormValue?: (formValue: any) => any;
}

export interface UIConfig {
  name: string;
  color: string;
  render?: (node: any, action: any) => TemplateResult;

  // Action editor configuration
  // New form-level transformations (takes precedence over properties)
  toFormValue?: (action: Action) => any;
  fromFormValue?: (formData: any) => Action;
  form?: {
    [formFieldName: string]: PropertyConfig;
  };

  // Legacy properties configuration (for backward compatibility)
  properties?: {
    [propertyName: string]: PropertyConfig;
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
