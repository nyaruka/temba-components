```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'contacts/temba-contact-field',
  component: 'temba-contact-field',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-contact-field

A contact-field component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-contact-field></temba-contact-field>`;
```

## Variations

