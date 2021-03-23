```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/temba-checkbox.js';

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

### Installation

```bash
yarn add temba-checkbox
```

```js
import 'temba-checkbox/temba-checkbox.js';
```

```js preview-story
export const Default = () =>
  html` <temba-checkbox label="Click me for good luck"></temba-checkbox> `;
```

## Variations

###### Custom Title

```js preview-story
export const Checked = () => html`
  <temba-checkbox label="I started out checked" checked></temba-checkbox>
`;
```
