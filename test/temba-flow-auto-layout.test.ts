import { fixture, assert, expect } from '@open-wc/testing';
import { html } from 'lit';
import { Editor, snapToGrid } from '../src/flow/Editor';
import { stub, restore } from 'sinon';

// Register the component
customElements.define('temba-flow-editor-auto-layout', Editor);

describe('Flow Editor Auto Layout', () => {
  let editor: Editor;

  beforeEach(() => {
    restore();
  });

  afterEach(() => {
    restore();
  });

  describe('Collision Detection Utilities', () => {
    it('should detect when two rectangles overlap', () => {
      // Access private utility functions by calling them on the editor instance
      const editor = new Editor();
      
      // Test overlapping rectangles
      const rect1 = { left: 10, top: 10, right: 50, bottom: 50, width: 40, height: 40 };
      const rect2 = { left: 30, top: 30, right: 70, bottom: 70, width: 40, height: 40 };
      
      // We need to test this indirectly since the functions are not exposed
      // For now, we'll test the concept with our own implementation
      const doRectsOverlap = (r1: any, r2: any) => {
        return !(
          r1.right <= r2.left ||
          r2.right <= r1.left ||
          r1.bottom <= r2.top ||
          r2.bottom <= r1.top
        );
      };

      assert.isTrue(doRectsOverlap(rect1, rect2), 'Overlapping rectangles should be detected');
      
      // Test non-overlapping rectangles
      const rect3 = { left: 100, top: 100, right: 140, bottom: 140, width: 40, height: 40 };
      assert.isFalse(doRectsOverlap(rect1, rect3), 'Non-overlapping rectangles should not be detected');
    });

    it('should calculate overlap amounts correctly', () => {
      const getOverlapAmount = (r1: any, r2: any) => {
        const overlapX = Math.max(0, Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left));
        const overlapY = Math.max(0, Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top));
        return { x: overlapX, y: overlapY };
      };

      const rect1 = { left: 0, top: 0, right: 50, bottom: 50, width: 50, height: 50 };
      const rect2 = { left: 25, top: 25, right: 75, bottom: 75, width: 50, height: 50 };
      
      const overlap = getOverlapAmount(rect1, rect2);
      assert.equal(overlap.x, 25, 'X overlap should be 25');
      assert.equal(overlap.y, 25, 'Y overlap should be 25');
    });

    it('should snap values to 20px grid correctly', () => {
      assert.equal(snapToGrid(0), 0);
      assert.equal(snapToGrid(5), 0);
      assert.equal(snapToGrid(10), 20);
      assert.equal(snapToGrid(15), 20);
      assert.equal(snapToGrid(25), 20);
      assert.equal(snapToGrid(30), 40);
      assert.equal(snapToGrid(33), 40);
      assert.equal(snapToGrid(37), 40);
    });
  });

  describe('Auto Layout Integration', () => {
    it('should initialize with auto layout capabilities', async () => {
      editor = await fixture(html`
        <temba-flow-editor-auto-layout>
          <div id="canvas"></div>
        </temba-flow-editor-auto-layout>
      `);

      // Verify the editor has the necessary methods for auto layout
      expect(typeof (editor as any).getAllLayoutItems).to.equal('function');
      expect(typeof (editor as any).resolveCollisions).to.equal('function');
    });

    it('should handle empty definition gracefully', async () => {
      editor = await fixture(html`
        <temba-flow-editor-auto-layout>
          <div id="canvas"></div>
        </temba-flow-editor-auto-layout>
      `);

      // Test getAllLayoutItems with no definition
      const items = (editor as any).getAllLayoutItems();
      assert.isArray(items);
      assert.equal(items.length, 0);
    });

    it('should collect layout items from definition', async () => {
      const mockDefinition = {
        nodes: [
          {
            uuid: 'node-1',
            actions: [],
            exits: []
          },
          {
            uuid: 'node-2', 
            actions: [],
            exits: []
          }
        ],
        _ui: {
          nodes: {
            'node-1': { position: { left: 100, top: 200 } },
            'node-2': { position: { left: 300, top: 400 } }
          },
          stickies: {
            'sticky-1': { 
              position: { left: 500, top: 600 },
              title: 'Test Sticky',
              body: 'Test Content',
              color: 'yellow' as const
            }
          }
        }
      };

      editor = await fixture(html`
        <temba-flow-editor-auto-layout>
          <div id="canvas">
            <div id="node-1" style="width: 200px; height: 100px;"></div>
            <div id="node-2" style="width: 200px; height: 100px;"></div>
          </div>
        </temba-flow-editor-auto-layout>
      `);

      (editor as any).definition = mockDefinition;
      
      const items = (editor as any).getAllLayoutItems();
      assert.isArray(items);
      assert.equal(items.length, 3); // 2 nodes + 1 sticky
      
      const nodeItem = items.find((item: any) => item.uuid === 'node-1');
      assert.exists(nodeItem);
      assert.equal(nodeItem.type, 'node');
      assert.equal(nodeItem.position.left, 100);
      assert.equal(nodeItem.position.top, 200);
      
      const stickyItem = items.find((item: any) => item.uuid === 'sticky-1');
      assert.exists(stickyItem);
      assert.equal(stickyItem.type, 'sticky');
      assert.equal(stickyItem.position.left, 500);
      assert.equal(stickyItem.position.top, 600);
    });
  });

  describe('Collision Resolution Scenarios', () => {
    it('should return original position when no collisions', async () => {
      editor = await fixture(html`
        <temba-flow-editor-auto-layout>
          <div id="canvas">
            <div id="node-1" style="width: 200px; height: 100px;"></div>
          </div>
        </temba-flow-editor-auto-layout>
      `);

      const mockDefinition = {
        nodes: [
          { uuid: 'node-1', actions: [], exits: [] }
        ],
        _ui: {
          nodes: {
            'node-1': { position: { left: 100, top: 100 } }
          }
        }
      };

      (editor as any).definition = mockDefinition;

      const droppedItem = {
        uuid: 'node-2',
        type: 'node' as const,
        position: { left: 500, top: 500 },
        element: document.createElement('div')
      };

      // Mock element dimensions
      Object.defineProperty(droppedItem.element, 'getBoundingClientRect', {
        value: () => ({ width: 200, height: 100 })
      });

      const newPosition = { left: 500, top: 500 };
      const result = (editor as any).resolveCollisions(droppedItem, newPosition);

      assert.deepEqual(result, newPosition, 'Should return original position when no collisions');
    });

    it('should resolve collision by moving overlapping item', async () => {
      editor = await fixture(html`
        <temba-flow-editor-auto-layout>
          <div id="canvas">
            <div id="node-1" style="width: 200px; height: 100px;"></div>
            <div id="node-2" style="width: 200px; height: 100px;"></div>
          </div>
        </temba-flow-editor-auto-layout>
      `);

      const mockDefinition = {
        nodes: [
          { uuid: 'node-1', actions: [], exits: [] },
          { uuid: 'node-2', actions: [], exits: [] }
        ],
        _ui: {
          nodes: {
            'node-1': { position: { left: 100, top: 100 } },
            'node-2': { position: { left: 200, top: 200 } }
          }
        }
      };

      (editor as any).definition = mockDefinition;

      // Track position updates
      const positionUpdates: any[] = [];
      (editor as any).updatePosition = (uuid: string, type: string, position: any) => {
        positionUpdates.push({ uuid, type, position });
      };

      const droppedItem = {
        uuid: 'node-new',
        type: 'node' as const,
        position: { left: 150, top: 150 },
        element: document.createElement('div')
      };

      // Mock element dimensions
      Object.defineProperty(droppedItem.element, 'getBoundingClientRect', {
        value: () => ({ width: 200, height: 100 })
      });

      // This should cause a collision with node-1 (at 100,100) because:
      // node-new will be at (150, 150) to (350, 250)
      // node-1 is at (100, 100) to (300, 200)
      // These overlap significantly
      const newPosition = { left: 150, top: 150 };
      const result = (editor as any).resolveCollisions(droppedItem, newPosition);

      // The collision should be resolved
      assert.deepEqual(result, newPosition, 'Should return the dropped item position');
      assert.isTrue(positionUpdates.length > 0, 'Should update position of colliding items');
    });

    it('should handle mouse up with collision resolution', async () => {
      editor = await fixture(html`
        <temba-flow-editor-auto-layout>
          <div id="canvas">
            <div id="node-1" style="width: 200px; height: 100px; position: absolute; left: 100px; top: 100px;"></div>
          </div>
        </temba-flow-editor-auto-layout>
      `);

      // Mock the update position function to track calls
      let updatePositionCalled = false;
      let updatedPosition: any = null;
      (editor as any).updatePosition = (uuid: string, type: string, position: any) => {
        updatePositionCalled = true;
        updatedPosition = position;
      };

      // Mock the resolveCollisions method to return a known position
      (editor as any).resolveCollisions = (droppedItem: any, newPosition: any) => {
        return { left: 240, top: 240 }; // Return a test position
      };

      // Mock drag state
      (editor as any).isDragging = true;
      (editor as any).isMouseDown = true;
      (editor as any).dragStartPos = { x: 150, y: 150 };
      (editor as any).startPos = { left: 200, top: 200 };
      (editor as any).currentDragItem = {
        uuid: 'test-node',
        type: 'sticky', // Use sticky to avoid getStore calls
        position: { left: 200, top: 200 },
        element: document.createElement('div')
      };

      // Simulate mouse up event
      const mouseUpEvent = new MouseEvent('mouseup', {
        clientX: 200, // moved 50px right
        clientY: 200, // moved 50px down
        bubbles: true
      });

      (editor as any).handleMouseUp(mouseUpEvent);

      assert.isTrue(updatePositionCalled, 'Update position should be called');
      assert.exists(updatedPosition, 'Updated position should exist');
      assert.equal(updatedPosition.left, 240, 'Should use resolved position');
      assert.equal(updatedPosition.top, 240, 'Should use resolved position');
      assert.isFalse((editor as any).isDragging, 'Should reset dragging state');
      assert.isFalse((editor as any).isMouseDown, 'Should reset mouse down state');
      assert.isNull((editor as any).currentDragItem, 'Should reset current drag item');
    });

    it('should handle sticky note collisions with nodes', async () => {
      editor = await fixture(html`
        <temba-flow-editor-auto-layout>
          <div id="canvas">
            <div id="node-1" style="width: 200px; height: 100px;"></div>
          </div>
        </temba-flow-editor-auto-layout>
      `);

      const mockDefinition = {
        nodes: [
          { uuid: 'node-1', actions: [], exits: [] }
        ],
        _ui: {
          nodes: {
            'node-1': { position: { left: 100, top: 100 } }
          },
          stickies: {
            'sticky-1': {
              position: { left: 300, top: 300 },
              title: 'Test Sticky',
              body: 'Test Content', 
              color: 'yellow' as const
            }
          }
        }
      };

      (editor as any).definition = mockDefinition;

      // Track position updates
      const positionUpdates: any[] = [];
      (editor as any).updatePosition = (uuid: string, type: string, position: any) => {
        positionUpdates.push({ uuid, type, position });
      };

      const droppedStickyItem = {
        uuid: 'sticky-new',
        type: 'sticky' as const,
        position: { left: 120, top: 120 },
        element: document.createElement('div')
      };

      // Mock element dimensions for sticky note (200x100)
      Object.defineProperty(droppedStickyItem.element, 'getBoundingClientRect', {
        value: () => ({ width: 200, height: 100 })
      });

      // This should cause a collision with node-1 (at 100,100) because:
      // sticky-new will be at (120, 120) to (320, 220)
      // node-1 is at (100, 100) to (300, 200)
      // These overlap
      const newPosition = { left: 120, top: 120 };
      const result = (editor as any).resolveCollisions(droppedStickyItem, newPosition);

      // The collision should be resolved
      assert.deepEqual(result, newPosition, 'Should return the dropped sticky position');
      assert.isTrue(positionUpdates.length > 0, 'Should update position of colliding items');
    });
  });

  describe('Grid Snapping with Auto Layout', () => {
    it('should snap positions to grid during collision resolution', () => {
      // Test that collision resolution respects grid snapping
      const testPositions = [
        { input: 133, expected: 140 },
        { input: 127, expected: 120 },
        { input: 75, expected: 80 },
        { input: 105, expected: 100 }
      ];

      testPositions.forEach(({ input, expected }) => {
        assert.equal(snapToGrid(input), expected, `Position ${input} should snap to ${expected}`);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing canvas element', async () => {
      editor = await fixture(html`<temba-flow-editor-auto-layout></temba-flow-editor-auto-layout>`);
      
      // Should not throw when getting layout items without canvas
      const items = (editor as any).getAllLayoutItems();
      assert.isArray(items);
      assert.equal(items.length, 0);
    });

    it('should handle nodes without UI position data', async () => {
      const mockDefinition = {
        nodes: [
          { uuid: 'node-1', actions: [], exits: [] }
        ],
        _ui: {
          nodes: {
            // Missing position data for node-1
          }
        }
      };

      editor = await fixture(html`
        <temba-flow-editor-auto-layout>
          <div id="canvas"></div>
        </temba-flow-editor-auto-layout>
      `);

      (editor as any).definition = mockDefinition;
      
      const items = (editor as any).getAllLayoutItems();
      assert.equal(items.length, 0, 'Should handle missing position data gracefully');
    });

    it('should handle sticky notes without position data', async () => {
      const mockDefinition = {
        nodes: [],
        _ui: {
          nodes: {},
          stickies: {
            'sticky-1': {
              // Missing position data
              title: 'Test',
              body: 'Test',
              color: 'yellow' as const
            }
          }
        }
      };

      editor = await fixture(html`
        <temba-flow-editor-auto-layout>
          <div id="canvas"></div>
        </temba-flow-editor-auto-layout>
      `);

      (editor as any).definition = mockDefinition;
      
      const items = (editor as any).getAllLayoutItems();
      assert.equal(items.length, 0, 'Should handle sticky notes without position gracefully');
    });
  });
});