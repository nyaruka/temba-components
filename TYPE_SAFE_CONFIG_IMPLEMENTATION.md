# Type-Safe PropertyConfig Implementation

## Overview

This implementation addresses the type safety concern with the Action Editor's `PropertyConfig` interface by replacing the single interface with a discriminated union of component-specific configuration types.

## Problem Solved

**Before**: All component attributes were mixed together in a single `PropertyConfig` interface, making it possible to specify invalid property combinations:

```typescript
// This was allowed but invalid - textinput doesn't support 'multi' or 'endpoint'
const badConfig: PropertyConfig = {
  component: 'temba-textinput',
  multi: true, // ❌ Not valid for textinput
  endpoint: '/api/', // ❌ Not valid for textinput
  type: 'email' // ✅ Valid for textinput
};
```

**After**: Component-specific interfaces ensure only valid property combinations:

```typescript
// TypeScript now prevents invalid combinations
const goodConfig: TextInputConfig = {
  component: 'temba-textinput',
  type: 'email',
  placeholder: 'Enter email',
  clearable: true
  // multi: true,     // ❌ TypeScript error - not allowed
  // endpoint: '/api' // ❌ TypeScript error - not allowed
};
```

## Implementation Details

### Component-Specific Interfaces

- **`TextInputConfig`**: For `temba-textinput` component with properties like `type`, `placeholder`, `clearable`, etc.
- **`CompletionConfig`**: For `temba-completion` component with expression support (`expressions`, `counter`, etc.)
- **`SelectConfig`**: For `temba-select` component with properties like `multi`, `searchable`, `endpoint`, etc.
- **`CheckboxConfig`**: For `temba-checkbox` component with properties like `size`, `disabled`, etc.
- **`SliderConfig`**: For `temba-slider` component with properties like `min`, `max`, `range`
- **`GenericConfig`**: For any other components with flexible properties

### Discriminated Union Type

```typescript
export type PropertyConfig =
  | TextInputConfig
  | CompletionConfig
  | SelectConfig
  | CheckboxConfig
  | SliderConfig
  | GenericConfig;
```

### Type Guards

Helper functions to safely work with the discriminated union:

```typescript
if (isSelectConfig(config)) {
  // TypeScript knows config is SelectConfig here
  console.log(config.multi, config.endpoint); // Full IntelliSense support
}
```

## Benefits

1. **Compile-Time Type Safety**: Invalid property combinations are caught at build time, not runtime
2. **Better IntelliSense**: IDEs can provide accurate autocompletion for each component type
3. **Self-Documenting**: Each interface clearly shows what properties are supported
4. **Maintainable**: Easy to add new component types or modify existing ones
5. **Backwards Compatible**: Existing code continues to work with minimal changes

## Usage Examples

### Creating Type-Safe Configurations

```typescript
// Text input for email address
const emailConfig: TextInputConfig = {
  component: 'temba-textinput',
  label: 'Email Address',
  type: 'email',
  placeholder: 'user@example.com',
  required: true,
  clearable: true
};

// Multi-select with API endpoint
const groupsConfig: SelectConfig = {
  component: 'temba-select',
  label: 'Groups',
  multi: true,
  searchable: true,
  endpoint: '/api/v2/groups.json',
  valueKey: 'uuid',
  nameKey: 'name',
  placeholder: 'Search for groups...'
};

// Completion with expression support
const messageConfig: CompletionConfig = {
  component: 'temba-completion',
  label: 'Message Text',
  textarea: true,
  expressions: 'session',
  placeholder: 'Enter message with @expressions'
};
```

### Working with Configurations

```typescript
function processConfig(config: PropertyConfig) {
  // Using component string for type discrimination
  if (config.component === 'temba-select') {
    console.log('Multi-select:', config.multi);
    console.log('Endpoint:', config.endpoint);
  }

  // Using type guard functions (cleaner approach)
  if (isTextInputConfig(config)) {
    console.log('Input type:', config.type);
    console.log('Clearable:', config.clearable);
  }
}
```

## Migration Guide

### For Existing Code

Most existing code will continue to work without changes. The main difference is that you'll now get TypeScript errors for invalid property combinations, which should be fixed.

### For New Code

1. Import the specific config type you need:

   ```typescript
   import { SelectConfig, TextInputConfig } from './config';
   ```

2. Use type assertions for component-specific configurations:

   ```typescript
   const config: SelectConfig = {
     component: 'temba-select',
     multi: true
     // ... other select-specific properties
   };
   ```

3. Use type guards when working with `PropertyConfig` unions:
   ```typescript
   if (isSelectConfig(config)) {
     // Access select-specific properties safely
   }
   ```

## Files Modified

- **`src/flow/config.ts`**: Updated `PropertyConfig` with discriminated union types
- **`src/flow/config-examples.ts`**: Added comprehensive examples demonstrating usage

## Testing

The type system changes are compile-time only and don't affect runtime behavior. All existing functionality remains intact while providing better type safety for future development.
