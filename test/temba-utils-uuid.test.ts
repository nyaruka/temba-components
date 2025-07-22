import { assert } from '@open-wc/testing';
import { generateUUID } from '../src/utils';

describe('UUID Generation', () => {
  it('generates a valid UUID v4 format', () => {
    const uuid = generateUUID();

    // Check that it's a string
    assert.isString(uuid);

    // Check UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    assert.match(uuid, uuidPattern, 'Should match UUID v4 format');

    // Check length
    assert.equal(uuid.length, 36);

    // Check that it contains hyphens in the right places
    assert.equal(uuid[8], '-');
    assert.equal(uuid[13], '-');
    assert.equal(uuid[18], '-');
    assert.equal(uuid[23], '-');
  });

  it('generates unique UUIDs', () => {
    const uuid1 = generateUUID();
    const uuid2 = generateUUID();
    const uuid3 = generateUUID();

    // All should be different
    assert.notEqual(uuid1, uuid2);
    assert.notEqual(uuid2, uuid3);
    assert.notEqual(uuid1, uuid3);
  });

  it('generates many unique UUIDs', () => {
    const uuids = new Set();
    const count = 1000;

    for (let i = 0; i < count; i++) {
      uuids.add(generateUUID());
    }

    // All should be unique
    assert.equal(uuids.size, count, 'All generated UUIDs should be unique');
  });
});
