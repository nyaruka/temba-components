```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'ui/temba-icon',
  component: 'temba-icon',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-icon

A icon component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-icon name="check"></temba-icon>`;
```

## Variations

###### LargeSize

```js preview-story
export const LargeSize = () => html`<temba-icon name="star" size="2"></temba-icon>`;
```

