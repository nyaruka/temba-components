```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'utility/temba-progress',
  component: 'temba-progress',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-progress

A progress component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-progress></temba-progress>`;
```

## Variations

