```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'lists/temba-run-list',
  component: 'temba-run-list',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-run-list

A run-list component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-run-list></temba-run-list>`;
```

## Variations

