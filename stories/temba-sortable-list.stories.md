```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'lists/temba-sortable-list',
  component: 'temba-sortable-list',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-sortable-list

A sortable-list component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-sortable-list></temba-sortable-list>`;
```

## Variations

