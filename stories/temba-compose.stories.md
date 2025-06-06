```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'communication/temba-compose',
  component: 'temba-compose',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-compose

A compose component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-compose></temba-compose>`;
```

## Variations

