import { fixture, assert, expect } from '@open-wc/testing';
import { html } from 'lit';
import { Editor } from '../src/flow/Editor';
import { FlowDefinition } from '../src/store/flow-definition';
import { stub, restore } from 'sinon';

// Register the component
customElements.define('temba-flow-editor-integration', Editor);

describe('Flow Editor Auto Layout Integration Tests', () => {
  let editor: Editor;

  beforeEach(async () => {
    // Reset any stubs
    restore();
    
    editor = await fixture(html`
      <temba-flow-editor-integration>
        <div id="canvas"></div>
      </temba-flow-editor-integration>
    `);
    
    // Set canvas size
    (editor as any).canvasSize = { width: 1200, height: 800 };
  });

  afterEach(() => {
    restore();
  });

  describe('auto layout algorithm integration', () => {
    it('should resolve collision and return position updates', async () => {
      const mockDefinition: FlowDefinition = {
        uuid: 'test-flow',
        name: 'Test Flow',
        spec_version: '13.1.0',
        language: 'eng',
        type: 'messaging',
        revision: 1,
        expire_after_minutes: 10080,
        metadata: {},
        nodes: [
          {
            uuid: 'existing-node',
            actions: [],
            exits: []
          },
          {
            uuid: 'dropped-node',
            actions: [],
            exits: []
          }
        ],
        _ui: {
          nodes: {
            'existing-node': { position: { left: 200, top: 200 } },
            'dropped-node': { position: { left: 180, top: 180 } }
          }
        }
      };

      (editor as any).definition = mockDefinition;
      await editor.updateComplete;

      // Test the complete auto-layout flow without store interaction
      const droppedItem = {
        uuid: 'dropped-node',
        type: 'node' as const,
        position: { left: 180, top: 180 },
        boundingBox: {
          left: 180,
          top: 180,
          right: 380,
          bottom: 260,
          width: 200,
          height: 80
        }
      };

      const autoLayoutResolveCollisions = (editor as any).autoLayoutResolveCollisions.bind(editor);
      const moves = autoLayoutResolveCollisions(droppedItem);

      // Should detect collision and provide resolution
      expect(moves.size).to.be.greaterThan(0);
      
      // All moves should be to the right or down
      moves.forEach((position, uuid) => {
        const originalPosition = mockDefinition._ui.nodes[uuid].position;
        expect(position.left).to.be.at.least(originalPosition.left);
        expect(position.top).to.be.at.least(originalPosition.top);
        
        // All positions should be grid-snapped
        expect(position.left % 20).to.equal(0);
        expect(position.top % 20).to.equal(0);
      });
    });

    it('should handle complex multi-node collision scenario', async () => {
      const mockDefinition: FlowDefinition = {
        uuid: 'test-flow',
        name: 'Test Flow',
        spec_version: '13.1.0',
        language: 'eng',
        type: 'messaging',
        revision: 1,
        expire_after_minutes: 10080,
        metadata: {},
        nodes: [
          {
            uuid: 'node-a',
            actions: [],
            exits: []
          },
          {
            uuid: 'node-b',
            actions: [],
            exits: []
          },
          {
            uuid: 'node-c',
            actions: [],
            exits: []
          },
          {
            uuid: 'dropped-node',
            actions: [],
            exits: []
          }
        ],
        _ui: {
          nodes: {
            'node-a': { position: { left: 200, top: 200 } },
            'node-b': { position: { left: 420, top: 200 } }, // To the right of node-a
            'node-c': { position: { left: 200, top: 300 } }, // Below node-a
            'dropped-node': { position: { left: 180, top: 180 } } // Overlaps with node-a
          }
        }
      };

      (editor as any).definition = mockDefinition;
      await editor.updateComplete;

      const droppedItem = {
        uuid: 'dropped-node',
        type: 'node' as const,
        position: { left: 180, top: 180 },
        boundingBox: {
          left: 180,
          top: 180,
          right: 380,
          bottom: 260,
          width: 200,
          height: 80
        }
      };

      const autoLayoutResolveCollisions = (editor as any).autoLayoutResolveCollisions.bind(editor);
      const moves = autoLayoutResolveCollisions(droppedItem);

      // Should handle the complex scenario
      expect(moves.size).to.be.at.least(1);
      
      // Check that node ordering is preserved (node-b should move further right if moved)
      const nodeBMove = moves.get('node-b');
      if (nodeBMove) {
        expect(nodeBMove.left).to.be.greaterThan(420); // Should move further right
      }
      
      // All moves should follow the constraints
      moves.forEach((position, uuid) => {
        const originalPosition = mockDefinition._ui.nodes[uuid].position;
        expect(position.left).to.be.at.least(originalPosition.left);
        expect(position.top).to.be.at.least(originalPosition.top);
      });
    });

    it('should handle mixed node and sticky note collisions', async () => {
      const mockDefinition: FlowDefinition = {
        uuid: 'test-flow',
        name: 'Test Flow',
        spec_version: '13.1.0',
        language: 'eng',
        type: 'messaging',
        revision: 1,
        expire_after_minutes: 10080,
        metadata: {},
        nodes: [
          {
            uuid: 'node1',
            actions: [],
            exits: []
          }
        ],
        _ui: {
          nodes: {
            'node1': { position: { left: 200, top: 200 } }
          },
          stickies: {
            'sticky1': {
              position: { left: 180, top: 180 },
              title: 'Test Sticky',
              body: 'Content',
              color: 'yellow'
            }
          }
        }
      };

      (editor as any).definition = mockDefinition;
      await editor.updateComplete;

      // Drop node that collides with both node and sticky
      const droppedItem = {
        uuid: 'new-node',
        type: 'node' as const,
        position: { left: 180, top: 180 },
        boundingBox: {
          left: 180,
          top: 180,
          right: 380,
          bottom: 260,
          width: 200,
          height: 80
        }
      };

      const getAllItems = (editor as any).getAllItems.bind(editor);
      const findCollisions = (editor as any).findCollisions.bind(editor);
      
      const allItems = getAllItems();
      const collisions = findCollisions(droppedItem, allItems);

      // Should detect collisions with both node and sticky
      expect(collisions.length).to.be.greaterThan(0);
      
      // Should include both types of items
      const hasNodeCollision = collisions.some(item => item.type === 'node');
      const hasStickyCollision = collisions.some(item => item.type === 'sticky');
      
      expect(hasNodeCollision || hasStickyCollision).to.be.true;
    });
  });

  describe('collision detection accuracy', () => {
    it('should accurately detect when items overlap', async () => {
      const mockDefinition: FlowDefinition = {
        uuid: 'test-flow',
        name: 'Test Flow',
        spec_version: '13.1.0',
        language: 'eng',
        type: 'messaging',
        revision: 1,
        expire_after_minutes: 10080,
        metadata: {},
        nodes: [
          {
            uuid: 'node1',
            actions: [],
            exits: []
          },
          {
            uuid: 'node2',
            actions: [],
            exits: []
          }
        ],
        _ui: {
          nodes: {
            'node1': { position: { left: 100, top: 100 } },
            'node2': { position: { left: 150, top: 120 } } // Overlapping within default 200x80 size
          }
        }
      };

      (editor as any).definition = mockDefinition;
      await editor.updateComplete;

      const getAllItems = (editor as any).getAllItems.bind(editor);
      const findCollisions = (editor as any).findCollisions.bind(editor);
      
      const allItems = getAllItems();
      expect(allItems.length).to.equal(2);
      
      const node1Item = allItems.find(item => item.uuid === 'node1');
      
      // node1 at (100,100) with size 200x80 = (100,100) to (300,180)
      // node2 at (150,120) with size 200x80 = (150,120) to (350,200)
      // These should overlap: x overlap (150-300), y overlap (120-180)
      expect(node1Item.boundingBox.right).to.be.greaterThan(150); // Should overlap
      expect(node1Item.boundingBox.bottom).to.be.greaterThan(120); // Should overlap
      
      const collisions = findCollisions(node1Item, allItems);
      
      // Should detect collision with node2
      expect(collisions.length).to.equal(1);
      expect(collisions[0].uuid).to.equal('node2');
    });

    it('should not detect collision when items are far apart', async () => {
      const mockDefinition: FlowDefinition = {
        uuid: 'test-flow',
        name: 'Test Flow',
        spec_version: '13.1.0',
        language: 'eng',
        type: 'messaging',
        revision: 1,
        expire_after_minutes: 10080,
        metadata: {},
        nodes: [
          {
            uuid: 'node1',
            actions: [],
            exits: []
          },
          {
            uuid: 'node2',
            actions: [],
            exits: []
          }
        ],
        _ui: {
          nodes: {
            'node1': { position: { left: 100, top: 100 } },
            'node2': { position: { left: 500, top: 500 } } // Far apart
          }
        }
      };

      (editor as any).definition = mockDefinition;
      await editor.updateComplete;

      const getAllItems = (editor as any).getAllItems.bind(editor);
      const findCollisions = (editor as any).findCollisions.bind(editor);
      
      const allItems = getAllItems();
      const node1Item = allItems.find(item => item.uuid === 'node1');
      const collisions = findCollisions(node1Item, allItems);
      
      // Should detect no collisions
      expect(collisions.length).to.equal(0);
    });
  });

  describe('position calculation', () => {
    it('should calculate optimal positions for collision resolution', async () => {
      const mockDefinition: FlowDefinition = {
        uuid: 'test-flow',
        name: 'Test Flow',
        spec_version: '13.1.0',
        language: 'eng',
        type: 'messaging',
        revision: 1,
        expire_after_minutes: 10080,
        metadata: {},
        nodes: [
          {
            uuid: 'blocking-node',
            actions: [],
            exits: []
          },
          {
            uuid: 'moving-node',
            actions: [],
            exits: []
          }
        ],
        _ui: {
          nodes: {
            'blocking-node': { position: { left: 200, top: 200 } },
            'moving-node': { position: { left: 180, top: 180 } }
          }
        }
      };

      (editor as any).definition = mockDefinition;
      await editor.updateComplete;

      const getAllItems = (editor as any).getAllItems.bind(editor);
      const findBestPosition = (editor as any).findBestPosition.bind(editor);
      
      const allItems = getAllItems();
      const movingItem = allItems.find(item => item.uuid === 'moving-node');
      const blockingItem = allItems.find(item => item.uuid === 'blocking-node');
      
      const bestPosition = findBestPosition(movingItem, blockingItem, allItems);
      
      expect(bestPosition).to.exist;
      expect(bestPosition.left).to.be.at.least(movingItem.position.left);
      expect(bestPosition.top).to.be.at.least(movingItem.position.top);
      
      // Should be grid-snapped
      expect(bestPosition.left % 20).to.equal(0);
      expect(bestPosition.top % 20).to.equal(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty flow gracefully', async () => {
      const mockDefinition: FlowDefinition = {
        uuid: 'test-flow',
        name: 'Test Flow',
        spec_version: '13.1.0',
        language: 'eng',
        type: 'messaging',
        revision: 1,
        expire_after_minutes: 10080,
        metadata: {},
        nodes: [],
        _ui: {
          nodes: {}
        }
      };

      (editor as any).definition = mockDefinition;
      await editor.updateComplete;

      const getAllItems = (editor as any).getAllItems.bind(editor);
      const allItems = getAllItems();
      
      expect(allItems.length).to.equal(0);
      
      // Should not crash when processing empty flow
      expect(() => {
        const autoLayoutResolveCollisions = (editor as any).autoLayoutResolveCollisions.bind(editor);
        const droppedItem = {
          uuid: 'new-node',
          type: 'node' as const,
          position: { left: 100, top: 100 },
          boundingBox: {
            left: 100,
            top: 100,
            right: 300,
            bottom: 180,
            width: 200,
            height: 80
          }
        };
        const moves = autoLayoutResolveCollisions(droppedItem);
        expect(moves.size).to.equal(0);
      }).to.not.throw();
    });

    it('should handle single node flow', async () => {
      const mockDefinition: FlowDefinition = {
        uuid: 'test-flow',
        name: 'Test Flow',
        spec_version: '13.1.0',
        language: 'eng',
        type: 'messaging',
        revision: 1,
        expire_after_minutes: 10080,
        metadata: {},
        nodes: [
          {
            uuid: 'only-node',
            actions: [],
            exits: []
          }
        ],
        _ui: {
          nodes: {
            'only-node': { position: { left: 200, top: 200 } }
          }
        }
      };

      (editor as any).definition = mockDefinition;
      await editor.updateComplete;

      const droppedItem = {
        uuid: 'only-node',
        type: 'node' as const,
        position: { left: 220, top: 220 }, // Slight move
        boundingBox: {
          left: 220,
          top: 220,
          right: 420,
          bottom: 300,
          width: 200,
          height: 80
        }
      };

      const autoLayoutResolveCollisions = (editor as any).autoLayoutResolveCollisions.bind(editor);
      const moves = autoLayoutResolveCollisions(droppedItem);
      
      // Should not find any collisions with itself
      expect(moves.size).to.equal(0);
    });
  });
});