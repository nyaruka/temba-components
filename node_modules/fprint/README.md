# Node.js file fingerprinting

Returns hash digest (fingerprint) of a given file or stream in node.js
Any hash algorithm that node.js crypto supports can be given.

## Install

`npm i fprint -S`

## API

Package includes TypeScript definitions.

### fprint

```ts
function fprint(source: Buffer | string | ReadStream, algorithm: string): Promise<string>
```

Returns a Promise that resolves to a string with algorithm hex hash digest for a given *input*.
*input* - either `Buffer`, `ReadStream` or file path. Supports both relative and absolute paths

```ts
const fprint = require('fprint');
const fs = require('fs');
const filepath = '/path/to/file';
const stream = fs.createReadStream(filepath);
const fileContents = fs.readFileSync(filepath);

let shasum = await fprint(file, 'sha256');

let sha256 = fprint(stream, 'sha256');

let shasum = await fprint(filepath, 'sha256')
```

### digestSync

```ts
function digestSync(buffer: Buffer, algorithm: string): string
```

Accepts Buffer and creates it's digest

```ts
const { digestSync } = require('fprint');

const fs = require('fs');
const file = fs.readFileSync('/path/to/file.min.js');
const md5 = digestSync(file, 'md5');
```

### digestStream

```ts
function digestStream(stream: ReadStream, algorithm: string): Promise<string>
```

Accepts stream and creates it's digest

## Testing

1. `shasum -a 256 ./test/fixtures/files/* | awk '{print $1}' > ./test/fixtures/sums/sha256`
2. `md5 -q ./test/fixtures/files/* > ./test/fixtures/sums/md5`
3. `npm test`
