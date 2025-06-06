```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'communication/temba-template-editor',
  component: 'temba-template-editor',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-template-editor

A template-editor component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-template-editor></temba-template-editor>`;
```

## Variations

