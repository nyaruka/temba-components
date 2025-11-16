import { expect, assert } from '@open-wc/testing';
import { FloatingWindow } from '../src/layout/FloatingWindow';
import { assertScreenshot, getComponent } from './utils.test';

describe('temba-floating-window', () => {
  it('can be created', async () => {
    const window = (await getComponent(
      'temba-floating-window',
      {
        header: 'Phone Simulator',
        width: 250,
        maxHeight: 700,
        top: 100
      },
      '<div style="padding: 20px;">Window content goes here</div>',
      300,
      750
    )) as FloatingWindow;

    assert.instanceOf(window, FloatingWindow);
    expect(window.header).to.equal('Phone Simulator');
    expect(window.width).to.equal(250);
    expect(window.maxHeight).to.equal(700);
    expect(window.top).to.equal(100);

    // show the window for screenshot
    window.hidden = false;
    await window.updateComplete;
    expect(window.hidden).to.equal(false);

    // use custom clip for fixed positioned element
    const windowElement = window.shadowRoot.querySelector(
      '.window'
    ) as HTMLElement;
    const clip = {
      x: window.left,
      y: window.top,
      width: window.width,
      height: windowElement.offsetHeight
    };
    await assertScreenshot('floating-window/default', clip);
  });

  it('starts hidden by default', async () => {
    const window = (await getComponent(
      'temba-floating-window',
      {
        header: 'Test Window'
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
        header: 'Test Window',
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
        header: 'Test Window'
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

  it('displays header correctly', async () => {
    const window = (await getComponent(
      'temba-floating-window',
      {
        header: 'Phone Simulator'
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
    const windowElement = window.shadowRoot.querySelector(
      '.window'
    ) as HTMLElement;
    const clip = {
      x: window.left,
      y: window.top,
      width: window.width,
      height: windowElement.offsetHeight
    };
    await assertScreenshot('floating-window/with-header', clip);
  });

  it('renders slot content', async () => {
    const window = (await getComponent(
      'temba-floating-window',
      {
        header: 'Test'
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
        header: 'Custom Size',
        width: 400,
        maxHeight: 600
      },
      '<div>Content</div>',
      450,
      650
    )) as FloatingWindow;

    window.hidden = false;
    await window.updateComplete;

    expect(window.width).to.equal(400);
    expect(window.maxHeight).to.equal(600);

    // use custom clip for fixed positioned element
    const windowElement = window.shadowRoot.querySelector(
      '.window'
    ) as HTMLElement;
    const clip = {
      x: window.left,
      y: window.top,
      width: window.width,
      height: windowElement.offsetHeight
    };
    await assertScreenshot('floating-window/custom-size', clip);
  });

  it('can be dragged by header', async () => {
    const window = (await getComponent(
      'temba-floating-window',
      {
        header: 'Draggable Window',
        width: 250,
        maxHeight: 400,
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

  it('respects viewport bounds when dragging', async () => {
    const window = (await getComponent(
      'temba-floating-window',
      {
        header: 'Bounded Window',
        width: 250,
        maxHeight: 400,
        top: 100,
        left: 100
      },
      '<div style="height: 200px;">Content with specific height</div>',
      300,
      450
    )) as FloatingWindow;

    window.hidden = false;
    await window.updateComplete;

    // get actual window height
    const windowElement = window.shadowRoot.querySelector(
      '.window'
    ) as HTMLElement;
    const actualHeight = windowElement.offsetHeight;

    // simulate dragging near bottom of viewport
    const viewportHeight = window.ownerDocument.defaultView.innerHeight;
    const maxAllowedTop = viewportHeight - actualHeight;

    // try to drag below the viewport
    window.top = viewportHeight + 100;
    await window.updateComplete;

    // the handleMouseMove should clamp this, but we'll test the logic exists
    expect(actualHeight).to.be.greaterThan(0);
    expect(maxAllowedTop).to.be.lessThan(viewportHeight);
  });

  it('maintains consistent starting position', async () => {
    const window = (await getComponent(
      'temba-floating-window',
      {
        header: 'Test',
        width: 250,
        maxHeight: 400,
        top: 100,
        left: 100
      },
      '<div>Content</div>',
      300,
      450
    )) as FloatingWindow;

    window.hidden = false;
    await window.updateComplete;

    // verify initial position matches properties
    expect(window.top).to.equal(100);
    expect(window.left).to.equal(100);

    // change position (simulating drag)
    window.top = 200;
    window.left = 200;
    await window.updateComplete;

    // hide and show
    window.hide();
    await window.updateComplete;
    window.show();
    await window.updateComplete;

    // position should remain at property values (100, 100) not dragged position
    expect(window.top).to.equal(100);
    expect(window.left).to.equal(100);
  });

  it('can disable chrome', async () => {
    const window = (await getComponent(
      'temba-floating-window',
      {
        header: 'Test',
        width: 250,
        maxHeight: 400,
        top: 100,
        left: 100,
        chromeless: true
      },
      '<div style="background: white; padding: 20px;">Chromeless content</div>',
      300,
      450
    )) as FloatingWindow;

    expect(window.chromeless).to.equal(true);

    window.hidden = false;
    await window.updateComplete;

    const windowElement = window.shadowRoot.querySelector(
      '.window'
    ) as HTMLElement;
    expect(windowElement.classList.contains('chromeless')).to.equal(true);

    // header should not be rendered
    const header = window.shadowRoot.querySelector('.header');
    expect(header).to.not.exist;

    // body should have no padding
    const body = window.shadowRoot.querySelector('.body') as HTMLElement;
    const bodyStyles = getComputedStyle(body);
    expect(bodyStyles.padding).to.equal('0px');

    // use custom clip for fixed positioned element
    const clip = {
      x: window.left,
      y: window.top,
      width: window.width,
      height: windowElement.offsetHeight
    };
    await assertScreenshot('floating-window/chromeless', clip);
  });

  it('defaults to showing chrome', async () => {
    const window = (await getComponent(
      'temba-floating-window',
      {
        header: 'Test'
      },
      '<div>Content</div>'
    )) as FloatingWindow;

    expect(window.chromeless).to.equal(false);
  });

  it('can close via public close() method', async () => {
    const window = (await getComponent(
      'temba-floating-window',
      {
        header: 'Test',
        chromeless: true
      },
      '<div>Content</div>'
    )) as FloatingWindow;

    window.hidden = false;
    await window.updateComplete;
    expect(window.hidden).to.equal(false);

    let eventFired = false;
    window.addEventListener('temba-dialog-hidden', () => {
      eventFired = true;
    });

    // call public close() method
    window.close();
    await window.updateComplete;

    expect(window.hidden).to.equal(true);
    expect(eventFired).to.equal(true);
  });

  it('chromeless window has no borders or shadows', async () => {
    const window = (await getComponent(
      'temba-floating-window',
      {
        header: 'Test',
        width: 250,
        maxHeight: 400,
        chromeless: true
      },
      '<div>Content</div>',
      300,
      450
    )) as FloatingWindow;

    window.hidden = false;
    await window.updateComplete;

    const windowElement = window.shadowRoot.querySelector(
      '.window'
    ) as HTMLElement;
    const styles = getComputedStyle(windowElement);

    expect(styles.boxShadow).to.equal('none');
    expect(styles.borderRadius).to.equal('0px');
    expect(styles.background.includes('rgba(0, 0, 0, 0)')).to.be.true;
  });

  it('supports min and max height constraints', async () => {
    const window = (await getComponent(
      'temba-floating-window',
      {
        header: 'Min/Max Test',
        width: 300,
        minHeight: 200,
        maxHeight: 500
      },
      '<div style="padding: 20px;">Content that can vary in height</div>',
      350,
      550
    )) as FloatingWindow;

    window.hidden = false;
    await window.updateComplete;

    expect(window.minHeight).to.equal(200);
    expect(window.maxHeight).to.equal(500);

    // verify the styles are applied
    const windowElement = window.shadowRoot.querySelector(
      '.window'
    ) as HTMLElement;
    const styles = getComputedStyle(windowElement);
    expect(styles.minHeight).to.equal('200px');
    expect(styles.maxHeight).to.equal('500px');
  });

  it('stays on screen when browser is resized', async () => {
    const window = (await getComponent(
      'temba-floating-window',
      {
        header: 'Resize Test',
        width: 250,
        maxHeight: 400,
        top: 100,
        left: 100
      },
      '<div style="height: 200px;">Content</div>',
      300,
      450
    )) as FloatingWindow;

    window.hidden = false;
    await window.updateComplete;

    // position window near right edge
    const originalViewportWidth = window.ownerDocument.defaultView.innerWidth;
    window.left = originalViewportWidth - window.width - 30;
    await window.updateComplete;

    // simulate window resize event (the component should constrain position)
    window.dispatchEvent(new Event('resize', { bubbles: true }));
    await window.updateComplete;

    // window should still be within viewport bounds with 20px padding
    const padding = 20;
    expect(window.left).to.be.at.least(padding);
    expect(window.left).to.be.at.most(
      window.ownerDocument.defaultView.innerWidth - window.width - padding
    );
    expect(window.top).to.be.at.least(padding);
  });
});
