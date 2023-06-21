import { expect } from '@open-wc/testing';
import { assertScreenshot, getClip, getComponent } from './utils.test';
import { AttachmentsPicker } from '../src/attachments/AttachmentsPicker';
import { Attachment } from '../src/attachments/attachments';

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

const getInitialValue = (text?: string, attachments?: Attachment[]): any => {
  const attachmentsValue = {
    attachments: attachments ? attachments : [],
  };
  return attachmentsValue;
};
const getAttachmentsValue = (value: any): string => {
  return JSON.stringify(value);
};
const getAttachmentsValues = (value: any): any[] => {
  return [value];
};

// valid = attachments that are uploaded and are sent to the server
export const getValidAttachments = (numFiles = 2, url = ''): Attachment[] => {
  const attachments = [];
  let index = 1;
  while (index <= numFiles) {
    const s = 's' + index;
    const attachment = {
      uuid: s,
      content_type: 'image/png',
      type: 'image/png',
      filename: 'name_' + s,
      url: url ? url : 'url_' + s,
      size: 1024,
      error: null,
    } as Attachment;
    attachments.push(attachment);
    index++;
  }
  return attachments;
};
// invalid = attachments that are not uploaded and are not sent to the server
export const getInvalidAttachments = (numFiles = 2): Attachment[] => {
  const attachments = [];
  let index = 1;
  while (index <= numFiles) {
    let attachment = {};
    const f = 'f' + index;
    if (index % 2 === 0) {
      attachment = {
        uuid: f,
        content_type: 'application/octet-stream',
        type: 'application/octet-stream',
        filename: 'name_' + f,
        url: 'url_' + f,
        size: 1024,
        error: 'Unsupported file type',
      } as Attachment;
    } else {
      attachment = {
        uuid: f,
        content_type: 'image/png',
        type: 'image/png',
        filename: 'name_' + f,
        url: 'url_' + f,
        size: 26624,
        error: 'Limit for file uploads is 25.0 MB',
      } as Attachment;
    }
    attachments.push(attachment);
    index++;
  }
  return attachments;
};

describe('temba-attachments-picker', () => {
  it('attachments with different upload icon', async () => {
    const attachmentsPicker: AttachmentsPicker = await getAttachmentsPicker({
      uploadIcon: 'attachment_image',
    });
    await assertScreenshot(
      'attachments-picker/attachments-different-upload-icon',
      getClip(attachmentsPicker)
    );
  });

  it('attachments with different upload label', async () => {
    const attachmentsPicker: AttachmentsPicker = await getAttachmentsPicker({
      uploadLabel: 'Upload Attachments',
    });
    await assertScreenshot(
      'attachments-picker/attachments-different-upload-label',
      getClip(attachmentsPicker)
    );
  });

  it('attachments with different remove icon', async () => {
    const attachmentsPicker: AttachmentsPicker = await getAttachmentsPicker({
      removeIcon: 'delete',
    });
    await updateAttachments(attachmentsPicker, getValidAttachments());
    await assertScreenshot(
      'attachments-picker/attachments-different-remove-icon',
      getClip(attachmentsPicker)
    );
  });

  it('attachments with success uploaded files', async () => {
    const attachmentsPicker: AttachmentsPicker = await getAttachmentsPicker();
    await updateAttachments(attachmentsPicker, getValidAttachments());
    await assertScreenshot(
      'attachments-picker/attachments-with-success-files',
      getClip(attachmentsPicker)
    );
  });

  it('attachments with success uploaded files deserialize and serialize', async () => {
    const initialValue = getInitialValue(null, getValidAttachments());
    const attachmentsValue = getAttachmentsValue(initialValue);
    const attachmentsValues = getAttachmentsValues(initialValue);

    const attachmentsPicker: AttachmentsPicker = await getAttachmentsPicker({
      value: attachmentsValue,
    });
    // deserialize
    expect(attachmentsPicker.currentAttachments).to.deep.equal(
      getValidAttachments()
    );
    // serialize
    expect(attachmentsPicker.value).to.equal(attachmentsValue);
    expect(attachmentsPicker.values).to.deep.equal(attachmentsValues);
  });

  it('attachments with failure uploaded files', async () => {
    const attachmentsPicker: AttachmentsPicker = await getAttachmentsPicker();
    await updateAttachments(attachmentsPicker, null, getInvalidAttachments());
    await assertScreenshot(
      'attachments-picker/attachments-with-failure-files',
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
      'attachments-picker/attachments-with-all-files',
      getClip(attachmentsPicker)
    );
  });
});
