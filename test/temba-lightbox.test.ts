import { fixture, assert, expect } from '@open-wc/testing';
import { Lightbox } from '../src/display/Lightbox';
import { assertScreenshot, delay } from './utils.test';

export const getHTML = () => {
  return `<temba-lightbox animationTime="0"></temba-lightbox>`;
};

describe('temba-lightbox', () => {
  it('can be created', async () => {
    // match the viewport to the screenshot clip so the centered, contained
    // image is fully captured (the shared default is 1920x1080)
    await (window as any).setViewport({
      width: 1024,
      height: 768,
      deviceScaleFactor: 2
    });

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

    // let the mount -> zoom transition settle
    await delay(50);

    // the lightbox shows the clicked image, contained within the viewport
    const shown = lightbox.shadowRoot.querySelector('img') as HTMLImageElement;
    expect(shown, 'lightbox should render the image').to.exist;
    expect(shown.src).to.contain('meow.jpg');
    const rect = shown.getBoundingClientRect();
    expect(rect.width).to.be.at.most(window.innerWidth);
    expect(rect.height).to.be.at.most(window.innerHeight);
    // centered horizontally within a small tolerance
    const centerX = rect.left + rect.width / 2;
    expect(Math.abs(centerX - window.innerWidth / 2)).to.be.lessThan(4);

    await assertScreenshot('lightbox/img-zoomed', {
      x: 0,
      y: 0,
      width: 1024,
      height: 768
    });
  });
});
