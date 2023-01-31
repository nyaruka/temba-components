import { assert, expect } from '@open-wc/testing';
import { CustomEventType } from '../src/interfaces';
import { Compose } from '../src/compose/Compose';
import { getComponent } from './utils.test';

const TAG = 'temba-attachment-editor';
const getCompose = async (attrs: any = {}, width = 0) => {
  const compose = (await getComponent(
    TAG,
    attrs,
    '',
    width,
    0,
    'display:inline-block'
  )) as Compose;

  // return right away if we don't have an endpoint
  if (!compose.endpoint) {
    return compose;
  }

  // if we have an endpoint, wait for a loaded event before returning
  return new Promise<Compose>(resolve => {
    compose.addEventListener(
      CustomEventType.Loaded,
      async () => {
        resolve(compose);
      },
      { once: true }
    );
  });
};

describe('temba-compose', () => {
  it('can initially be created without endpoint', async () => {
    const compose: Compose = await getCompose();
    assert.instanceOf(compose, Compose);
    expect(compose.endpoint).is.undefined;
  });
});
