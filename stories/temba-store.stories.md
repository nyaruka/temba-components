```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'utility/temba-store',
  component: 'temba-store',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-store

A store component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-store></temba-store>`;
```

## Variations

