```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'utility/temba-mask',
  component: 'temba-mask',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-mask

A mask component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-mask></temba-mask>`;
```

## Variations

