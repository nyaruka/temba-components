```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'contacts/temba-contact-pending',
  component: 'temba-contact-pending',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-contact-pending

A contact-pending component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-contact-pending></temba-contact-pending>`;
```

## Variations

