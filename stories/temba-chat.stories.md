```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'communication/temba-chat',
  component: 'temba-chat',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-chat

A chat component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-chat></temba-chat>`;
```

## Variations

