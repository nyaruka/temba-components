```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'lists/temba-ticket-list',
  component: 'temba-ticket-list',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-ticket-list

A ticket-list component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-ticket-list></temba-ticket-list>`;
```

## Variations

