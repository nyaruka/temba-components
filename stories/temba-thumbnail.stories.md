```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'media/temba-thumbnail',
  component: 'temba-thumbnail',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-thumbnail

A thumbnail component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-thumbnail></temba-thumbnail>`;
```

## Variations

