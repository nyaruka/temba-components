```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'ui/temba-lightbox',
  component: 'temba-lightbox',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-lightbox

A lightbox component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-lightbox></temba-lightbox>`;
```

## Variations

