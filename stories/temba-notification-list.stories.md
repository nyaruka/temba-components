```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'lists/temba-notification-list',
  component: 'temba-notification-list',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-notification-list

A notification-list component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-notification-list></temba-notification-list>`;
```

## Variations

