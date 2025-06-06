```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'forms/temba-user-select',
  component: 'temba-user-select',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-user-select

A user-select component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-user-select></temba-user-select>`;
```

## Variations

