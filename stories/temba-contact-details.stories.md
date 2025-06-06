```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'contacts/temba-contact-details',
  component: 'temba-contact-details',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-contact-details

A contact-details component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-contact-details></temba-contact-details>`;
```

## Variations

