import { assert, expect } from '@open-wc/testing';
import { assertScreenshot, getClip, getComponent } from './utils.test';
import { Attachment } from '../src/attachments/attachments';
import {
  getInvalidAttachments,
  getValidAttachments,
} from './temba-attachments-uploader.test';
import { AttachmentsList } from '../src/attachments/AttachmentsList';

const TAG = 'temba-attachments-list';
const getAttachmentsList = async (
  attrs: any = {},
  width = 500,
  height = 500
) => {
  const attachmentsList = (await getComponent(
    TAG,
    attrs,
    '',
    width,
    height,
    'display:flex;flex-direction:column;flex-grow:1;'
  )) as AttachmentsList;
  return attachmentsList;
};

export const updateAttachments = async (
  attachmentsList: AttachmentsList,
  validAttachments?: Attachment[],
  invalidAttachments?: Attachment[]
): Promise<void> => {
  attachmentsList.currentAttachments = validAttachments ? validAttachments : [];
  attachmentsList.failedAttachments = invalidAttachments
    ? invalidAttachments
    : [];
  await attachmentsList.updateComplete;
};

describe('temba-attachments-list', () => {
  it('can be created', async () => {
    const attachmentsList: AttachmentsList = await getAttachmentsList();
    assert.instanceOf(attachmentsList, AttachmentsList);
  });

  it('can have different remove icon', async () => {
    const attachmentsPicker: AttachmentsList = await getAttachmentsList({
      removeIcon: 'delete',
    });
    await updateAttachments(attachmentsPicker, getValidAttachments());
    await assertScreenshot(
      'attachments-list/different-remove-icon',
      getClip(attachmentsPicker)
    );
  });

  it('attachments with success uploaded files', async () => {
    const attachmentsList: AttachmentsList = await getAttachmentsList();
    await updateAttachments(attachmentsList, getValidAttachments());
    await assertScreenshot(
      'attachments-list/success-files',
      getClip(attachmentsList)
    );
  });

  it('attachments with failure uploaded files', async () => {
    const attachmentsList: AttachmentsList = await getAttachmentsList();
    await updateAttachments(attachmentsList, null, getInvalidAttachments());
    await assertScreenshot(
      'attachments-list/failure-files',
      getClip(attachmentsList)
    );
  });

  it('attachments with success and failure uploaded files', async () => {
    const attachmentsList: AttachmentsList = await getAttachmentsList();
    await updateAttachments(
      attachmentsList,
      getValidAttachments(),
      getInvalidAttachments()
    );
    await assertScreenshot(
      'attachments-list/success-and-failure-files',
      getClip(attachmentsList)
    );
  });
});
