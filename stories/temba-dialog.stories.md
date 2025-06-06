```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'ui/temba-dialog',
  component: 'temba-dialog',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-dialog

A dialog component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-dialog></temba-dialog>`;
```

## Variations

