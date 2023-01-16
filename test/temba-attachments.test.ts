import { assert, expect } from '@open-wc/testing';
import { CustomEventType } from '../src/interfaces';
import { Attachments } from '../src/attachments/Attachments';
import { getComponent } from './utils.test';

const TAG = 'temba-attachments';
const getAttachments = async (attrs: any = {}, width = 0) => {
  const attachments = (await getComponent(
    TAG,
    attrs,
    '',
    width,
    0,
    'display:inline-block'
  )) as Attachments;

  // return right away if we don't have an endpoint
  if (!attachments.endpoint) {
    return attachments;
  }

  // if we have an endpoint, wait for a loaded event before returning
  return new Promise<Attachments>(resolve => {
    attachments.addEventListener(
      CustomEventType.Loaded,
      async () => {
        resolve(attachments);
      },
      { once: true }
    );
  });
};

describe('temba-content-menu', () => {
  it('can initially be created without endpoint', async () => {
    const attachments: Attachments = await getAttachments();
    assert.instanceOf(attachments, Attachments);
    expect(attachments.endpoint).is.undefined;
  });
});
