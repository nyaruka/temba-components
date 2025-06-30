import { fixture, assert } from '@open-wc/testing';
import { Lightbox } from '../src/components/interaction/lightbox/Lightbox';
import { assertScreenshot } from './utils.test';

export const getHTML = () => {
  return `<temba-lightbox animationTime="0"></temba-lightbox>`;
};

// let clock: any;

describe('temba-lightbox', () => {
  it('can be created', async () => {
    const lightbox: Lightbox = await fixture(getHTML());
    const img = await fixture(
      "<img style='width:100px;height:auto' src='./test-assets/img/meow.jpg'/>"
    );

    await assertScreenshot('lightbox/img', {
      x: 0,
      y: 0,
      width: 1024,
      height: 768
    });

    assert.instanceOf(lightbox, Lightbox);
    lightbox.showElement(img as HTMLElement);

    await assertScreenshot('lightbox/img-zoomed', {
      x: 0,
      y: 0,
      width: 1024,
      height: 768
    });
  });
});
