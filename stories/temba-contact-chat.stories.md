```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'contacts/temba-contact-chat',
  component: 'temba-contact-chat',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-contact-chat

A contact-chat component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-contact-chat></temba-contact-chat>`;
```

## Variations

