```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'ui/temba-tab',
  component: 'temba-tab',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-tab

A tab component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-tab></temba-tab>`;
```

## Variations

