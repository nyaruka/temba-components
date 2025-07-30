/**
 * Examples demonstrating the new clean widget-based PropertyConfig structure
 *
 * This shows the intuitive structure you wanted:
 * - Simple, clean syntax
 * - Type safety enforced by widget.type
 * - No casting or complex type assertions needed
 */

import {
  PropertyConfig,
  TextInputAttributes,
  SelectAttributes
} from './config';

// ✅ Clean structure examples - exactly what you wanted!

export const messageTextExample: PropertyConfig = {
  label: 'Message Text',
  helpText:
    'Enter the message to send. You can use expressions like @contact.name',
  required: true,
  toFormValue: (value: string) => value || '',
  fromFormValue: (value: string) => value?.trim() || '',
  widget: {
    type: 'temba-completion',
    attributes: {
      textarea: true,
      expressions: 'session',
      placeholder: 'Type your message...',
      autogrow: true
    }
  }
};

export const quickRepliesExample: PropertyConfig = {
  label: 'Quick Replies',
  helpText: 'Adding quick replies will show options to users',
  toFormValue: (actionValue: string[]) => {
    if (!Array.isArray(actionValue)) return [];
    return actionValue.map((text) => ({ name: text, value: text }));
  },
  fromFormValue: (formValue: Array<{ name: string; value: string }>) => {
    if (!Array.isArray(formValue)) return [];
    return formValue.map((item) => item.value || item.name || item);
  },
  widget: {
    type: 'temba-select',
    attributes: {
      multi: true,
      tags: true,
      searchable: true,
      placeholder: 'Add quick replies...',
      maxItems: 10,
      maxItemsText: 'You can add up to 10 quick replies',
      nameKey: 'name',
      valueKey: 'value'
    }
  }
};

export const groupSelectionExample: PropertyConfig = {
  label: 'Groups',
  helpText: 'Select the groups to add the contact to',
  required: true,
  widget: {
    type: 'temba-select',
    attributes: {
      multi: true,
      searchable: true,
      endpoint: '/api/v2/groups.json',
      valueKey: 'uuid',
      nameKey: 'name',
      placeholder: 'Search for groups...'
    }
  }
};

export const emailInputExample: PropertyConfig = {
  label: 'Email Address',
  helpText: 'Enter a valid email address',
  required: true,
  pattern: '^[^@]+@[^@]+\\.[^@]+$',
  widget: {
    type: 'temba-textinput',
    attributes: {
      type: 'email',
      placeholder: 'user@example.com',
      clearable: true
    }
  }
};

export const enabledCheckboxExample: PropertyConfig = {
  label: 'Enabled',
  helpText: 'Check to enable this feature',
  widget: {
    type: 'temba-checkbox',
    attributes: {
      size: 20,
      animateChange: 'bounce'
    }
  }
};

export const prioritySliderExample: PropertyConfig = {
  label: 'Priority Level',
  helpText: 'Set the priority from 1 to 10',
  widget: {
    type: 'temba-slider',
    attributes: {
      min: 1,
      max: 10
    }
  }
};

// ✅ Type safety demonstration - these show how TypeScript prevents mistakes

// When you explicitly type the widget, TypeScript catches invalid properties
export const typeScriptSafetyExample = () => {
  // This works fine
  const validTextInput: {
    type: 'temba-textinput';
    attributes?: TextInputAttributes;
  } = {
    type: 'temba-textinput',
    attributes: {
      type: 'email',
      placeholder: 'Enter email',
      clearable: true
    }
  };

  // This would cause TypeScript errors if uncommented:
  /*
  const invalidTextInput: { type: 'temba-textinput'; attributes?: TextInputAttributes } = {
    type: 'temba-textinput',
    attributes: {
      type: 'email',
      multi: true,      // ❌ Error: 'multi' does not exist in type 'TextInputAttributes'
      searchable: true  // ❌ Error: 'searchable' does not exist in type 'TextInputAttributes'
    }
  };
  */

  // Valid select configuration
  const validSelect: { type: 'temba-select'; attributes?: SelectAttributes } = {
    type: 'temba-select',
    attributes: {
      multi: true,
      searchable: true,
      maxItems: 5
    }
  };

  // This would cause TypeScript errors if uncommented:
  /*
  const invalidSelect: { type: 'temba-select'; attributes?: SelectAttributes } = {
    type: 'temba-select',
    attributes: {
      multi: true,
      textarea: true,   // ❌ Error: 'textarea' does not exist in type 'SelectAttributes'
      type: 'email'     // ❌ Error: 'type' does not exist in type 'SelectAttributes'
    }
  };
  */

  return { validTextInput, validSelect };
};

// ✅ Real-world usage in action configuration
export const sendMessageActionExample = {
  name: 'Send Message',
  color: '#3498db',
  properties: {
    text: messageTextExample,
    quick_replies: quickRepliesExample,

    // You can also define them inline - same structure, same type safety
    attachment_url: {
      label: 'Attachment URL',
      helpText: 'Optional URL for an image, video, or audio attachment',
      widget: {
        type: 'temba-textinput',
        attributes: {
          type: 'url',
          placeholder: 'https://example.com/image.jpg',
          clearable: true
        }
      }
    } as PropertyConfig,

    send_immediately: {
      label: 'Send Immediately',
      helpText: 'Send this message without waiting for user response',
      widget: {
        type: 'temba-checkbox'
      }
    } as PropertyConfig
  }
};

// ✅ The structure is clean, intuitive, and type-safe!
// - No complex discriminated unions to think about
// - Widget type automatically restricts attributes
// - IntelliSense works perfectly
// - TypeScript catches configuration mistakes
// - Exactly the structure you wanted!
