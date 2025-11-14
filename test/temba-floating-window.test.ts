import { expect, assert } from '@open-wc/testing';
import { FloatingWindow } from '../src/layout/FloatingWindow';
import { assertScreenshot, getComponent } from './utils.test';

describe('temba-floating-window', () => {
  it('can be created', async () => {
    const window = (await getComponent(
      'temba-floating-window',
      {
        title: 'Phone Simulator',
        width: 250,
        height: 700,
        top: 100
      },
      '<div style="padding: 20px;">Window content goes here</div>',
      300,
      750
    )) as FloatingWindow;

    assert.instanceOf(window, FloatingWindow);
    expect(window.title).to.equal('Phone Simulator');
    expect(window.width).to.equal(250);
    expect(window.height).to.equal(700);
    expect(window.top).to.equal(100);

    // show the window for screenshot
    window.hidden = false;
    await window.updateComplete;
    expect(window.hidden).to.equal(false);

    // use custom clip for fixed positioned element
    const clip = {
      x: window.left,
      y: window.top,
      width: window.width,
      height: window.height
    };
    await assertScreenshot('floating-window/default', clip);
  });

  it('starts hidden by default', async () => {
    const window = (await getComponent(
      'temba-floating-window',
      {
        title: 'Test Window'
      },
      '<div>Content</div>'
    )) as FloatingWindow;

    expect(window.hidden).to.equal(true);
    expect(window.classList.contains('hidden')).to.equal(true);
  });

  it('can be shown and hidden', async () => {
    const window = (await getComponent(
      'temba-floating-window',
      {
        title: 'Test Window',
        hidden: true
      },
      '<div>Content</div>'
    )) as FloatingWindow;

    expect(window.hidden).to.equal(true);

    window.show();
    await window.updateComplete;
    expect(window.hidden).to.equal(false);
    expect(window.classList.contains('hidden')).to.equal(false);

    window.hide();
    await window.updateComplete;
    expect(window.hidden).to.equal(true);
    expect(window.classList.contains('hidden')).to.equal(true);
  });

  it('fires close event when close button clicked', async () => {
    const window = (await getComponent(
      'temba-floating-window',
      {
        title: 'Test Window'
      },
      '<div>Content</div>',
      300,
      750
    )) as FloatingWindow;

    // show the window first
    window.hidden = false;
    await window.updateComplete;

    let closed = false;
    window.addEventListener('temba-dialog-hidden', () => {
      closed = true;
    });

    const closeButton = window.shadowRoot.querySelector(
      '.close-button'
    ) as HTMLElement;
    expect(closeButton).to.exist;

    closeButton.click();
    await window.updateComplete;

    expect(closed).to.equal(true);
    expect(window.hidden).to.equal(true);
  });

  it('displays title correctly', async () => {
    const window = (await getComponent(
      'temba-floating-window',
      {
        title: 'Phone Simulator'
      },
      '<div>Content</div>',
      300,
      400
    )) as FloatingWindow;

    window.hidden = false;
    await window.updateComplete;

    const titleElement = window.shadowRoot.querySelector('.title');
    expect(titleElement).to.exist;
    expect(titleElement.textContent).to.equal('Phone Simulator');

    // use custom clip for fixed positioned element
    const clip = {
      x: window.left,
      y: window.top,
      width: window.width,
      height: window.height
    };
    await assertScreenshot('floating-window/with-title', clip);
  });

  it('renders slot content', async () => {
    const window = (await getComponent(
      'temba-floating-window',
      {
        title: 'Test'
      },
      '<div class="test-content">Custom content</div>',
      300,
      400
    )) as FloatingWindow;

    window.hidden = false;
    await window.updateComplete;

    const slotContent = window.querySelector('.test-content');
    expect(slotContent).to.exist;
    expect(slotContent.textContent).to.equal('Custom content');
  });

  it('supports custom dimensions', async () => {
    const window = (await getComponent(
      'temba-floating-window',
      {
        title: 'Custom Size',
        width: 400,
        height: 600
      },
      '<div>Content</div>',
      450,
      650
    )) as FloatingWindow;

    window.hidden = false;
    await window.updateComplete;

    expect(window.width).to.equal(400);
    expect(window.height).to.equal(600);

    // use custom clip for fixed positioned element
    const clip = {
      x: window.left,
      y: window.top,
      width: window.width,
      height: window.height
    };
    await assertScreenshot('floating-window/custom-size', clip);
  });

  it('can be dragged by header', async () => {
    const window = (await getComponent(
      'temba-floating-window',
      {
        title: 'Draggable Window',
        width: 250,
        height: 400,
        top: 100,
        left: 100
      },
      '<div>Content</div>',
      300,
      450
    )) as FloatingWindow;

    window.hidden = false;
    await window.updateComplete;

    const header = window.shadowRoot.querySelector('.header') as HTMLElement;
    expect(header).to.exist;

    // simulate drag by setting dragging state
    window.dragging = true;
    await window.updateComplete;

    const windowElement = window.shadowRoot.querySelector('.window');
    expect(windowElement.classList.contains('dragging')).to.equal(true);
  });

  it('resets position when reopened', async () => {
    const window = (await getComponent(
      'temba-floating-window',
      {
        title: 'Test',
        width: 250,
        height: 400,
        top: 100,
        left: 100
      },
      '<div>Content</div>',
      300,
      450
    )) as FloatingWindow;

    window.hidden = false;
    await window.updateComplete;

    // get initial position after first show
    const initialTop = window.top;
    const initialLeft = window.left;

    // change position
    window.top = 200;
    window.left = 200;
    await window.updateComplete;

    // hide and show
    window.hide();
    await window.updateComplete;
    window.show();
    await window.updateComplete;

    // position should be reset
    expect(window.top).to.equal(initialTop);
    expect(window.left).to.equal(initialLeft);
  });
});
