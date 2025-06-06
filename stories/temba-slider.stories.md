```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'utility/temba-slider',
  component: 'temba-slider',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-slider

A slider component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-slider></temba-slider>`;
```

## Variations

