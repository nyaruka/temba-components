```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'forms/temba-completion',
  component: 'temba-completion',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-completion

A completion component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-completion></temba-completion>`;
```

## Variations

