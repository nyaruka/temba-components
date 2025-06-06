```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'forms/temba-field',
  component: 'temba-field',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-field

A field component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-field></temba-field>`;
```

## Variations

