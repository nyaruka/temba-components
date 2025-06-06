```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'ui/temba-alert',
  component: 'temba-alert',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-alert

A alert component for interactive UI.

## Features:

- Lightweight web component
- Built with Lit
- Follows design system conventions

## How to use

```js preview-story
export const Info = () =>
  html`<temba-alert>This is an info alert</temba-alert>`;
```

## Variations

###### Error

```js preview-story
export const Error = () => html`<temba-alert level="error">This is an error alert</temba-alert>`;
```

###### Success

```js preview-story
export const Success = () => html`<temba-alert level="success">Success message</temba-alert>`;
```

