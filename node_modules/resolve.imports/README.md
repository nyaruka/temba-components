# resolve.imports

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]
[![Codecov][codecov-image]][codecov-url]

[Imports][subpath-imports] field resolver without file-system reliance.

It uses a new logic differs from [resolve.exports] which also handles:

- [File extensions](#subpath-imports) ([issue in `resolve.exports`][file-extensions-issue])
- [Array patterns](#array-patterns) ([issue in `resolve.exports`][array-patterns-issue])
- [Subpath patterns with file extensions](#subpath-patterns) ([issue in `resolve.exports`][subpath-patterns-issue])

This is used by [@repobuddy/jest] to resolve ESM packages correctly.

## Install

```sh
# npm
npm install resolve.imports

# yarn
yarn add resolve.imports

# pnpm
pnpm add resolve.imports

# rush
rush add -p resolve.imports
```

## Usage

Here is the API:

```ts
resolve(
  pjson: Record<string, unknown>,
  specifier: string,
  options?: { conditions?: string[] }
): string | string[] | undefined
```

- `pjson` is the package.json object.
- `specifier` is the entry to resolve.
- `options` is optional. It contains:
  - `conditions` is the conditions to resolve. Supports [nested conditions](#nested-conditions).

It returns either a `string`, `string[]` (for [array patterns](#array-patterns)) or `undefined`.

### Subpath imports

[Subpath imports][subpath-imports] are supported (the main purpose of this package):

Using [chalk] as an example:

```ts
import { resolve } from 'resolve.imports';

const chalkPackageJson = {
  "imports": {
    "#ansi-styles": "./source/vendor/ansi-styles/index.js",
    "#supports-color": {
      "node": "./source/vendor/supports-color/index.js",
      "default": "./source/vendor/supports-color/browser.js"
    }
  }
}

//=> `./source/vendor/ansi-styles/index.js`
resolve(chalkPackageJson, '#ansi-styles')

//=> `./source/vendor/supports-color/browser.js`
resolve(chalkPackageJson, '#supports-color')

//=> `./source/vendor/supports-color/index.js`
resolve(chalkPackageJson, '#supports-color', { conditions: ['node'] })

//=> `./source/vendor/supports-color/browser.js`
resolve(chalkPackageJson, '#supports-color', { conditions: ['default'] })
```

### File extensions

[File extensions][file-extensions-issue] are supported:

```ts
import { resolve } from 'resolve.imports';

const pjson = {
  imports: {
    '#internal/a.js': './src/internal/a.js',
}

resolve(pjson, '#internal/a.js') //=> `./src/internal/a.js`
```

### Array patterns

```ts
import { resolve } from 'resolve.imports';

const pjson = {
  imports: {
    '#internal/*.js': ['./src/internal/*.js', './src/internal2/*.js']
}

resolve(pjson, '#internal/a.js') //=> ['./src/internal/foo.js', './src/internal2/foo.js']
```

### Subpath patterns

[Subpath patterns][subpath-patterns] are supported:

```ts
import { resolve } from 'resolve.imports';

const pjson = {
  "imports": {
    "#internal/*.js": "./src/internal/*.js"
  }
}

resolve(pjson, '#internal/foo.js') //=> `./src/internal/foo.js`
```

### Nested conditions

[Nested conditions](https://nodejs.org/api/packages.html#nested-conditions) are supported:

```ts
import { resolve } from 'resolve.imports';

const pjson = {
  "imports": {
    '#feature': {
      "node": {
        "import": "./feature-node.mjs",
        "require": "./feature-node.cjs"
      },
      "default": "./feature.mjs"
    }
  }
}

resolve(pjson, '#feature') //=> `./feature.mjs`
resolve(pjson, '#feature', { conditions: ['node', 'import']}) //=> `./feature-node.mjs`
```

### Recursive imports

Resolving recursive imports is **not** supported.
i.e. the following does **not** work:

```ts
import { resolve } from 'resolve.imports';

const pjson = {
  "imports": {
    "#internal/*.js": "#another-internal/*.js",
    "#another-internal/*.js": "./src/path/*.js"
  }
}

resolve(pjson, '#internal/foo.js') //=> undefined
```

It is not supported because the spec does not support it.
See [resolver algorithm][resolver-algorithm] for more information.

## Resolve Algorithm Specification

This module tries to follow the [resolver algorithm][resolver-algorithm] as much as possible.

However, the spec describes the internal functions implementation instead of the abstract behavior.
So some of the spec does not apply to this module.

Here are the key notes:

- asserts are not checked, as this module needs to return `undefined` for other cases.
- errors are not thrown, as the errors in the spec are internal to Node.js. `undefined` is returned instead.

### `PACKAGE_IMPORTS_RESOLVE`

```md
1. Assert: specifier begins with "#". // return `undefined`
2. If specifier is exactly equal to "#" or starts with "#/", then
  1. Throw an Invalid Module Specifier error. // return `undefined`
5. Throw a Package Import Not Defined error. // out of scope
```

### `PACKAGE_TARGET_RESOLVE`

> Return PACKAGE_RESOLVE(target with every instance of "*" replaced by patternMatch, packageURL + "/").

The phrase `target with every instance of "*" replaced by patternMatch` indicates it can contain multiple `*`s.
This module supports multiple `*`s in the replacer pattern as described,
but it is likely a bug in the spec, as the resulting string likely does not make sense.

## References

- [NodeJS resolver algorithm][resolver-algorithm]
- [WICG-import-maps](https://github.com/WICG/import-maps)
- [import-map-emulation](https://nodejs.org/dist/latest-v17.x/docs/api/policy.html#example-import-maps-emulation)
- [nodejs-modules-support](https://github.com/nodejs/modules/issues/477)
- [@node-loader/import-maps](https://github.com/node-loader/node-loader-import-maps)

[@repobuddy/jest]: https://github.com/repobuddy/jest
[array-patterns-issue]: https://github.com/lukeed/resolve.exports/issues/17
[chalk]: https://github.com/chalk/chalk
[codecov-image]: https://codecov.io/gh/cyberuni/resolve.imports/branch/main/graph/badge.svg
[codecov-url]: https://codecov.io/gh/cyberuni/resolve.imports
[downloads-image]: https://img.shields.io/npm/dm/resolve.imports.svg?style=flat
[downloads-url]: https://npmjs.org/package/resolve.imports
[file-extensions-issue]: https://github.com/lukeed/resolve.exports/issues/22
[npm-image]: https://img.shields.io/npm/v/resolve.imports.svg?style=flat
[npm-url]: https://npmjs.org/package/resolve.imports
[resolve.exports]: https://github.com/lukeed/resolve.exports
[resolver-algorithm]: https://nodejs.org/api/esm.html#resolver-algorithm-specification
[subpath-imports]: https://nodejs.org/api/packages.html#subpath-imports
[subpath-patterns-issue]: https://github.com/lukeed/resolve.exports/issues/16
[subpath-patterns]: https://nodejs.org/api/packages.html#subpath-patterns
