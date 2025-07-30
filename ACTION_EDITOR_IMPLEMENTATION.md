# Action Editor Implementation

## Overview

This implementation adds a comprehensive action editing system to the temba-components flow editor. Users can now click on any action within flow nodes to edit the action's properties through a modal dialog.

## Architecture

### Core Components

1. **ActionEditor (`src/flow/ActionEditor.ts`)**

   - Reusable dialog component for editing any action type
   - Dynamic form rendering based on action configuration
   - Event-based communication with parent components
   - Automatic validation and error handling

2. **Action Configuration System (`src/flow/action-config.ts`)**

   - Defines how each action type should be edited
   - Specifies form components, validation rules, and UI properties
   - Extensible system for adding new action types

3. **EditorNode Integration (`src/flow/EditorNode.ts`)**

   - Added click handling for action content areas
   - Fires `ActionEditRequested` events when actions are clicked
   - Prevents edit mode when actions are being removed

4. **Editor Integration (`src/flow/Editor.ts`)**
   - Manages action editor state and lifecycle
   - Handles action save/cancel events
   - Updates flow definition through the store

## Features

### Action Editing Workflow

1. User clicks on any action content in a flow node
2. `ActionEditRequested` event is fired with action details
3. ActionEditor dialog opens with a dynamic form
4. User can modify action properties through appropriate form components
5. Validation occurs on save attempt
6. Updated action is saved to the flow definition
7. Dialog closes and UI updates

### Supported Action Types

- **Send Message (`send_msg`)**
  - Text content with expression support
  - Quick replies configuration
- **Add to Groups (`add_contact_groups`)**
  - Multi-select group picker
  - Searchable group selection

### Form Components

- `temba-completion`: For text fields with expression support
- `temba-textinput`: For basic text input
- `temba-select`: For single/multi-select options
- `temba-checkbox`: For boolean values

### Validation

- Required field validation
- Custom validation functions per action type
- Real-time error display
- Prevents save until all errors are resolved

## Configuration System

### Adding New Action Types

To add support for a new action type, add a configuration to `ACTION_EDITOR_CONFIG`:

```typescript
const myActionConfig: ActionConfig = {
  name: 'My Action',
  color: '#ff6b6b',
  properties: {
    myProperty: {
      component: 'temba-textinput',
      label: 'My Property',
      helpText: 'Description of the property',
      required: true
    }
  },
  validate: (action: MyAction) => {
    const errors: { [key: string]: string } = {};

    if (!action.myProperty) {
      errors.myProperty = 'This field is required';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
};

export const ACTION_EDITOR_CONFIG = {
  // ... existing configs
  my_action: myActionConfig
};
```

### Property Configuration Options

```typescript
interface PropertyConfig {
  component?: string; // Form component to use
  label?: string; // Display label
  helpText?: string; // Help text
  required?: boolean; // Whether field is required
  placeholder?: string; // Input placeholder
  type?: string; // Input type (text, number, email, etc.)
  textarea?: boolean; // Use textarea for text inputs
  expressions?: string; // Enable expression editor
  multi?: boolean; // Multiple selection for selects
  searchable?: boolean; // Enable search for selects
  tags?: boolean; // Allow tag creation for selects
  endpoint?: string; // API endpoint for remote data
  options?: Array<{ name: string; value: string }>; // Static options
  minLength?: number; // Minimum text length
  maxLength?: number; // Maximum text length
}
```

## Event System

### Custom Events

- `temba-action-edit-requested`: Fired when user clicks on action content
- `temba-action-saved`: Fired when user saves changes to an action
- `temba-action-edit-canceled`: Fired when user cancels editing

### Event Details

```typescript
// ActionEditRequested
{
  action: Action,     // The action being edited
  nodeUuid: string   // UUID of the containing node
}

// ActionSaved
{
  action: Action     // The updated action
}

// ActionEditCanceled
{
  // No additional details
}
```

## Testing

The implementation includes comprehensive tests:

- **Unit Tests (`test/temba-action-editor.test.ts`)**

  - Component creation and rendering
  - Form interaction and validation
  - Save/cancel functionality

- **Integration Tests (`test/temba-action-editing-integration.test.ts`)**
  - End-to-end action editing workflow
  - Event handling and propagation
  - Interaction with flow nodes

All tests pass and maintain compatibility with existing functionality.

## Usage Examples

### Basic Usage

The action editor is automatically available when clicking on any action in the flow editor. No additional setup is required.

### Programmatic Usage

```typescript
// Get reference to action editor
const actionEditor = document.querySelector('temba-action-editor');

// Listen for events
actionEditor.addEventListener('temba-action-saved', (event) => {
  console.log('Action saved:', event.detail.action);
});

// Set action to edit (opens dialog automatically)
actionEditor.action = myAction;
```

## Future Enhancements

1. **Additional Action Types**: Extend support to all action types in the flow definition
2. **Advanced Validation**: Add cross-field validation and async validation
3. **Keyboard Navigation**: Add keyboard shortcuts for save/cancel
4. **Undo/Redo**: Integration with flow editor's undo system
5. **Bulk Editing**: Select and edit multiple actions simultaneously

## Files Modified

- `src/flow/ActionEditor.ts` - New action editor component
- `src/flow/action-config.ts` - New action configuration system
- `src/flow/EditorNode.ts` - Added action click handling
- `src/flow/Editor.ts` - Added action editor integration
- `src/interfaces.ts` - Added new event types
- `temba-modules.ts` - Registered new component
- `test/temba-action-editor.test.ts` - Unit tests
- `test/temba-action-editing-integration.test.ts` - Integration tests

All changes maintain backward compatibility and follow existing code patterns in the temba-components library.
