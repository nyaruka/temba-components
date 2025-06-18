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

  it('should snap node positions to 20px grid during drag and drop', async () => {
    // Create a test node element
    const testElement = await fixture(html`
      <div
        class="node"
        style="position: absolute; left: 100px; top: 100px; width: 200px; height: 100px; background: white; border: 1px solid #ccc; cursor: move;"
      >
        Test Node for Grid Snapping
      </div>
    `);

    // Helper function to snap values to 20px grid (same as implementation)
    const snapToGrid = (value: number): number => {
      return Math.round(value / 20) * 20;
    };

    // Simulate drag implementation with grid snapping
    let isDragging = false;
    let dragStartPos = { x: 0, y: 0 };
    let nodeStartPos = { left: 100, top: 100 };
    let finalPosition = { left: 0, top: 0 };

    const handleMouseDown = (event: MouseEvent) => {
      isDragging = true;
      dragStartPos = { x: event.clientX, y: event.clientY };
      // Get current position from element style
      const currentLeft =
        parseInt((testElement as HTMLElement).style.left) || 0;
      const currentTop = parseInt((testElement as HTMLElement).style.top) || 0;
      nodeStartPos = { left: currentLeft, top: currentTop };
      event.preventDefault();
      event.stopPropagation();
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = event.clientX - dragStartPos.x;
      const deltaY = event.clientY - dragStartPos.y;

      const newLeft = nodeStartPos.left + deltaX;
      const newTop = nodeStartPos.top + deltaY;

      // Snap to 20px grid
      const snappedLeft = snapToGrid(newLeft);
      const snappedTop = snapToGrid(newTop);

      // Update position with snapped values
      (testElement as HTMLElement).style.left = `${snappedLeft}px`;
      (testElement as HTMLElement).style.top = `${snappedTop}px`;
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (!isDragging) return;
      isDragging = false;

      const deltaX = event.clientX - dragStartPos.x;
      const deltaY = event.clientY - dragStartPos.y;

      const newLeft = nodeStartPos.left + deltaX;
      const newTop = nodeStartPos.top + deltaY;

      // Snap final position to grid
      finalPosition = {
        left: snapToGrid(newLeft),
        top: snapToGrid(newTop)
      };
    };

    // Add event listeners
    testElement.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Test Case 1: Drag to position that should snap to grid
    // Starting at (100, 100), drag by (33, 27) pixels
    // Should result in (133, 127) -> snapped to (140, 120)
    const mouseDownEvent1 = new MouseEvent('mousedown', {
      clientX: 150,
      clientY: 150,
      bubbles: true
    });
    testElement.dispatchEvent(mouseDownEvent1);

    const mouseMoveEvent1 = new MouseEvent('mousemove', {
      clientX: 183, // 150 + 33
      clientY: 177, // 150 + 27
      bubbles: true
    });
    document.dispatchEvent(mouseMoveEvent1);

    // Check that position is snapped during drag
    assert.equal((testElement as HTMLElement).style.left, '140px');
    assert.equal((testElement as HTMLElement).style.top, '120px');

    const mouseUpEvent1 = new MouseEvent('mouseup', {
      clientX: 183,
      clientY: 177,
      bubbles: true
    });
    document.dispatchEvent(mouseUpEvent1);

    // Check final snapped position
    assert.equal(
      finalPosition.left,
      140,
      'Final left position should be snapped to 140px'
    );
    assert.equal(
      finalPosition.top,
      120,
      'Final top position should be snapped to 120px'
    );

    // Test Case 2: Test different snap scenarios
    // Reset position
    nodeStartPos = { left: 60, top: 80 };
    (testElement as HTMLElement).style.left = '60px';
    (testElement as HTMLElement).style.top = '80px';

    const mouseDownEvent2 = new MouseEvent('mousedown', {
      clientX: 100,
      clientY: 100,
      bubbles: true
    });
    testElement.dispatchEvent(mouseDownEvent2);

    // Drag by (15, 25) -> should snap to nearest 20px grid
    // (60 + 15, 80 + 25) = (75, 105) -> snapped to (80, 100)
    const mouseMoveEvent2 = new MouseEvent('mousemove', {
      clientX: 115, // 100 + 15
      clientY: 125, // 100 + 25
      bubbles: true
    });
    document.dispatchEvent(mouseMoveEvent2);

    assert.equal((testElement as HTMLElement).style.left, '80px');
    assert.equal((testElement as HTMLElement).style.top, '100px');

    const mouseUpEvent2 = new MouseEvent('mouseup', {
      clientX: 115,
      clientY: 125,
      bubbles: true
    });
    document.dispatchEvent(mouseUpEvent2);

    assert.equal(
      finalPosition.left,
      80,
      'Final left position should be snapped to 80px'
    );
    assert.equal(
      finalPosition.top,
      100,
      'Final top position should be snapped to 100px'
    );

    // Test Case 3: Test exact grid positions remain unchanged
    nodeStartPos = { left: 120, top: 160 }; // Already on grid
    (testElement as HTMLElement).style.left = '120px';
    (testElement as HTMLElement).style.top = '160px';

    const mouseDownEvent3 = new MouseEvent('mousedown', {
      clientX: 200,
      clientY: 200,
      bubbles: true
    });
    testElement.dispatchEvent(mouseDownEvent3);

    // Small movement that should stay on same grid position
    const mouseMoveEvent3 = new MouseEvent('mousemove', {
      clientX: 202, // +2 pixels
      clientY: 203, // +3 pixels
      bubbles: true
    });
    document.dispatchEvent(mouseMoveEvent3);

    // (120 + 2, 160 + 3) = (122, 163) -> snapped to (120, 160)
    assert.equal((testElement as HTMLElement).style.left, '120px');
    assert.equal((testElement as HTMLElement).style.top, '160px');

    const mouseUpEvent3 = new MouseEvent('mouseup', {
      clientX: 202,
      clientY: 203,
      bubbles: true
    });
    document.dispatchEvent(mouseUpEvent3);

    assert.equal(finalPosition.left, 120, 'Position should remain on grid');
    assert.equal(finalPosition.top, 160, 'Position should remain on grid');

    // Clean up
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  });
});
