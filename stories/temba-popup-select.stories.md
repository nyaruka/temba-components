```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'forms/temba-popup-select',
  component: 'temba-popup-select',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-popup-select

A popup-select component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-popup-select></temba-popup-select>`;
```

## Variations

