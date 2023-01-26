import { assert, expect } from '@open-wc/testing';
import { CustomEventType } from '../src/interfaces';
import { AttachmentEditor } from '../src/attachments/AttachmentEditor';
import { getComponent } from './utils.test';

const TAG = 'temba-attachment-editor';
const getAttachments = async (attrs: any = {}, width = 0) => {
  const attachments = (await getComponent(
    TAG,
    attrs,
    '',
    width,
    0,
    'display:inline-block'
  )) as AttachmentEditor;

  // return right away if we don't have an endpoint
  if (!attachments.endpoint) {
    return attachments;
  }

  // if we have an endpoint, wait for a loaded event before returning
  return new Promise<AttachmentEditor>(resolve => {
    attachments.addEventListener(
      CustomEventType.Loaded,
      async () => {
        resolve(attachments);
      },
      { once: true }
    );
  });
};

describe('temba-attachment-editor', () => {
  it('can initially be created without endpoint', async () => {
    const attachments: AttachmentEditor = await getAttachments();
    assert.instanceOf(attachments, AttachmentEditor);
    expect(attachments.endpoint).is.undefined;
  });
});
