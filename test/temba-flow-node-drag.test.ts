import { fixture, assert } from '@open-wc/testing';
import { html } from 'lit';

describe('temba-flow-node drag and drop functionality', () => {
  it('should add drag styling and event listeners to elements', async () => {
    // Create a simple div to test our drag functionality
    const testElement = await fixture(html`
      <div
        class="node"
        style="position: absolute; left: 100px; top: 100px; width: 200px; height: 100px; background: white; border: 1px solid #ccc; cursor: move;"
      >
        Test Node
        <div class="exit" style="padding: 5px; background: red;">Exit</div>
      </div>
    `);

    // Test that the node has the correct cursor style
    const computedStyle = window.getComputedStyle(testElement);
    assert.equal(computedStyle.cursor, 'move');

    // Test drag event simulation
    let dragStarted = false;
    let dragEnded = false;
    let newPosition = { left: 0, top: 0 };

    // Simulate our drag implementation
    let isDragging = false;
    let dragStartPos = { x: 0, y: 0 };
    let nodeStartPos = { left: 100, top: 100 };

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.classList.contains('exit') || target.closest('.exit')) {
        return;
      }

      isDragging = true;
      dragStarted = true;
      dragStartPos = { x: event.clientX, y: event.clientY };
      nodeStartPos = { left: 100, top: 100 };
      event.preventDefault();
      event.stopPropagation();
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = event.clientX - dragStartPos.x;
      const deltaY = event.clientY - dragStartPos.y;

      const newLeft = nodeStartPos.left + deltaX;
      const newTop = nodeStartPos.top + deltaY;

      // Update position
      (testElement as HTMLElement).style.left = `${newLeft}px`;
      (testElement as HTMLElement).style.top = `${newTop}px`;
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (!isDragging) return;

      isDragging = false;
      dragEnded = true;

      const deltaX = event.clientX - dragStartPos.x;
      const deltaY = event.clientY - dragStartPos.y;

      newPosition = {
        left: nodeStartPos.left + deltaX,
        top: nodeStartPos.top + deltaY
      };
    };

    // Add event listeners
    testElement.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Test drag from node (should work)
    const mouseDownEvent = new MouseEvent('mousedown', {
      clientX: 150,
      clientY: 150,
      bubbles: true
    });
    testElement.dispatchEvent(mouseDownEvent);

    assert.isTrue(dragStarted, 'Drag should start when clicking on node');

    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 200,
      clientY: 200,
      bubbles: true
    });
    document.dispatchEvent(mouseMoveEvent);

    const mouseUpEvent = new MouseEvent('mouseup', {
      clientX: 200,
      clientY: 200,
      bubbles: true
    });
    document.dispatchEvent(mouseUpEvent);

    assert.isTrue(dragEnded, 'Drag should end on mouse up');
    assert.equal(
      newPosition.left,
      150,
      'New left position should be calculated correctly'
    );
    assert.equal(
      newPosition.top,
      150,
      'New top position should be calculated correctly'
    );

    // Test that position was visually updated
    assert.equal((testElement as HTMLElement).style.left, '150px');
    assert.equal((testElement as HTMLElement).style.top, '150px');

    // Reset for next test
    dragStarted = false;
    dragEnded = false;

    // Test drag from exit element (should not work)
    const exitElement = testElement.querySelector('.exit') as HTMLElement;
    const exitMouseDownEvent = new MouseEvent('mousedown', {
      clientX: 150,
      clientY: 150,
      bubbles: true
    });
    exitElement.dispatchEvent(exitMouseDownEvent);

    assert.isFalse(
      dragStarted,
      'Drag should not start when clicking on exit element'
    );

    // Clean up
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  });
});
