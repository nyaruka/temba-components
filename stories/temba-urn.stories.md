```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'contacts/temba-urn',
  component: 'temba-urn',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-urn

A urn component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-urn></temba-urn>`;
```

## Variations

