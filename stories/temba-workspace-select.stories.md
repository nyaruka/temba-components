```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'forms/temba-workspace-select',
  component: 'temba-workspace-select',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-workspace-select

A workspace-select component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-workspace-select></temba-workspace-select>`;
```

## Variations

