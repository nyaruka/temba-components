import { assert, expect } from '@open-wc/testing';
import { assertScreenshot, getClip, getComponent } from './utils.test';
import { Attachment } from '../src/attachments/attachments';
import { ImagePicker } from '../src/imagepicker/ImagePicker';
import {
  getInvalidAttachments,
  getValidAttachments,
} from './temba-attachments-uploader.test';

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

const getValidUrl = () => {
  return '../../test-assets/img/meow.jpg';
};

describe('temba-image-picker', () => {
  it('can be created', async () => {
    const imagePicker: ImagePicker = await getImagePicker();
    assert.instanceOf(imagePicker, ImagePicker);
  });

  it('can have different upload icon', async () => {
    const imagePicker: ImagePicker = await getImagePicker({
      uploadIcon: 'attachment',
    });
    await updateAttachments(
      imagePicker,
      null,
      getValidAttachments(1, getValidUrl())
    );
    await assertScreenshot(
      'image-picker/different-upload-icon',
      getClip(imagePicker)
    );
  });

  it('can have different upload label', async () => {
    const imagePicker: ImagePicker = await getImagePicker({
      uploadLabel: 'Upload Image',
    });
    await assertScreenshot(
      'image-picker/different-upload-label',
      getClip(imagePicker)
    );
  });

  it('can have different remove icon', async () => {
    const imagePicker: ImagePicker = await getImagePicker({
      removeIcon: 'delete_small',
    });
    await updateAttachments(
      imagePicker,
      null,
      getValidAttachments(1, getValidUrl())
    );
    await assertScreenshot(
      'image-picker/different-remove-icon',
      getClip(imagePicker)
    );
  });

  it('can have different image width', async () => {
    const imagePicker: ImagePicker = await getImagePicker({
      imageWidth: '200',
    });
    await updateAttachments(
      imagePicker,
      null,
      getValidAttachments(1, getValidUrl())
    );
    await assertScreenshot(
      'image-picker/different-image-width',
      getClip(imagePicker)
    );
  });

  it('can have different image height', async () => {
    const imagePicker: ImagePicker = await getImagePicker({
      imageHeight: '200',
    });
    await updateAttachments(
      imagePicker,
      null,
      getValidAttachments(1, getValidUrl())
    );
    await assertScreenshot(
      'image-picker/different-image-height',
      getClip(imagePicker)
    );
  });

  it('can have different border radius', async () => {
    const imagePicker: ImagePicker = await getImagePicker({
      imageRadius: '50%',
    });
    await updateAttachments(
      imagePicker,
      null,
      getValidAttachments(1, getValidUrl())
    );
    await assertScreenshot(
      'image-picker/different-border-radius',
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
    await assertScreenshot('image-picker/success-file', getClip(imagePicker));
  });

  it('image with success uploaded files deserialize and serialize', async () => {
    const initialValue = getInitialValue(
      null,
      getValidAttachments(1, getValidUrl())
    );
    const attachmentsValue = getAttachmentsValue(initialValue);

    const imagePicker: ImagePicker = await getImagePicker({
      value: attachmentsValue,
    });
    // deserialize
    expect(imagePicker.currentAttachments).to.deep.equal(
      getValidAttachments(1, getValidUrl())
    );
    // serialize
    expect(imagePicker.value).to.equal(attachmentsValue);
  });

  it('image with failure uploaded file', async () => {
    const imagePicker: ImagePicker = await getImagePicker();
    await updateAttachments(imagePicker, null, getInvalidAttachments(1));
    await assertScreenshot('image-picker/failure-file', getClip(imagePicker));
  });
});
