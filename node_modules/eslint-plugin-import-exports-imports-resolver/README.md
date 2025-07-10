# eslint-plugin-import-exports-imports-resolver

`eslint-plugin-import` currently doesn't support resolving package exports and imports. This package implements a custom resolver that supports package exports and package imports. This means you'll have no more annoying `import/no-unresolved` errors that are incorrectly failing, and other unwanted errors.

You can customize `eslint-plugin-import`s resolver by adding the following code to your eslint config:

`eslint-config.js`:
```js
module.exports = {
  /** etc */

  settings: {
    'import/resolver': {
      [require.resolve('eslint-plugin-import-exports-imports-resolver')]: {},
    },
  },
};
```

Or if your eslint config is in JSON:
```json
{
  /** etc */
  "settings": {
    "import/resolver": {
      "./node_modules/eslint-plugin-import-exports-imports-resolver/index.js": {}
    }
  }
}
```

## Supported

### Imports

If you specify a `imports` field in your working projects `package.json`, the resolver will try to match any import that starts with a `#` to the `imports` you specified.

`./package.json`:
```json
{
  "#foo": "./bar.js"
}
```

`./my-project.js`:
```js
import { foo } from '#foo'; // ✅ resolves to "./bar.js"
```

### Exports

If you use third party packages that makes use of package exports, the plugin will try to resolve those imports based on the exports defined in that package.

`./my-project.js`:
```js
import { foo } from 'foo/bar'; // ✅ resolves to "node_modules/foo/baz.js"
```

`node_modules/foo/package/json`:
```json
{
  "exports": {
    "./foo/bar": "./baz.js"
  }
}
```

## Configuration

You can also provide aliases:

`eslint-config.js`:
```js
module.exports = {
  /** etc */

  settings: {
    'import/resolver': {
      [require.resolve('eslint-plugin-import-exports-imports-resolver')]: {
        alias: {
          /** Rewrite `project-foo` to `project-foo-v1` */
          'project-foo': 'project-foo-v1',
          /** Rewrite `project-bar` to `project-bar-v1` if it is requested from moduleDirectory `bower_components` */
          'project-bar': {
            alias: 'project-bar-v1',
            fromModuleDirectory: 'bower_components'
          }
        },
        node: {
          moduleDirectory: ['node_modules', 'bower_components'],
        },
      },
    },
  },
};
```