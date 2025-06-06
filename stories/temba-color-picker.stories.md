```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'media/temba-color-picker',
  component: 'temba-color-picker',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-color-picker

A color-picker component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-color-picker></temba-color-picker>`;
```

## Variations

