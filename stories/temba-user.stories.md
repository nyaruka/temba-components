```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'utility/temba-user',
  component: 'temba-user',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-user

A user component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-user></temba-user>`;
```

## Variations

