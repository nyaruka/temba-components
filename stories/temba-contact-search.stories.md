```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'contacts/temba-contact-search',
  component: 'temba-contact-search',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-contact-search

A contact-search component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-contact-search></temba-contact-search>`;
```

## Variations

