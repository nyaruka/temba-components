```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'forms/temba-select',
  component: 'temba-select',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-select

Advanced select widget with support for remote fetching, filtering, and multi-selection.

## Features:

- Single and multi-selection support
- Remote data fetching from endpoints
- Search and filtering capabilities
- Option creation on the fly
- Expression support for advanced use cases
- Keyboard navigation

## How to use

```js preview-story
export const Default = () =>
  html`<temba-select placeholder="Choose an option">
    <temba-option name="Red" value="red"></temba-option>
    <temba-option name="Green" value="green"></temba-option>
    <temba-option name="Blue" value="blue"></temba-option>
  </temba-select>`;
```

## Variations

###### With Label

```js preview-story
export const WithLabel = () => html`<temba-select label="Favorite Color" placeholder="Pick a color">
  <temba-option name="Red" value="red"></temba-option>
  <temba-option name="Green" value="green"></temba-option>
  <temba-option name="Blue" value="blue"></temba-option>
  <temba-option name="Purple" value="purple"></temba-option>
</temba-select>`;
```

###### Multi-Select

```js preview-story
export const MultiSelect = () => html`<temba-select label="Languages" placeholder="Select languages" multi>
  <temba-option name="English" value="en"></temba-option>
  <temba-option name="Spanish" value="es"></temba-option>
  <temba-option name="French" value="fr"></temba-option>
  <temba-option name="German" value="de"></temba-option>
  <temba-option name="Italian" value="it"></temba-option>
</temba-select>`;
```

###### Allow Creation

```js preview-story
export const AllowCreate = () => html`<temba-select label="Tags" placeholder="Select or create tags" multi allowCreate>
  <temba-option name="Important" value="important"></temba-option>
  <temba-option name="Urgent" value="urgent"></temba-option>
  <temba-option name="Follow-up" value="followup"></temba-option>
</temba-select>`;
```

###### With Search on Focus

```js preview-story
export const SearchOnFocus = () => html`<temba-select label="Country" placeholder="Search countries" searchOnFocus>
  <temba-option name="United States" value="us"></temba-option>
  <temba-option name="United Kingdom" value="uk"></temba-option>
  <temba-option name="Canada" value="ca"></temba-option>
  <temba-option name="Australia" value="au"></temba-option>
  <temba-option name="Germany" value="de"></temba-option>
  <temba-option name="France" value="fr"></temba-option>
</temba-select>`;
```

###### Disabled

```js preview-story
export const Disabled = () => html`<temba-select label="Status" disabled>
  <temba-option name="Active" value="active" selected></temba-option>
  <temba-option name="Inactive" value="inactive"></temba-option>
</temba-select>`;
```

