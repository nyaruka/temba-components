import { Action, SendMsg, AddToGroup } from '../store/flow-definition';

export interface ValidationResult {
  valid: boolean;
  errors: { [key: string]: string };
}

export interface PropertyConfig {
  // Component to use for editing this property
  component?: string; // 'temba-textinput', 'temba-checkbox', 'temba-select', etc.

  // Label for the form field
  label?: string;

  // Help text for the form field
  helpText?: string;

  // Validation rules
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;

  // For select components - options to display
  options?: Array<{ name: string; value: any }>;

  // For textinput - input type
  type?: 'text' | 'email' | 'number' | 'url' | 'tel';

  // Component-specific properties
  textarea?: boolean;
  expressions?: string;
  multi?: boolean;
  searchable?: boolean;
  tags?: boolean;
  placeholder?: string;
  endpoint?: string;
  valueKey?: string;
  nameKey?: string;

  // Data transformation functions
  // Transform action data to form component format
  toFormValue?: (actionValue: any) => any;
  // Transform form component data back to action format
  fromFormValue?: (formValue: any) => any;

  // Additional component-specific props
  [key: string]: any;
}

export interface ActionConfig {
  // Human-readable name for the action
  name: string;

  // Color to use for dialog header (matches action rendering)
  color: string;

  // Property configurations
  properties: {
    [propertyName: string]: PropertyConfig;
  };

  // Custom validation function
  validate?: (action: Action) => ValidationResult;
}

// Configuration for Send Message action
const sendMsgConfig: ActionConfig = {
  name: 'Send Message',
  color: '#3498db', // matches COLORS.send from config.ts
  properties: {
    text: {
      component: 'temba-completion',
      label: 'Message Text',
      helpText:
        'Enter the message to send. You can use expressions like @contact.name',
      required: true,
      textarea: true,
      expressions: 'session'
    },
    quick_replies: {
      component: 'temba-select',
      label: 'Quick Replies',
      helpText: 'Add quick reply options for this message',
      multi: true,
      tags: true,
      searchable: true,
      placeholder: 'Add quick replies...',
      expressions: 'session',
      nameKey: 'name',
      valueKey: 'value',
      maxItems: 10,
      maxItemsText: 'You can add up to 10 quick replies',
      // Transform string array to name/value objects for the form
      toFormValue: (actionValue: string[]) => {
        if (!Array.isArray(actionValue)) return [];
        return actionValue.map((text) => ({ name: text, value: text }));
      },
      // Transform name/value objects back to string array for the action
      fromFormValue: (formValue: Array<{ name: string; value: string }>) => {
        if (!Array.isArray(formValue)) return [];
        return formValue.map((item) => item.value || item.name || item);
      }
    }
  },
  validate: (action: SendMsg) => {
    const errors: { [key: string]: string } = {};

    if (!action.text || action.text.trim() === '') {
      errors.text = 'Message text is required';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
};

// Configuration for Add to Group action
const addToGroupConfig: ActionConfig = {
  name: 'Add to Group',
  color: '#309c42', // matches COLORS.add from config.ts
  properties: {
    groups: {
      component: 'temba-select',
      label: 'Groups',
      helpText: 'Select the groups to add the contact to',
      required: true,
      multi: true,
      searchable: true,
      endpoint: '/api/v2/groups.json',
      valueKey: 'uuid',
      nameKey: 'name',
      placeholder: 'Search for groups...'
    }
  },
  validate: (action: AddToGroup) => {
    const errors: { [key: string]: string } = {};

    if (!action.groups || action.groups.length === 0) {
      errors.groups = 'At least one group must be selected';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
};

// Export action configurations
export const ACTION_EDITOR_CONFIG: { [key: string]: ActionConfig } = {
  send_msg: sendMsgConfig,
  add_contact_groups: addToGroupConfig
};

// Default property type mappings
export function getDefaultComponent(value: any): string {
  if (typeof value === 'boolean') {
    return 'temba-checkbox';
  }
  if (typeof value === 'number') {
    return 'temba-textinput';
  }
  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === 'string') {
      return 'temba-select'; // For string arrays, use multi-select with tags
    }
    return 'temba-select'; // For object arrays, use multi-select
  }
  // Default to text input for strings and unknown types
  return 'temba-textinput';
}

// Get component properties for default mappings
export function getDefaultComponentProps(value: any): Partial<PropertyConfig> {
  if (typeof value === 'number') {
    return { type: 'number' };
  }
  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === 'string') {
      return { multi: true, tags: true };
    }
    return { multi: true };
  }
  return {};
}
