```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'forms/temba-checkbox',
  component: 'temba-checkbox',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-checkbox

A component for...

## Features:

- a
- b
- ...

## How to use

```js preview-story
export const Default = () =>
  html`<temba-checkbox label="Click me for good luck"></temba-checkbox> `;
```

## Variations

###### Custom Title

```js preview-story
export const Checked = () => html`
  <temba-checkbox label="I started out checked" checked></temba-checkbox>
`;
```
