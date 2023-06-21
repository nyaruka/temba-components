import { expect } from '@open-wc/testing';
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

const getValidUrl = () => {
  return '../../test-assets/img/meow.jpg';
};

describe('temba-image-picker', () => {
  it('image with different upload icon', async () => {
    const imagePicker: ImagePicker = await getImagePicker({
      uploadIcon: 'attachment',
    });
    await updateAttachments(
      imagePicker,
      null,
      getValidAttachments(1, getValidUrl())
    );
    await assertScreenshot(
      'image-picker/image-different-upload-icon',
      getClip(imagePicker)
    );
  });

  it('image with different upload label', async () => {
    const imagePicker: ImagePicker = await getImagePicker({
      uploadLabel: 'Upload Image',
    });
    await assertScreenshot(
      'image-picker/image-different-upload-label',
      getClip(imagePicker)
    );
  });

  it('image with different remove icon', async () => {
    const imagePicker: ImagePicker = await getImagePicker({
      removeIcon: 'delete_small',
    });
    await updateAttachments(
      imagePicker,
      null,
      getValidAttachments(1, getValidUrl())
    );
    await assertScreenshot(
      'image-picker/image-different-remove-icon',
      getClip(imagePicker)
    );
  });

  it('image with different image width', async () => {
    const imagePicker: ImagePicker = await getImagePicker({
      imageWidth: '200',
    });
    await updateAttachments(
      imagePicker,
      null,
      getValidAttachments(1, getValidUrl())
    );
    await assertScreenshot(
      'image-picker/image-different-image-width',
      getClip(imagePicker)
    );
  });

  it('image with different image height', async () => {
    const imagePicker: ImagePicker = await getImagePicker({
      imageHeight: '200',
    });
    await updateAttachments(
      imagePicker,
      null,
      getValidAttachments(1, getValidUrl())
    );
    await assertScreenshot(
      'image-picker/image-different-image-height',
      getClip(imagePicker)
    );
  });

  it('image with different border radius', async () => {
    const imagePicker: ImagePicker = await getImagePicker({
      imageRadius: '50%',
    });
    await updateAttachments(
      imagePicker,
      null,
      getValidAttachments(1, getValidUrl())
    );
    await assertScreenshot(
      'image-picker/image-different-border-radius',
      getClip(imagePicker)
    );
  });

  it('image with success uploaded file', async () => {
    const imagePicker: ImagePicker = await getImagePicker();
    await updateAttachments(
      imagePicker,
      null,
      getValidAttachments(1, getValidUrl())
    );
    await assertScreenshot(
      'image-picker/image-with-success-file',
      getClip(imagePicker)
    );
  });

  it('image with success uploaded files deserialize and serialize', async () => {
    const initialValue = getInitialValue(
      null,
      getValidAttachments(1, getValidUrl())
    );
    const attachmentsValue = getAttachmentsValue(initialValue);
    const attachmentsValues = getAttachmentsValues(initialValue);

    const imagePicker: ImagePicker = await getImagePicker({
      value: attachmentsValue,
    });
    // deserialize
    expect(imagePicker.currentAttachments).to.deep.equal(
      getValidAttachments(1, getValidUrl())
    );
    // serialize
    expect(imagePicker.value).to.equal(attachmentsValue);
    expect(imagePicker.values).to.deep.equal(attachmentsValues);
  });

  it('image with failure uploaded file', async () => {
    const imagePicker: ImagePicker = await getImagePicker();
    await updateAttachments(imagePicker, null, getInvalidAttachments(1));
    await assertScreenshot(
      'image-picker/image-with-failure-file',
      getClip(imagePicker)
    );
  });
});
