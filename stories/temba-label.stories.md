```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'advanced/temba-label',
  component: 'temba-label',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-label

A label component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-label></temba-label>`;
```

## Variations

