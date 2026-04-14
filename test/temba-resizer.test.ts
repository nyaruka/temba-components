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
    // simulate mousedown to start resize
    r.startResize({ x: 0 } as MouseEvent);
    assert.isTrue(r.resizing);
    // simulate drag
    r.resize({ x: 50 } as MouseEvent);
    const listener = oneEvent(r, CustomEventType.Resized);
    r.stopResize();
    const evt: any = await listener;
    assert.isFalse(r.resizing);
    assert.property(evt.detail, 'width');
    assert.equal(evt.detail.width, r.currentWidth);
  });
});
