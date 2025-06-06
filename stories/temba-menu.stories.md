```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'lists/temba-menu',
  component: 'temba-menu',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-menu

A menu component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-menu></temba-menu>`;
```

## Variations

