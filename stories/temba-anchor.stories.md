```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'ui/temba-anchor',
  component: 'temba-anchor',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-anchor

A anchor component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-anchor></temba-anchor>`;
```

## Variations

