```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'forms/temba-textinput',
  component: 'temba-textinput',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-textinput

A textinput component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Default = () =>
  html`<temba-textinput placeholder="Enter text"></temba-textinput>`;
```

## Variations

###### WithLabel

```js preview-story
export const WithLabel = () => html`<temba-textinput label="Name" placeholder="Your name"></temba-textinput>`;
```

###### Disabled

```js preview-story
export const Disabled = () => html`<temba-textinput label="Disabled" placeholder="Cannot edit" disabled></temba-textinput>`;
```

