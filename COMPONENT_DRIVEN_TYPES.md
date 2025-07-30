# Component-Driven Type Inference Implementation

## What Changed

The `PropertyConfig` system now uses **conditional types** and **mapped types** to automatically infer the correct properties based on the `component` value, eliminating the need for explicit type assertions.

## Key Improvements

### Before (Required Type Assertions)

```typescript
// ❌ OLD WAY - Required explicit typing with 'as SelectConfig'
const config = {
  component: 'temba-select',
  multi: true,
  endpoint: '/api/data'
} as SelectConfig; // 👈 Type assertion required
```

### After (Automatic Type Inference)

```typescript
// ✅ NEW WAY - TypeScript automatically knows this is a select config
const config = {
  component: 'temba-select' as const, // 👈 Only 'as const' needed
  multi: true, // ✅ Automatically valid for select
  endpoint: '/api/data' // ✅ Automatically valid for select
  // type: 'email',   // ❌ TypeScript error - not valid for select
};
```

## Technical Implementation

### Component Properties Mapping

Instead of separate interfaces, we now use mapped types:

```typescript
interface ComponentPropsMap {
  'temba-textinput': TextInputProps;
  'temba-completion': CompletionProps;
  'temba-select': SelectProps;
  'temba-checkbox': CheckboxProps;
  'temba-slider': SliderProps;
}
```

### Conditional Type Magic

The `PropertyConfig` type uses conditional types to automatically select the right properties:

```typescript
export type PropertyConfig<T extends string = string> = BasePropertyConfig & {
  component: T;
} & (T extends keyof ComponentPropsMap
    ? ComponentPropsMap[T]
    : { [key: string]: any });
```

This means:

- If `T` is `'temba-select'`, you get `SelectProps`
- If `T` is `'temba-textinput'`, you get `TextInputProps`
- If `T` is something else, you get flexible `{ [key: string]: any }`

## Benefits

1. **No Type Assertions**: The `component` property drives everything automatically
2. **Perfect IntelliSense**: TypeScript knows exactly what properties are available
3. **Immediate Error Feedback**: Invalid combinations are caught as you type
4. **Cleaner Code**: No more `as ComponentConfig` everywhere
5. **Self-Documenting**: The component value tells you everything

## Usage Examples

### Creating Configurations

```typescript
// Text input - TypeScript automatically provides text input properties
const emailField = {
  component: 'temba-textinput' as const,
  type: 'email', // ✅ Valid
  clearable: true // ✅ Valid
  // multi: true,     // ❌ Error: Property 'multi' does not exist
};

// Select - TypeScript automatically provides select properties
const groupSelect = {
  component: 'temba-select' as const,
  multi: true, // ✅ Valid
  endpoint: '/api/' // ✅ Valid
  // type: 'email',   // ❌ Error: Property 'type' does not exist
};
```

### In Action Editor Configurations

```typescript
// Clean, no type assertions needed
properties: {
  text: {
    component: 'temba-completion',
    textarea: true,
    expressions: 'session'
  },
  groups: {
    component: 'temba-select',
    multi: true,
    endpoint: '/api/v2/groups.json'
  }
}
```

## Migration

Existing code continues to work! The main changes:

1. Remove `as ComponentConfig` type assertions
2. Add `as const` to component property values when needed for strict typing
3. Enjoy better type safety and IntelliSense

## The Magic Explained

When you write:

```typescript
const config = {
  component: 'temba-select' as const
  // ...properties
};
```

TypeScript:

1. Sees `component: 'temba-select'` (literal type due to `as const`)
2. Looks up `'temba-select'` in `ComponentPropsMap`
3. Finds `SelectProps`
4. Automatically makes select properties available
5. Prevents non-select properties from being used

No manual typing, no assertions - the component value drives everything!
