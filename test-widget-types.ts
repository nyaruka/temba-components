// Test file to verify type safety with the new widget structure
import {
  PropertyConfig,
  TextInputAttributes,
  SelectAttributes
} from './src/flow/config';

// ✅ Valid configurations - these should work
const validTextInput: PropertyConfig = {
  label: 'Text Input',
  widget: {
    type: 'temba-textinput',
    attributes: {
      type: 'email',
      placeholder: 'Enter email',
      clearable: true
    }
  }
};

const validSelect: PropertyConfig = {
  label: 'Select Options',
  widget: {
    type: 'temba-select',
    attributes: {
      multi: true,
      searchable: true,
      maxItems: 5,
      placeholder: 'Choose options...'
    }
  }
};

// ❌ These show TypeScript catches invalid properties when you explicitly type the widget

// This will cause TypeScript error because 'multi' doesn't exist on TextInputAttributes
const strictTextInputWidget: {
  type: 'temba-textinput';
  attributes?: TextInputAttributes;
} = {
  type: 'temba-textinput',
  attributes: {
    type: 'email',
    // multi: true, // ❌ Uncomment to see error: 'multi' does not exist in type 'TextInputAttributes'
    clearable: true
  }
};

// This will cause TypeScript error because 'textarea' doesn't exist on SelectAttributes
const strictSelectWidget: {
  type: 'temba-select';
  attributes?: SelectAttributes;
} = {
  type: 'temba-select',
  attributes: {
    multi: true,
    searchable: true,
    // textarea: true, // ❌ Uncomment to see error: 'textarea' does not exist in type 'SelectAttributes'
    maxItems: 10
  }
};

// The clean structure you wanted with full type safety
const quickRepliesExample: PropertyConfig = {
  label: 'Quick Replies',
  helpText: 'Adding quick replies will show options to users',
  toFormValue: (actionValue: string[]) => {
    return actionValue?.map((text) => ({ name: text, value: text })) || [];
  },
  fromFormValue: (formValue: any[]) => {
    return formValue?.map((item) => item.value || item.name || item) || [];
  },
  widget: {
    type: 'temba-select',
    attributes: {
      multi: true,
      searchable: true,
      maxItems: 10,
      placeholder: 'Add quick replies...',
      tags: true,
      nameKey: 'name',
      valueKey: 'value'
      // textarea: true // ❌ This would be an error if uncommented - not valid for select
    }
  }
};

export {
  validTextInput,
  validSelect,
  strictTextInputWidget,
  strictSelectWidget,
  quickRepliesExample
};
