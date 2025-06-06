```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'advanced/temba-omnibox',
  component: 'temba-omnibox',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-omnibox

A omnibox component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-omnibox></temba-omnibox>`;
```

## Variations

