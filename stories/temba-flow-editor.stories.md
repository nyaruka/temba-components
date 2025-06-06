```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'flow/temba-flow-editor',
  component: 'temba-flow-editor',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-flow-editor

A flow-editor component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-flow-editor></temba-flow-editor>`;
```

## Variations

