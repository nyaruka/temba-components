```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'utility/temba-date',
  component: 'temba-date',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-date

A date component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-date></temba-date>`;
```

## Variations

