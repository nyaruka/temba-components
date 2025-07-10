import {createHash} from 'crypto'
import * as path from 'path'
import {ReadStream, createReadStream} from 'fs'
import * as callsite from 'callsite'
import * as isstream from 'isstream'

/**
 * Utility function to create stream based on file's location, supports both relative and absolute paths
 * @param  {String} location [description]
 * @return {ReadStream}
 */
function createStream(location: string): ReadStream | void {
  if (path.isAbsolute(location)) {
    return createReadStream(location)
  }

  // For relative paths
  const stack = callsite()
  const length = stack.length

  // Filter out the file itself
  let iterator = 0
  while (iterator < length) {
    const call = stack[iterator++]
    const filename = call.getFileName()
    if (__filename !== filename) {
      const source = path.resolve(path.dirname(filename), location)
      return createReadStream(source)
    }
  }
}

/**
 * Accepts Buffer and creates it's digest
 * @param  {Buffer}   buffer
 * @param  {string}   algorithm
 * @return {string}
 */
export function digestSync(buffer: Buffer, algorithm: string): string {
  const hash = createHash(algorithm).update(buffer)
  return hash.digest('hex')
}

/**
 * Accepts stream and creates it's digest
 * @param  {ReadStream}   stream
 * @param  {string}           algorithm
 * @return {Promise<string>}
 */
export function digestStream(
  stream: ReadStream,
  algorithm: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash(algorithm)

    stream.on('data', (chunk) => hash.update(chunk))

    stream.on('error', (error) => reject(error))

    stream.on('end', () => resolve(hash.digest('hex')))
  })
}

function isReadable(object: any): object is ReadStream {
  return isstream.isReadable(object)
}

function isString(x: any): x is string {
  return typeof x === 'string'
}

/**
 * Creates fingerprint for a given input
 * @param  {Buffer|string|ReadableStream}   source
 * @param  {string}                         algorithm - any supported algorithm by node.js crypto module https://nodejs.org/api/crypto.html#crypto_crypto_createhash_algorithm
 * @return {Promise<string>}
 */
export async function createFingerprint(
  source: Buffer | string | ReadStream,
  algorithm: string
): Promise<string> | never {
  // We have file buffered in memory, create digest on it
  if (Buffer.isBuffer(source)) {
    return digestSync(source, algorithm)
  }

  if (isReadable(source)) {
    return digestStream(source, algorithm)
  }

  if (isString(source)) {
    const stream = createStream(source)
    if (stream) {
      return digestStream(stream, algorithm)
    }
  }

  throw new TypeError(
    'source must be either a buffer, readable stream or a string with absolute or relative path'
  )
}

export default createFingerprint
