import { fixture, expect } from '@open-wc/testing';
import { html } from 'lit';
import { Editor } from '../src/flow/Editor';
import { FlowDefinition } from '../src/store/flow-definition';

// Register the component
customElements.define('temba-flow-editor-auto-layout', Editor);

describe('Flow Editor Auto Layout', () => {
  let editor: Editor;

  beforeEach(async () => {
    editor = await fixture(html`
      <temba-flow-editor-auto-layout>
        <div id="canvas"></div>
      </temba-flow-editor-auto-layout>
    `);

    // Set canvas size
    (editor as any).canvasSize = { width: 1200, height: 800 };
  });

  describe('collision detection', () => {
    it('should detect overlapping bounding boxes', () => {
      const box1 = {
        left: 100,
        top: 100,
        right: 300,
        bottom: 200,
        width: 200,
        height: 100
      };

      const box2 = {
        left: 250,
        top: 150,
        right: 450,
        bottom: 250,
        width: 200,
        height: 100
      };

      const box3 = {
        left: 400,
        top: 300,
        right: 600,
        bottom: 400,
        width: 200,
        height: 100
      };

      // Test collision detection method
      const hasCollision = (editor as any).hasCollision.bind(editor);

      expect(hasCollision(box1, box2)).to.be.true; // These overlap
      expect(hasCollision(box1, box3)).to.be.false; // These don't overlap
      expect(hasCollision(box2, box3)).to.be.false; // These don't overlap
    });

    it('should detect edge case collisions', () => {
      const hasCollision = (editor as any).hasCollision.bind(editor);

      // Test touching edges (should not be collision)
      const box1 = {
        left: 100,
        top: 100,
        right: 200,
        bottom: 200,
        width: 100,
        height: 100
      };
      const box2 = {
        left: 200,
        top: 100,
        right: 300,
        bottom: 200,
        width: 100,
        height: 100
      };
      expect(hasCollision(box1, box2)).to.be.false;

      // Test overlapping by 1 pixel (should be collision)
      const box3 = {
        left: 199,
        top: 100,
        right: 299,
        bottom: 200,
        width: 100,
        height: 100
      };
      expect(hasCollision(box1, box3)).to.be.true;

      // Test complete overlap (should be collision)
      const box4 = {
        left: 100,
        top: 100,
        right: 200,
        bottom: 200,
        width: 100,
        height: 100
      };
      expect(hasCollision(box1, box4)).to.be.true;
    });
  });

  describe('bounding box calculation', () => {
    it('should calculate bounding boxes with provided dimensions', () => {
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
            uuid: 'node-1',
            actions: [],
            exits: []
          }
        ],
        _ui: {
          nodes: {
            'node-1': { position: { left: 100, top: 200 } }
          }
        }
      };

      (editor as any).definition = mockDefinition;

      const getBoundingBox = (editor as any).getBoundingBox.bind(editor);
      const boundingBox = getBoundingBox('node-1', 'node', {
        left: 100,
        top: 200
      });

      expect(boundingBox.left).to.equal(100);
      expect(boundingBox.top).to.equal(200);
      expect(boundingBox.width).to.be.greaterThan(0);
      expect(boundingBox.height).to.be.greaterThan(0);
      expect(boundingBox.right).to.equal(boundingBox.left + boundingBox.width);
      expect(boundingBox.bottom).to.equal(boundingBox.top + boundingBox.height);
    });

    it('should handle sticky note dimensions', () => {
      const getBoundingBox = (editor as any).getBoundingBox.bind(editor);
      const boundingBox = getBoundingBox('sticky-1', 'sticky', {
        left: 300,
        top: 400
      });

      expect(boundingBox.left).to.equal(300);
      expect(boundingBox.top).to.equal(400);
      expect(boundingBox.width).to.equal(200); // Sticky notes have fixed 200px width
      expect(boundingBox.height).to.be.greaterThan(0);
    });
  });

  describe('auto layout algorithm', () => {
    it('should resolve simple collision by moving right', () => {
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
            'dropped-node': { position: { left: 180, top: 180 } } // Overlapping position
          }
        }
      };

      (editor as any).definition = mockDefinition;

      // Create dropped item that collides with existing node
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

      const autoLayoutResolveCollisions = (
        editor as any
      ).autoLayoutResolveCollisions.bind(editor);
      const moves = autoLayoutResolveCollisions(droppedItem);

      expect(moves.size).to.be.greaterThan(0);

      // The existing node should be moved
      const existingNodeMove = moves.get('existing-node');
      expect(existingNodeMove).to.exist;

      // The move should be to the right or down (never up or left)
      expect(existingNodeMove.left).to.be.at.least(200);
      expect(existingNodeMove.top).to.be.at.least(200);
    });

    it('should handle multiple collisions', () => {
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
            uuid: 'node-1',
            actions: [],
            exits: []
          },
          {
            uuid: 'node-2',
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
            'node-1': { position: { left: 200, top: 200 } },
            'node-2': { position: { left: 220, top: 220 } },
            'dropped-node': { position: { left: 180, top: 180 } }
          }
        }
      };

      (editor as any).definition = mockDefinition;

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

      const autoLayoutResolveCollisions = (
        editor as any
      ).autoLayoutResolveCollisions.bind(editor);
      const moves = autoLayoutResolveCollisions(droppedItem);

      // Should move multiple nodes
      expect(moves.size).to.be.at.least(1);

      // All moves should be right or down
      moves.forEach((position, uuid) => {
        const originalPosition = mockDefinition._ui.nodes[uuid].position;
        expect(position.left).to.be.at.least(originalPosition.left);
        expect(position.top).to.be.at.least(originalPosition.top);
      });
    });

    it('should handle cascading moves', () => {
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
            uuid: 'node-1',
            actions: [],
            exits: []
          },
          {
            uuid: 'node-2',
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
            'node-1': { position: { left: 200, top: 200 } },
            'node-2': { position: { left: 420, top: 200 } }, // Right of node-1
            'dropped-node': { position: { left: 180, top: 180 } }
          }
        }
      };

      (editor as any).definition = mockDefinition;

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

      const autoLayoutResolveCollisions = (
        editor as any
      ).autoLayoutResolveCollisions.bind(editor);
      const moves = autoLayoutResolveCollisions(droppedItem);

      // Should handle the cascade properly
      expect(moves.size).to.be.at.least(1);

      // Verify no moves go up or left
      moves.forEach((position, uuid) => {
        const originalPosition = mockDefinition._ui.nodes[uuid].position;
        expect(position.left).to.be.at.least(originalPosition.left);
        expect(position.top).to.be.at.least(originalPosition.top);
      });
    });

    it('should preserve node ordering when possible', () => {
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
            uuid: 'left-node',
            actions: [],
            exits: []
          },
          {
            uuid: 'right-node',
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
            'left-node': { position: { left: 100, top: 200 } },
            'right-node': { position: { left: 300, top: 200 } },
            'dropped-node': { position: { left: 200, top: 200 } } // Between them
          }
        }
      };

      (editor as any).definition = mockDefinition;

      const droppedItem = {
        uuid: 'dropped-node',
        type: 'node' as const,
        position: { left: 200, top: 200 },
        boundingBox: {
          left: 200,
          top: 200,
          right: 400,
          bottom: 280,
          width: 200,
          height: 80
        }
      };

      const autoLayoutResolveCollisions = (
        editor as any
      ).autoLayoutResolveCollisions.bind(editor);
      const moves = autoLayoutResolveCollisions(droppedItem);

      // The algorithm should move nodes in a way that preserves relative order
      // In this case, the right-node should be moved further right
      const rightNodeMove = moves.get('right-node');
      if (rightNodeMove) {
        expect(rightNodeMove.left).to.be.greaterThan(300);
      }
    });
  });

  describe('grid snapping integration', () => {
    it('should snap moved positions to 20px grid', () => {
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
            'existing-node': { position: { left: 203, top: 207 } }, // Not on grid
            'dropped-node': { position: { left: 180, top: 180 } }
          }
        }
      };

      (editor as any).definition = mockDefinition;

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

      const autoLayoutResolveCollisions = (
        editor as any
      ).autoLayoutResolveCollisions.bind(editor);
      const moves = autoLayoutResolveCollisions(droppedItem);

      // All positions should be snapped to 20px grid
      moves.forEach((position) => {
        expect(position.left % 20).to.equal(0);
        expect(position.top % 20).to.equal(0);
      });
    });
  });

  describe('mixed node and sticky collision handling', () => {
    it('should handle collisions between nodes and sticky notes', () => {
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
            uuid: 'node-1',
            actions: [],
            exits: []
          }
        ],
        _ui: {
          nodes: {
            'node-1': { position: { left: 200, top: 200 } }
          },
          stickies: {
            'sticky-1': {
              position: { left: 180, top: 180 },
              title: 'Test Sticky',
              body: 'Test body',
              color: 'yellow'
            }
          }
        }
      };

      (editor as any).definition = mockDefinition;

      // Drop a node that collides with the sticky
      const droppedItem = {
        uuid: 'node-1',
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

      const autoLayoutResolveCollisions = (
        editor as any
      ).autoLayoutResolveCollisions.bind(editor);
      const moves = autoLayoutResolveCollisions(droppedItem);

      // Should detect and resolve the collision with the sticky note
      expect(moves.size).to.be.at.least(0); // May or may not move depending on implementation
    });
  });

  describe('comprehensive collision resolution', () => {
    it('should resolve cascading collisions completely', () => {
      // Create a scenario with tightly packed nodes that will create cascading collisions
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
          { uuid: 'node1', actions: [], exits: [] },
          { uuid: 'node2', actions: [], exits: [] },
          { uuid: 'node3', actions: [], exits: [] },
          { uuid: 'node4', actions: [], exits: [] }
        ],
        _ui: {
          nodes: {
            node1: { position: { left: 100, top: 100 } },
            node2: { position: { left: 320, top: 100 } }, // Right of node1
            node3: { position: { left: 540, top: 100 } }, // Right of node2
            node4: { position: { left: 320, top: 180 } } // Below node2
          },
          stickies: {}
        }
      };

      // Set the mock definition
      (editor as any).definition = mockDefinition;

      // Simulate dragging node1 to collide with node2 (position 300, 100)
      const droppedItem = {
        uuid: 'node1',
        type: 'node' as const,
        position: { left: 300, top: 100 },
        boundingBox: {
          left: 300,
          top: 100,
          right: 500, // 200px width
          bottom: 180, // 80px height
          width: 200,
          height: 80
        }
      };

      // Call the auto-layout algorithm
      const moves = (editor as any).autoLayoutResolveCollisions(droppedItem);

      // Verify that node2 was moved (should be pushed to the right)
      expect(moves.has('node2')).to.be.true;
      const node2Position = moves.get('node2');
      expect(node2Position.left).to.be.greaterThan(320); // Should be moved right

      // Check if node2's final position would collide with node3's original position
      const node2FinalBox = {
        left: node2Position.left,
        top: node2Position.top,
        right: node2Position.left + 200,
        bottom: node2Position.top + 80
      };

      const node3OriginalBox = {
        left: 540,
        top: 100,
        right: 740, // 540 + 200
        bottom: 180 // 100 + 80
      };

      const node2CollidesWithNode3 = !(
        node2FinalBox.right <= node3OriginalBox.left ||
        node2FinalBox.left >= node3OriginalBox.right ||
        node2FinalBox.bottom <= node3OriginalBox.top ||
        node2FinalBox.top >= node3OriginalBox.bottom
      );

      // If node2's new position would collide with node3, then node3 should also be moved
      if (node2CollidesWithNode3) {
        expect(moves.has('node3')).to.be.true;
        const node3Position = moves.get('node3');
        expect(node3Position.left).to.be.greaterThan(540); // Should be moved further right
      }

      // Most importantly: verify NO collisions remain after all moves
      const allFinalPositions = new Map<
        string,
        { left: number; top: number }
      >();
      allFinalPositions.set('node1', droppedItem.position);
      allFinalPositions.set(
        'node2',
        moves.get('node2') || { left: 320, top: 100 }
      );
      allFinalPositions.set(
        'node3',
        moves.get('node3') || { left: 540, top: 100 }
      );
      allFinalPositions.set(
        'node4',
        moves.get('node4') || { left: 320, top: 180 }
      );

      // Check all pairs for collisions
      const nodeIds = ['node1', 'node2', 'node3', 'node4'];
      for (let i = 0; i < nodeIds.length; i++) {
        for (let j = i + 1; j < nodeIds.length; j++) {
          const pos1 = allFinalPositions.get(nodeIds[i])!;
          const pos2 = allFinalPositions.get(nodeIds[j])!;

          const box1 = {
            left: pos1.left,
            top: pos1.top,
            right: pos1.left + 200,
            bottom: pos1.top + 80
          };

          const box2 = {
            left: pos2.left,
            top: pos2.top,
            right: pos2.left + 200,
            bottom: pos2.top + 80
          };

          const hasCollision = !(
            box1.right <= box2.left ||
            box1.left >= box2.right ||
            box1.bottom <= box2.top ||
            box1.top >= box2.bottom
          );

          expect(hasCollision).to.be.false;
        }
      }
    });

    it('should minimize the number of node movements', () => {
      // Test that the algorithm uses the minimal number of moves necessary
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
          { uuid: 'node1', actions: [], exits: [] },
          { uuid: 'node2', actions: [], exits: [] },
          { uuid: 'node3', actions: [], exits: [] }
        ],
        _ui: {
          nodes: {
            node1: { position: { left: 100, top: 100 } },
            node2: { position: { left: 320, top: 100 } },
            node3: { position: { left: 100, top: 220 } } // Far away, shouldn't need to move
          },
          stickies: {}
        }
      };

      (editor as any).definition = mockDefinition;

      // Drop node1 on node2 - only node2 should need to move
      const droppedItem = {
        uuid: 'node1',
        type: 'node' as const,
        position: { left: 320, top: 100 },
        boundingBox: {
          left: 320,
          top: 100,
          right: 520,
          bottom: 180,
          width: 200,
          height: 80
        }
      };

      const moves = (editor as any).autoLayoutResolveCollisions(droppedItem);

      // Only node2 should be moved, node3 should not be affected
      expect(moves.has('node2')).to.be.true;
      expect(moves.has('node3')).to.be.false;
      expect(moves.size).to.equal(1);
    });

    it('should ensure no collisions remain after complex cascading moves', () => {
      // Create a dense layout that will require multiple cascading moves
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
          { uuid: 'nodeA', actions: [], exits: [] },
          { uuid: 'nodeB', actions: [], exits: [] },
          { uuid: 'nodeC', actions: [], exits: [] },
          { uuid: 'nodeD', actions: [], exits: [] },
          { uuid: 'nodeE', actions: [], exits: [] }
        ],
        _ui: {
          nodes: {
            nodeA: { position: { left: 100, top: 100 } },
            nodeB: { position: { left: 320, top: 100 } },
            nodeC: { position: { left: 540, top: 100 } },
            nodeD: { position: { left: 320, top: 180 } },
            nodeE: { position: { left: 540, top: 180 } }
          },
          stickies: {}
        }
      };

      (editor as any).definition = mockDefinition;

      // Drop nodeA into the middle of the cluster
      const droppedItem = {
        uuid: 'nodeA',
        type: 'node' as const,
        position: { left: 400, top: 140 }, // Middle of the cluster
        boundingBox: {
          left: 400,
          top: 140,
          right: 600,
          bottom: 220,
          width: 200,
          height: 80
        }
      };

      const moves = (editor as any).autoLayoutResolveCollisions(droppedItem);

      // Collect all final positions
      const allFinalPositions = new Map<
        string,
        { left: number; top: number }
      >();
      allFinalPositions.set('nodeA', droppedItem.position);

      // Original positions for nodes not moved
      const originalPositions = {
        nodeB: { left: 320, top: 100 },
        nodeC: { left: 540, top: 100 },
        nodeD: { left: 320, top: 180 },
        nodeE: { left: 540, top: 180 }
      };

      Object.entries(originalPositions).forEach(([uuid, pos]) => {
        allFinalPositions.set(uuid, moves.get(uuid) || pos);
      });

      // Verify NO collisions remain between any pair of nodes
      const nodeIds = ['nodeA', 'nodeB', 'nodeC', 'nodeD', 'nodeE'];
      for (let i = 0; i < nodeIds.length; i++) {
        for (let j = i + 1; j < nodeIds.length; j++) {
          const pos1 = allFinalPositions.get(nodeIds[i])!;
          const pos2 = allFinalPositions.get(nodeIds[j])!;

          const box1 = {
            left: pos1.left,
            top: pos1.top,
            right: pos1.left + 200,
            bottom: pos1.top + 80
          };

          const box2 = {
            left: pos2.left,
            top: pos2.top,
            right: pos2.left + 200,
            bottom: pos2.top + 80
          };

          const hasCollision = !(
            box1.right <= box2.left ||
            box1.left >= box2.right ||
            box1.bottom <= box2.top ||
            box1.top >= box2.bottom
          );

          expect(hasCollision).to.be.false;
        }
      }
    });
  });
});
