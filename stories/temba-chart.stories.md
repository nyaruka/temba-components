```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'utility/temba-chart',
  component: 'temba-chart',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-chart

A chart component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-chart></temba-chart>`;
```

## Variations

