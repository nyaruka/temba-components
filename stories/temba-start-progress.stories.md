```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'utility/temba-start-progress',
  component: 'temba-start-progress',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-start-progress

A start-progress component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-start-progress></temba-start-progress>`;
```

## Variations

