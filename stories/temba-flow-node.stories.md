```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'flow/temba-flow-node',
  component: 'temba-flow-node',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-flow-node

A flow-node component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-flow-node></temba-flow-node>`;
```

## Variations

