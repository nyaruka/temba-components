import { assert, expect, oneEvent } from '@open-wc/testing';
import {
  assertScreenshot,
  getClip,
  getComponent,
  showMouse,
} from './utils.test';
import { AttachmentsDropZone } from '../src/attachments/AttachmentsDropZone';
import { CustomEventType } from '../src/interfaces';

const TAG = 'temba-attachments-drop-zone';
const getAttachmentsDropZone = async (
  attrs: any = {},
  width = 500,
  height = 500
) => {
  const attachmentDropZone = (await getComponent(
    TAG,
    attrs,
    '',
    width,
    height,
    'display:flex;flex-direction:column;flex-grow:1;'
  )) as AttachmentsDropZone;
  return attachmentDropZone;
};

describe('temba-attachments-drop-zone', () => {
  it('can be created', async () => {
    const attachmentsDropZone: AttachmentsDropZone =
      await getAttachmentsDropZone();
    assert.instanceOf(attachmentsDropZone, AttachmentsDropZone);
  });

  // todo - fix this test
  it('can drag and drop', async () => {
    showMouse();
    const attachmentsDropZone: AttachmentsDropZone =
      await getAttachmentsDropZone();
    const clip = attachmentsDropZone.getBoundingClientRect();
    const x = clip.left + clip.width / 2;
    const y = clip.top + clip.height / 2;

    // should not be highlighted
    await moveMouse(clip.left - 5, clip.top - 5);
    expect(attachmentsDropZone.pendingDrop).to.equal(false);

    // should be highlighted
    await mouseDown();
    await moveMouse(x, y);
    attachmentsDropZone.pendingDrop = true;
    await assertScreenshot(
      'attachments-drop-zone/drop-zone-1-before-drop',
      getClip(attachmentsDropZone)
    );

    // should not be highlighted
    await mouseUp();
    attachmentsDropZone.pendingDrop = false;
    await assertScreenshot(
      'attachments-drop-zone/drop-zone-2-after-drop',
      getClip(attachmentsDropZone)
    );

    // should fire the custom event
    // console.log('here1');
    // const dragDropped = oneEvent(attachmentsDropZone, CustomEventType.DragDropped);
    // console.log('here2');
    // const dragDroppedEvent = await dragDropped;
    // console.log('here3', dragDroppedEvent.detail);
    // expect(dragDroppedEvent.detail).to.deep.equal({});
  });

  // todo - fix this test
  it('can have different upload label', async () => {
    showMouse();
    const attachmentsDropZone: AttachmentsDropZone =
      await getAttachmentsDropZone({
        uploadLabel: 'Upload Attachments',
      });
    const clip = attachmentsDropZone.getBoundingClientRect();
    const x = clip.left + clip.width / 2;
    const y = clip.top + clip.height / 2;

    // should not be highlighted
    await moveMouse(clip.left - 5, clip.top - 5);
    expect(attachmentsDropZone.pendingDrop).to.equal(false);

    // should be highlighted
    await mouseDown();
    await moveMouse(x, y);
    attachmentsDropZone.pendingDrop = true;
    await assertScreenshot(
      'attachments-drop-zone/drop-zone-1-before-drop-different-upload-label',
      getClip(attachmentsDropZone)
    );

    // should not be highlighted
    await mouseUp();
    attachmentsDropZone.pendingDrop = false;
    await assertScreenshot(
      'attachments-drop-zone/drop-zone-2-after-drop-different-upload-label',
      getClip(attachmentsDropZone)
    );

    // should fire the custom event
    // console.log('here1');
    // const dragDropped = oneEvent(attachmentsDropZone, CustomEventType.DragDropped);
    // console.log('here2');
    // const dragDroppedEvent = await dragDropped;
    // console.log('here3', dragDroppedEvent.detail);
    // expect(dragDroppedEvent.detail).to.deep.equal({});
  });

  it('can have different drop width', async () => {
    const attachmentsDropZone: AttachmentsDropZone =
      await getAttachmentsDropZone({
        dropWidth: 125,
      });
    await assertScreenshot(
      'attachments-drop-zone/drop-zone-different-drop-width-125',
      getClip(attachmentsDropZone)
    );
    attachmentsDropZone.dropWidth = 250;
    await assertScreenshot(
      'attachments-drop-zone/drop-zone-different-drop-width-250',
      getClip(attachmentsDropZone)
    );
  });
});