```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'ui/temba-tip',
  component: 'temba-tip',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-tip

A tip component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-tip></temba-tip>`;
```

## Variations

