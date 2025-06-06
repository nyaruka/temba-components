```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'advanced/temba-flow-details',
  component: 'temba-flow-details',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-flow-details

A flow-details component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-flow-details></temba-flow-details>`;
```

## Variations

