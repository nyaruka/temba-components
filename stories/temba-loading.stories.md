```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'ui/temba-loading',
  component: 'temba-loading',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-loading

A loading component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-loading></temba-loading>`;
```

## Variations

###### WithText

```js preview-story
export const WithText = () => html`<temba-loading>Loading data...</temba-loading>`;
```

