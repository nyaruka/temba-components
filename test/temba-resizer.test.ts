import '../temba-modules';
import { fixture, assert, oneEvent } from '@open-wc/testing';
import { Resizer } from '../src/layout/Resizer';
import { CustomEventType } from '../src/interfaces';

const createResizer = async (
  markup = '<temba-resizer></temba-resizer>'
): Promise<Resizer> => {
  return (await fixture(markup)) as Resizer;
};

describe('temba-resizer', () => {
  it('clamps width to minWidth', async () => {
    const r = await createResizer();
    r.setWidth(10);
    assert.equal(r.currentWidth, r.minWidth);
  });

  it('clamps width to maxWidth', async () => {
    const r = await createResizer();
    r.setWidth(999999);
    assert.equal(r.currentWidth, r.maxWidth);
  });

  it('accepts width within bounds', async () => {
    const r = await createResizer();
    r.setWidth(500);
    assert.equal(r.currentWidth, 500);
  });

  it('applies --box-width style on update', async () => {
    const r = await createResizer();
    r.setWidth(350);
    await r.updateComplete;
    assert.equal(r.style.getPropertyValue('--box-width'), '350px');
  });

  it('honors custom min and max', async () => {
    const r = await createResizer(
      '<temba-resizer minWidth="100" maxWidth="400"></temba-resizer>'
    );
    r.setWidth(50);
    assert.equal(r.currentWidth, 100);
    r.setWidth(9000);
    assert.equal(r.currentWidth, 400);
  });

  it('fires Resized event and toggles resizing flag', async () => {
    const r = await createResizer();
    r.setWidth(300);
    await r.updateComplete;

    const handle = r.shadowRoot.querySelector('.resizer') as HTMLElement;
    assert.isNotNull(handle);

    const mousedown = new MouseEvent('mousedown', { bubbles: true });
    Object.defineProperty(mousedown, 'x', { value: 0 });
    handle.dispatchEvent(mousedown);
    assert.isTrue(r.resizing);
    const startWidth = r.currentWidth;

    const mousemove = new MouseEvent('mousemove');
    Object.defineProperty(mousemove, 'x', { value: 50 });
    window.dispatchEvent(mousemove);
    assert.equal(r.currentWidth, startWidth + 50);

    const mouseup = new MouseEvent('mouseup');
    Object.defineProperty(mouseup, 'x', { value: 50 });
    const listener = oneEvent(r, CustomEventType.Resized, false);
    window.dispatchEvent(mouseup);
    const evt: any = await listener;

    assert.isFalse(r.resizing);
    assert.property(evt.detail, 'width');
    assert.equal(evt.detail.width, r.currentWidth);
  });
});
