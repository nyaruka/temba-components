import { assert, expect } from '@open-wc/testing';
import { assertScreenshot, getClip, getComponent } from './utils.test';
import { AttachmentsUploader } from '../src/attachments/AttachmentsUploader';
import { Attachment } from '../src/attachments/attachments';

const TAG = 'temba-attachments-uploader';
const getAttachmentsUploader = async (
  attrs: any = {},
  width = 500,
  height = 500
) => {
  const attachmentsUploader = (await getComponent(
    TAG,
    attrs,
    '',
    width,
    height,
    'display:flex;flex-direction:column;flex-grow:1;'
  )) as AttachmentsUploader;
  return attachmentsUploader;
};

export const updateAttachments = async (
  attachmentsUploader: AttachmentsUploader,
  validAttachments?: Attachment[],
  invalidAttachments?: Attachment[]
): Promise<void> => {
  attachmentsUploader.currentAttachments = validAttachments
    ? validAttachments
    : [];
  attachmentsUploader.failedAttachments = invalidAttachments
    ? invalidAttachments
    : [];
  await attachmentsUploader.updateComplete;
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

describe('temba-attachments-uploader', () => {
  it('can be created', async () => {
    const attachmentsUploader: AttachmentsUploader =
      await getAttachmentsUploader({}, 25, 25);
    assert.instanceOf(attachmentsUploader, AttachmentsUploader);
  });

  it('can have different upload icon', async () => {
    const attachmentsUploader: AttachmentsUploader =
      await getAttachmentsUploader(
        {
          uploadIcon: 'attachment_image',
        },
        25,
        25
      );
    await assertScreenshot(
      'attachments-uploader/different-upload-icon',
      getClip(attachmentsUploader)
    );
  });

  it('can have different upload label', async () => {
    const attachmentsUploader: AttachmentsUploader =
      await getAttachmentsUploader(
        {
          uploadLabel: 'Upload Attachments',
        },
        145,
        145
      );
    await assertScreenshot(
      'attachments-uploader/different-upload-label',
      getClip(attachmentsUploader)
    );
  });

  it('attachments with success uploaded files', async () => {
    const attachmentsUploader: AttachmentsUploader =
      await getAttachmentsUploader();
    await updateAttachments(attachmentsUploader, getValidAttachments());
    expect(attachmentsUploader.currentAttachments).to.deep.equal(
      getValidAttachments()
    );
  });

  it('attachments with failure uploaded files', async () => {
    const attachmentsUploader: AttachmentsUploader =
      await getAttachmentsUploader();
    await updateAttachments(attachmentsUploader, null, getInvalidAttachments());
    expect(attachmentsUploader.failedAttachments).to.deep.equal(
      getInvalidAttachments()
    );
  });

  it('attachments with success and failure uploaded files', async () => {
    const attachmentsUploader: AttachmentsUploader =
      await getAttachmentsUploader();
    await updateAttachments(
      attachmentsUploader,
      getValidAttachments(),
      getInvalidAttachments()
    );
    expect(attachmentsUploader.currentAttachments).to.deep.equal(
      getValidAttachments()
    );
    expect(attachmentsUploader.failedAttachments).to.deep.equal(
      getInvalidAttachments()
    );
  });
});
