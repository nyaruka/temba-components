```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'lists/temba-content-menu',
  component: 'temba-content-menu',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-content-menu

A content-menu component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-content-menu></temba-content-menu>`;
```

## Variations

