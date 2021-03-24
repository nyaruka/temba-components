temba-components is a suite of ui widgets used by various RapidPro projects.

Some of the components:

- `<temba-select/>` Advanced select widget with support for remote fetching and filtering. Also supports multi selection with the ability to enter expressions.

- `<temba-completion/>` Completion widget for completing RP-style expressions
- `<temba-textinput/>` - Standard text field with baked in support for date picking
- `<temba-charcount/>` - SMS segment counter attachable to elements for monitoring
- `<temba-store/>` - In page cache for RP core data types
- `<temba-options/>` - Generic option list with configurable rendering, remote list paging, and keyboard support. Used by temba-select, temba-completion, and temba-list
- `<temba-list/>` - Block rendered option list
- `<temba-dialog/>` - Basic modal
- `<temba-modax/>` - Fancier modal that fetches and submits html rendered forms and is triggered by a slot element
- .. and many more

## Install

We use yarn, so you'll want to install with that if you care about our lock file.

```bash
% yarn install
```

## Demo

To view the interactive demo, use start.

```bash
% yarn start
```

## Testing

All tests live under [/test](test). When running tests, some tests capture screenshots for pixel
comparision under [/screenshots](screenshots/truth).

```bash
% yarn test
```

## Usage

Simply include the built file as a module and you should be off to the races!

```html
<html>
  <head>
    <script type="module">
      import '../out-tsc/temba-components.js';
    </script>
  </head>
  <body>
    <temba-select name="color">
      <temba-option name="Red" value="r"></temba-option>
      <temba-option name="Green" value="g"></temba-option>
      <temba-option name="Blue" value="b"></temba-option>
    </temba-select>
  </body>
</html>
```

To interactively work with components whilst embedded in another project, it can easily be done with a couple nginx rules.

```
  location ~ /out-tsc/(.*) {
      proxy_pass http://localhost:3010/out-tsc/$1;
  }

  location ~ /node_modules/(.*) {
      proxy_pass http://localhost:3010/node_modules/$1;
  }
```

## Storybook

We've added the framework for storybook, but nothing to see here yet!

## Legacy Browser Support

Starting with v1.0 we no longer ship a version with legacy polyfill support. This can still be accomplished manually if desired by toggling the `legacyBuild` attribute in [rollup.config.js](/rollup.config.js#L11).
