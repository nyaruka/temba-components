```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'contacts/temba-contact-fields',
  component: 'temba-contact-fields',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-contact-fields

A contact-fields component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-contact-fields></temba-contact-fields>`;
```

## Variations

