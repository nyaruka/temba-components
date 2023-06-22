import { assert, expect } from '@open-wc/testing';
import { assertScreenshot, getClip, getComponent } from './utils.test';
import { AttachmentsPicker } from '../src/attachments/AttachmentsPicker';
import { Attachment } from '../src/attachments/attachments';
import {
  getInvalidAttachments,
  getValidAttachments,
} from './temba-attachments-uploader.test';

const TAG = 'temba-attachments-picker';
const getAttachmentsPicker = async (
  attrs: any = {},
  width = 500,
  height = 500
) => {
  const attachmentsPicker = (await getComponent(
    TAG,
    attrs,
    '',
    width,
    height,
    'display:flex;flex-direction:column;flex-grow:1;'
  )) as AttachmentsPicker;
  return attachmentsPicker;
};

export const updateAttachments = async (
  attachmentsPicker: AttachmentsPicker,
  validAttachments?: Attachment[],
  invalidAttachments?: Attachment[]
): Promise<void> => {
  attachmentsPicker.currentAttachments = validAttachments
    ? validAttachments
    : [];
  attachmentsPicker.failedAttachments = invalidAttachments
    ? invalidAttachments
    : [];
  await attachmentsPicker.updateComplete;
};

const getInitialValue = (attachments?: Attachment[]): any => {
  const attachmentsValue = {
    attachments: attachments ? attachments : [],
  };
  return attachmentsValue;
};
const getAttachmentsValue = (value: any): string => {
  return JSON.stringify(value);
};

describe('temba-attachments-picker', () => {
  it('can be created', async () => {
    const attachmentsPicker: AttachmentsPicker = await getAttachmentsPicker();
    assert.instanceOf(attachmentsPicker, AttachmentsPicker);
  });

  it('can have different upload icon', async () => {
    const attachmentsPicker: AttachmentsPicker = await getAttachmentsPicker({
      uploadIcon: 'attachment_image',
    });
    await assertScreenshot(
      'attachments-picker/different-upload-icon',
      getClip(attachmentsPicker)
    );
  });

  it('can have different upload label', async () => {
    const attachmentsPicker: AttachmentsPicker = await getAttachmentsPicker({
      uploadLabel: 'Upload Attachments',
    });
    await assertScreenshot(
      'attachments-picker/different-upload-label',
      getClip(attachmentsPicker)
    );
  });

  it('can have different remove icon', async () => {
    const attachmentsPicker: AttachmentsPicker = await getAttachmentsPicker({
      removeIcon: 'delete',
    });
    await updateAttachments(attachmentsPicker, getValidAttachments());
    await assertScreenshot(
      'attachments-picker/different-remove-icon',
      getClip(attachmentsPicker)
    );
  });

  it('attachments with success uploaded files', async () => {
    const attachmentsPicker: AttachmentsPicker = await getAttachmentsPicker();
    await updateAttachments(attachmentsPicker, getValidAttachments());
    await assertScreenshot(
      'attachments-picker/success-files',
      getClip(attachmentsPicker)
    );
  });

  it('attachments with success uploaded files deserialize and serialize', async () => {
    const initialValue = getInitialValue(getValidAttachments());
    const attachmentsValue = getAttachmentsValue(initialValue);

    const attachmentsPicker: AttachmentsPicker = await getAttachmentsPicker({
      value: attachmentsValue,
    });
    // deserialize
    expect(attachmentsPicker.currentAttachments).to.deep.equal(
      getValidAttachments()
    );
    // serialize
    expect(attachmentsPicker.value).to.equal(attachmentsValue);
  });

  it('attachments with failure uploaded files', async () => {
    const attachmentsPicker: AttachmentsPicker = await getAttachmentsPicker();
    await updateAttachments(attachmentsPicker, null, getInvalidAttachments());
    await assertScreenshot(
      'attachments-picker/failure-files',
      getClip(attachmentsPicker)
    );
  });

  it('attachments with success and failure uploaded files', async () => {
    const attachmentsPicker: AttachmentsPicker = await getAttachmentsPicker();
    await updateAttachments(
      attachmentsPicker,
      getValidAttachments(),
      getInvalidAttachments()
    );
    await assertScreenshot(
      'attachments-picker/success-and-failure-files',
      getClip(attachmentsPicker)
    );
  });
});
