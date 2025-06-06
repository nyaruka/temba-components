```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'contacts/temba-contact-badges',
  component: 'temba-contact-badges',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-contact-badges

A contact-badges component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-contact-badges></temba-contact-badges>`;
```

## Variations

