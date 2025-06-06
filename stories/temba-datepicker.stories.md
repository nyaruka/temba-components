```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'forms/temba-datepicker',
  component: 'temba-datepicker',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-datepicker

A datepicker component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-datepicker></temba-datepicker>`;
```

## Variations

