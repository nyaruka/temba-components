```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'contacts/temba-contact-name-fetch',
  component: 'temba-contact-name-fetch',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-contact-name-fetch

A contact-name-fetch component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-contact-name-fetch></temba-contact-name-fetch>`;
```

## Variations

