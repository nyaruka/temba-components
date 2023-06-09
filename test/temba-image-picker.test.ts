import { assert, expect } from '@open-wc/testing';
import { assertScreenshot, getClip, getComponent } from './utils.test';
import { Attachment } from '../src/attachments/attachments';
import { ImagePicker } from '../src/imagepicker/ImagePicker';
import {
  getInvalidAttachments,
  getValidAttachments,
} from './temba-attachments-picker.test';

const TAG = 'temba-image-picker';
const getImagePicker = async (attrs: any = {}, width = 500, height = 500) => {
  const imagePicker = (await getComponent(
    TAG,
    attrs,
    '',
    width,
    height,
    'display:flex;flex-direction:column;flex-grow:1;'
  )) as ImagePicker;
  return imagePicker;
};

export const updateAttachments = async (
  imagePicker: ImagePicker,
  validAttachments?: Attachment[],
  invalidAttachments?: Attachment[]
): Promise<void> => {
  imagePicker.currentAttachments = validAttachments ? validAttachments : [];
  imagePicker.failedAttachments = invalidAttachments ? invalidAttachments : [];
  await imagePicker.updateComplete;
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

describe('temba-image-picker', () => {
  it('attachments with success uploaded files', async () => {
    const imagePicker: ImagePicker = await getImagePicker();
    await updateAttachments(imagePicker, null, getValidAttachments(1));
    await assertScreenshot(
      'image-picker/attachments-with-success-files',
      getClip(imagePicker)
    );
  });

  it('attachments with success uploaded files deserialize and serialize', async () => {
    const initialValue = getInitialValue(null, getValidAttachments(1));
    const attachmentsValue = getAttachmentsValue(initialValue);
    const attachmentsValues = getAttachmentsValues(initialValue);

    const imagePicker: ImagePicker = await getImagePicker({
      value: attachmentsValue,
    });
    // deserialize
    expect(imagePicker.currentAttachments).to.deep.equal(
      getValidAttachments(1)
    );
    // serialize
    expect(imagePicker.value).to.equal(attachmentsValue);
    expect(imagePicker.values).to.deep.equal(attachmentsValues);
  });

  it('attachments with failure uploaded files', async () => {
    const imagePicker: ImagePicker = await getImagePicker();
    await updateAttachments(imagePicker, null, getInvalidAttachments(1));
    await assertScreenshot(
      'image-picker/attachments-with-failure-files',
      getClip(imagePicker)
    );
  });

  it('attachments with success and failure uploaded files', async () => {
    const imagePicker: ImagePicker = await getImagePicker();
    await updateAttachments(
      imagePicker,
      getValidAttachments(1),
      getInvalidAttachments(1)
    );
    await assertScreenshot(
      'image-picker/attachments-with-all-files',
      getClip(imagePicker)
    );
  });
});
