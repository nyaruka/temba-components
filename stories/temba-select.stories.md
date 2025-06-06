```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'forms/temba-select',
  component: 'temba-select',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-select

A select component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-select></temba-select>`;
```

## Variations

