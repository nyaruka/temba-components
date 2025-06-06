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

A versatile text input component supporting various input types and features.

## Features:

- Single line and textarea support
- Password fields with masking
- Character counting and GSM encoding
- Auto-growing textareas
- Clearable inputs
- Form validation integration

## How to use

```js preview-story
export const Default = () =>
  html`<temba-textinput placeholder="Enter text" value=""></temba-textinput>`;
```

## Variations

###### With Label

```js preview-story
export const WithLabel = () => html`<temba-textinput label="Full Name" placeholder="Enter your full name" value=""></temba-textinput>`;
```

###### Textarea

```js preview-story
export const Textarea = () => html`<temba-textinput label="Description" placeholder="Enter a description..." textarea></temba-textinput>`;
```

###### Password Field

```js preview-story
export const Password = () => html`<temba-textinput label="Password" placeholder="Enter password" password></temba-textinput>`;
```

###### Clearable

```js preview-story
export const Clearable = () => html`<temba-textinput label="Search" placeholder="Search..." value="Sample text" clearable></temba-textinput>`;
```

###### With Character Counter

```js preview-story
export const WithCounter = () => html`<temba-textinput label="SMS Message" placeholder="Type your message..." maxlength="160" counter="sms"></temba-textinput>`;
```

###### Auto-growing Textarea

```js preview-story
export const AutoGrow = () => html`<temba-textinput label="Notes" placeholder="Start typing and watch it grow..." textarea autogrow></temba-textinput>`;
```

###### Disabled

```js preview-story
export const Disabled = () => html`<temba-textinput label="Disabled Field" value="Cannot edit this" disabled></temba-textinput>`;
```

