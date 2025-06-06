```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'forms/temba-button',
  component: 'temba-button',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-button

A button component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-button>Default Button</temba-button>`;
```

## Variations

###### Primary

```js preview-story
export const Primary = () => html`<temba-button primary>Primary Button</temba-button>`;
```

###### Disabled

```js preview-story
export const Disabled = () => html`<temba-button disabled>Disabled Button</temba-button>`;
```

