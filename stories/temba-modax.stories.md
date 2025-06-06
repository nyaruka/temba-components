```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'ui/temba-modax',
  component: 'temba-modax',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-modax

A modax component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-modax></temba-modax>`;
```

## Variations

