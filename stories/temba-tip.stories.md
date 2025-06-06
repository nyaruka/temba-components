```js script
import { html } from '@open-wc/demoing-storybook';
import '../dist/index.js';

export default {
  title: 'ui/temba-tip',
  component: 'temba-tip',
  options: { selectedPanel: 'storybookjs/knobs/panel' },
};
```

# temba-tip

A tooltip component for providing contextual information and help text.

## Features:

- Auto-positioning with smart placement
- Multiple position options (top, bottom, left, right, auto)
- Smooth animations
- Responsive design
- Hide on change functionality

## How to use

```js preview-story
export const Default = () =>
  html`<div style="padding: 50px; text-align: center;">
    <button onclick="this.nextElementSibling.visible = !this.nextElementSibling.visible">
      Hover for tip
    </button>
    <temba-tip text="This is a helpful tooltip!" visible></temba-tip>
  </div>`;
```

## Variations

###### Positioned Top

```js preview-story
export const PositionedTop = () => html`<div style="padding: 50px; text-align: center;">
  <button onclick="this.nextElementSibling.visible = !this.nextElementSibling.visible">
    Click me
  </button>
  <temba-tip text="Tip positioned at the top" position="top" visible></temba-tip>
</div>`;
```

###### Positioned Bottom

```js preview-story
export const PositionedBottom = () => html`<div style="padding: 50px; text-align: center;">
  <button onclick="this.nextElementSibling.visible = !this.nextElementSibling.visible">
    Click me
  </button>
  <temba-tip text="Tip positioned at the bottom" position="bottom" visible></temba-tip>
</div>`;
```

###### Positioned Left

```js preview-story
export const PositionedLeft = () => html`<div style="padding: 50px; text-align: center;">
  <button onclick="this.nextElementSibling.visible = !this.nextElementSibling.visible">
    Click me
  </button>
  <temba-tip text="Tip positioned to the left" position="left" visible></temba-tip>
</div>`;
```

###### Positioned Right

```js preview-story
export const PositionedRight = () => html`<div style="padding: 50px; text-align: center;">
  <button onclick="this.nextElementSibling.visible = !this.nextElementSibling.visible">
    Click me
  </button>
  <temba-tip text="Tip positioned to the right" position="right" visible></temba-tip>
</div>`;
```

###### Long Text

```js preview-story
export const LongText = () => html`<div style="padding: 50px; text-align: center;">
  <button onclick="this.nextElementSibling.visible = !this.nextElementSibling.visible">
    Click for long tip
  </button>
  <temba-tip text="This is a much longer tooltip that demonstrates how the component handles wrapping text and maintains readability even with extended content." visible></temba-tip>
</div>`;
```

