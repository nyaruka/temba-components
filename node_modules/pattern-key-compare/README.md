# pattern-key-compare

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]
[![Codecov][codecov-image]][codecov-url]

Implementation of `PATTERN_KEY_COMPARE` of [Node.js resolver algorithm][resolver-algorithm].

Here is a snapshot of the algorithm from Node.js v19.3.0:

`PATTERN_KEY_COMPARE(keyA, keyB)`

1. Assert: `keyA` ends with `"/"` or contains only a single `"*"`.
2. Assert: `keyB` ends with `"/"` or contains only a single `"*"`.
3. Let `baseLengthA` be the index of `"*"` in `keyA` plus one, if `keyA` contains `"*"`, or the length of `keyA` otherwise.
4. Let `baseLengthB` be the index of `"*"` in `keyB` plus one, if `keyB` contains `"*"`, or the length of `keyB` otherwise.
5. If `baseLengthA` is greater than `baseLengthB`, return `-1`.
6. If `baseLengthB` is greater than `baseLengthA`, return `1`.
7. If `keyA` does not contain "*", return `1`.
8. If `keyB` does not contain "*", return `-1`.
9. If the length of `keyA` is greater than the length of `keyB`, return `-1`.
10. If the length of `keyB` is greater than the length of `keyA`, return `1`.
11. Return `0`.

## Notes

> Assert: keyA/B ends with "/" or contains only a single "*"

Note that this is not correct as nowadays it supports file extensions. e.g.:

- `#a/b.js`
- `./foo/*.js`

## Install

```sh
# npm
npm install pattern-key-compare

# yarn
yarn add pattern-key-compare

# pnpm
pnpm add pattern-key-compare

# rush
rush add -p pattern-key-compare
```

## Usage

```ts
import { patternKeyCompare } from 'pattern-key-compare'

[...].sort(patternKeyCompare)
```

[codecov-image]: https://codecov.io/gh/cyberuni/resolve.imports/branch/main/graph/badge.svg
[codecov-url]: https://codecov.io/gh/cyberuni/resolve.imports
[downloads-image]: https://img.shields.io/npm/dm/pattern-key-compare.svg?style=flat
[downloads-url]: https://npmjs.org/package/pattern-key-compare
[npm-image]: https://img.shields.io/npm/v/pattern-key-compare.svg?style=flat
[npm-url]: https://npmjs.org/package/pattern-key-compare
[resolver-algorithm]: https://nodejs.org/api/esm.html#resolver-algorithm-specification
