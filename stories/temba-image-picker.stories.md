```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'media/temba-image-picker',
  component: 'temba-image-picker',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-image-picker

A image-picker component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-image-picker></temba-image-picker>`;
```

## Variations

