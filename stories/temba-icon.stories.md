```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'ui/temba-icon',
  component: 'temba-icon',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-icon

A versatile icon component using SVG vectors with support for animations and interactions.

## Features:

- Extensive icon library
- Scalable vector graphics
- Animation support (spin, click, change)
- Interactive clickable icons
- Customizable sizing and styling
- Circle background option

## How to use

```js preview-story
export const Default = () =>
  html`<temba-icon name="check"></temba-icon>`;
```

## Variations

###### Different Sizes

```js preview-story
export const DifferentSizes = () => html`<div style="display: flex; align-items: center; gap: 20px;">
  <temba-icon name="star" size="0.8"></temba-icon>
  <temba-icon name="star" size="1"></temba-icon>
  <temba-icon name="star" size="1.5"></temba-icon>
  <temba-icon name="star" size="2"></temba-icon>
  <temba-icon name="star" size="3"></temba-icon>
</div>`;
```

###### Common Icons

```js preview-story
export const CommonIcons = () => html`<div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 20px; align-items: center; text-align: center;">
  <div><temba-icon name="check" size="1.5"></temba-icon><br>check</div>
  <div><temba-icon name="close" size="1.5"></temba-icon><br>close</div>
  <div><temba-icon name="edit" size="1.5"></temba-icon><br>edit</div>
  <div><temba-icon name="delete" size="1.5"></temba-icon><br>delete</div>
  <div><temba-icon name="search" size="1.5"></temba-icon><br>search</div>
  <div><temba-icon name="settings" size="1.5"></temba-icon><br>settings</div>
</div>`;
```

###### Spinning Icon

```js preview-story
export const SpinningIcon = () => html`<temba-icon name="loading" size="2" spin></temba-icon>`;
```

###### Clickable Icons

```js preview-story
export const ClickableIcons = () => html`<div style="display: flex; gap: 20px;">
  <temba-icon name="heart" size="2" clickable animateClick="pulse" onclick="alert('Heart clicked!')"></temba-icon>
  <temba-icon name="star" size="2" clickable animateClick="bounce" onclick="alert('Star clicked!')"></temba-icon>
  <temba-icon name="thumbs_up" size="2" clickable animateClick="pulse" onclick="alert('Thumbs up!')"></temba-icon>
</div>`;
```

###### Circled Icons

```js preview-story
export const CircledIcons = () => html`<div style="display: flex; gap: 20px;">
  <temba-icon name="info" size="2" circled></temba-icon>
  <temba-icon name="warning" size="2" circled></temba-icon>
  <temba-icon name="error" size="2" circled></temba-icon>
  <temba-icon name="check" size="2" circled></temba-icon>
</div>`;
```

###### With Animation

```js preview-story
export const WithAnimation = () => html`<div style="display: flex; gap: 20px;">
  <temba-icon name="check" size="2" animateChange="pulse"></temba-icon>
  <temba-icon name="star" size="2" animateChange="bounce"></temba-icon>
  <temba-icon name="heart" size="2" animateChange="pulse"></temba-icon>
</div>`;
```

