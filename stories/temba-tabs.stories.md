```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'ui/temba-tabs',
  component: 'temba-tabs',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-tabs

A tabs component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-tabs></temba-tabs>`;
```

## Variations

