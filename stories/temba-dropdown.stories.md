```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'ui/temba-dropdown',
  component: 'temba-dropdown',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-dropdown

A dropdown component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-dropdown></temba-dropdown>`;
```

## Variations

