```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'lists/temba-shortcuts',
  component: 'temba-shortcuts',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-shortcuts

A shortcuts component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-shortcuts></temba-shortcuts>`;
```

## Variations

