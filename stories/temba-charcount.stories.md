```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'utility/temba-charcount',
  component: 'temba-charcount',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-charcount

A charcount component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-charcount></temba-charcount>`;
```

## Variations

