```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'utility/temba-field-manager',
  component: 'temba-field-manager',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-field-manager

A field-manager component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-field-manager></temba-field-manager>`;
```

## Variations

