```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'lists/temba-list',
  component: 'temba-list',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-list

A list component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-list></temba-list>`;
```

## Variations

