```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'contacts/temba-contact-notepad',
  component: 'temba-contact-notepad',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-contact-notepad

A contact-notepad component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-contact-notepad></temba-contact-notepad>`;
```

## Variations

