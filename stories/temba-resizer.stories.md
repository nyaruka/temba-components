```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'utility/temba-resizer',
  component: 'temba-resizer',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-resizer

A resizer component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-resizer></temba-resizer>`;
```

## Variations

