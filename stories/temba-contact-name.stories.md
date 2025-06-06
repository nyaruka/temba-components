```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'contacts/temba-contact-name',
  component: 'temba-contact-name',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-contact-name

A contact-name component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-contact-name></temba-contact-name>`;
```

## Variations

