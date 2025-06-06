```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'ui/temba-toast',
  component: 'temba-toast',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-toast

A toast component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-toast></temba-toast>`;
```

## Variations

