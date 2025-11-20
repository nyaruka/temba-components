import { expect } from '@open-wc/testing';
import {
  getNodeBounds,
  nodesOverlap,
  detectCollisions,
  calculateReflowPositions,
  NodeBounds
} from '../src/flow/utils';

describe('Collision Detection Utilities', () => {
  describe('getNodeBounds', () => {
    it('returns null when element not found', () => {
      const position = { left: 100, top: 200 };
      const bounds = getNodeBounds('nonexistent-uuid', position);
      expect(bounds).to.be.null;
    });

    it('calculates bounds correctly from element', () => {
      // Create a mock element
      const mockElement = document.createElement('div');
      mockElement.id = 'test-node';
      mockElement.style.width = '200px';
      mockElement.style.height = '150px';
      document.body.appendChild(mockElement);

      const position = { left: 100, top: 200 };
      const bounds = getNodeBounds('test-node', position, mockElement);

      expect(bounds).to.not.be.null;
      expect(bounds!.uuid).to.equal('test-node');
      expect(bounds!.left).to.equal(100);
      expect(bounds!.top).to.equal(200);
      expect(bounds!.right).to.equal(300); // left + width
      expect(bounds!.bottom).to.equal(350); // top + height
      expect(bounds!.width).to.equal(200);
      expect(bounds!.height).to.equal(150);

      document.body.removeChild(mockElement);
    });
  });

  describe('nodesOverlap', () => {
    it('detects overlapping nodes horizontally and vertically', () => {
      const bounds1: NodeBounds = {
        uuid: 'node1',
        left: 100,
        top: 100,
        right: 200,
        bottom: 200,
        width: 100,
        height: 100
      };

      const bounds2: NodeBounds = {
        uuid: 'node2',
        left: 150,
        top: 150,
        right: 250,
        bottom: 250,
        width: 100,
        height: 100
      };

      expect(nodesOverlap(bounds1, bounds2)).to.be.true;
    });

    it('detects non-overlapping nodes to the right', () => {
      const bounds1: NodeBounds = {
        uuid: 'node1',
        left: 100,
        top: 100,
        right: 200,
        bottom: 200,
        width: 100,
        height: 100
      };

      const bounds2: NodeBounds = {
        uuid: 'node2',
        left: 300,
        top: 100,
        right: 400,
        bottom: 200,
        width: 100,
        height: 100
      };

      expect(nodesOverlap(bounds1, bounds2)).to.be.false;
    });

    it('detects non-overlapping nodes below', () => {
      const bounds1: NodeBounds = {
        uuid: 'node1',
        left: 100,
        top: 100,
        right: 200,
        bottom: 200,
        width: 100,
        height: 100
      };

      const bounds2: NodeBounds = {
        uuid: 'node2',
        left: 100,
        top: 300,
        right: 200,
        bottom: 400,
        width: 100,
        height: 100
      };

      expect(nodesOverlap(bounds1, bounds2)).to.be.false;
    });

    it('detects edge touching as non-overlapping', () => {
      const bounds1: NodeBounds = {
        uuid: 'node1',
        left: 100,
        top: 100,
        right: 200,
        bottom: 200,
        width: 100,
        height: 100
      };

      const bounds2: NodeBounds = {
        uuid: 'node2',
        left: 200,
        top: 100,
        right: 300,
        bottom: 200,
        width: 100,
        height: 100
      };

      // Edges touching should not be considered overlapping
      expect(nodesOverlap(bounds1, bounds2)).to.be.false;
    });

    it('detects partial vertical overlap', () => {
      const bounds1: NodeBounds = {
        uuid: 'node1',
        left: 100,
        top: 100,
        right: 200,
        bottom: 200,
        width: 100,
        height: 100
      };

      const bounds2: NodeBounds = {
        uuid: 'node2',
        left: 150,
        top: 50,
        right: 250,
        bottom: 150,
        width: 100,
        height: 100
      };

      expect(nodesOverlap(bounds1, bounds2)).to.be.true;
    });
  });

  describe('detectCollisions', () => {
    it('returns empty array when no collisions', () => {
      const targetBounds: NodeBounds = {
        uuid: 'target',
        left: 100,
        top: 100,
        right: 200,
        bottom: 200,
        width: 100,
        height: 100
      };

      const allBounds: NodeBounds[] = [
        {
          uuid: 'node1',
          left: 300,
          top: 100,
          right: 400,
          bottom: 200,
          width: 100,
          height: 100
        },
        {
          uuid: 'node2',
          left: 100,
          top: 300,
          right: 200,
          bottom: 400,
          width: 100,
          height: 100
        }
      ];

      const collisions = detectCollisions(targetBounds, allBounds);
      expect(collisions).to.have.length(0);
    });

    it('detects single collision', () => {
      const targetBounds: NodeBounds = {
        uuid: 'target',
        left: 100,
        top: 100,
        right: 200,
        bottom: 200,
        width: 100,
        height: 100
      };

      const allBounds: NodeBounds[] = [
        {
          uuid: 'node1',
          left: 150,
          top: 150,
          right: 250,
          bottom: 250,
          width: 100,
          height: 100
        },
        {
          uuid: 'node2',
          left: 300,
          top: 300,
          right: 400,
          bottom: 400,
          width: 100,
          height: 100
        }
      ];

      const collisions = detectCollisions(targetBounds, allBounds);
      expect(collisions).to.have.length(1);
      expect(collisions[0].uuid).to.equal('node1');
    });

    it('detects multiple collisions', () => {
      const targetBounds: NodeBounds = {
        uuid: 'target',
        left: 100,
        top: 100,
        right: 200,
        bottom: 200,
        width: 100,
        height: 100
      };

      const allBounds: NodeBounds[] = [
        {
          uuid: 'node1',
          left: 150,
          top: 150,
          right: 250,
          bottom: 250,
          width: 100,
          height: 100
        },
        {
          uuid: 'node2',
          left: 50,
          top: 50,
          right: 150,
          bottom: 150,
          width: 100,
          height: 100
        }
      ];

      const collisions = detectCollisions(targetBounds, allBounds);
      expect(collisions).to.have.length(2);
    });

    it('excludes target node from collisions', () => {
      const targetBounds: NodeBounds = {
        uuid: 'target',
        left: 100,
        top: 100,
        right: 200,
        bottom: 200,
        width: 100,
        height: 100
      };

      const allBounds: NodeBounds[] = [
        targetBounds,
        {
          uuid: 'node1',
          left: 150,
          top: 150,
          right: 250,
          bottom: 250,
          width: 100,
          height: 100
        }
      ];

      const collisions = detectCollisions(targetBounds, allBounds);
      expect(collisions).to.have.length(1);
      expect(collisions[0].uuid).to.equal('node1');
    });
  });

  describe('calculateReflowPositions', () => {
    it('returns empty map when no collisions', () => {
      const movedBounds: NodeBounds = {
        uuid: 'moved',
        left: 100,
        top: 100,
        right: 200,
        bottom: 200,
        width: 100,
        height: 100
      };

      const allBounds: NodeBounds[] = [
        movedBounds,
        {
          uuid: 'node1',
          left: 300,
          top: 100,
          right: 400,
          bottom: 200,
          width: 100,
          height: 100
        }
      ];

      const positions = calculateReflowPositions(
        'moved',
        movedBounds,
        allBounds,
        false
      );
      expect(positions.size).to.equal(0);
    });

    it('moves colliding node down', () => {
      const movedBounds: NodeBounds = {
        uuid: 'moved',
        left: 100,
        top: 100,
        right: 200,
        bottom: 200,
        width: 100,
        height: 100
      };

      const allBounds: NodeBounds[] = [
        movedBounds,
        {
          uuid: 'node1',
          left: 150,
          top: 150,
          right: 250,
          bottom: 250,
          width: 100,
          height: 100
        }
      ];

      const positions = calculateReflowPositions(
        'moved',
        movedBounds,
        allBounds,
        false
      );

      expect(positions.size).to.equal(1);
      expect(positions.has('node1')).to.be.true;
      
      const newPos = positions.get('node1')!;
      expect(newPos.left).to.equal(150); // left unchanged
      expect(newPos.top).to.be.greaterThan(200); // moved below the moved node
    });

    it('handles droppedBelowMidpoint by moving dropped node down', () => {
      const movedBounds: NodeBounds = {
        uuid: 'moved',
        left: 100,
        top: 150,
        right: 200,
        bottom: 250,
        width: 100,
        height: 100
      };

      const allBounds: NodeBounds[] = [
        movedBounds,
        {
          uuid: 'existing',
          left: 100,
          top: 100,
          right: 200,
          bottom: 200,
          width: 100,
          height: 100
        }
      ];

      const positions = calculateReflowPositions(
        'moved',
        movedBounds,
        allBounds,
        true // droppedBelowMidpoint
      );

      expect(positions.size).to.equal(1);
      expect(positions.has('moved')).to.be.true;
      
      const newPos = positions.get('moved')!;
      expect(newPos.top).to.be.greaterThan(200); // moved below existing node
    });

    it('resolves cascading collisions', () => {
      const movedBounds: NodeBounds = {
        uuid: 'moved',
        left: 100,
        top: 100,
        right: 200,
        bottom: 200,
        width: 100,
        height: 100
      };

      const allBounds: NodeBounds[] = [
        movedBounds,
        {
          uuid: 'node1',
          left: 100,
          top: 150,
          right: 200,
          bottom: 250,
          width: 100,
          height: 100
        },
        {
          uuid: 'node2',
          left: 100,
          top: 200,
          right: 200,
          bottom: 300,
          width: 100,
          height: 100
        }
      ];

      const positions = calculateReflowPositions(
        'moved',
        movedBounds,
        allBounds,
        false
      );

      // Both nodes should be repositioned to avoid collision
      expect(positions.size).to.be.greaterThan(0);
      
      // Check that moved nodes maintain vertical order and spacing
      if (positions.has('node1') && positions.has('node2')) {
        const node1Pos = positions.get('node1')!;
        const node2Pos = positions.get('node2')!;
        
        // node2 should be below node1
        expect(node2Pos.top).to.be.greaterThan(node1Pos.top);
      }
    });

    it('maintains horizontal position while moving vertically', () => {
      const movedBounds: NodeBounds = {
        uuid: 'moved',
        left: 100,
        top: 100,
        right: 200,
        bottom: 200,
        width: 100,
        height: 100
      };

      const allBounds: NodeBounds[] = [
        movedBounds,
        {
          uuid: 'node1',
          left: 150,
          top: 150,
          right: 250,
          bottom: 250,
          width: 100,
          height: 100
        }
      ];

      const positions = calculateReflowPositions(
        'moved',
        movedBounds,
        allBounds,
        false
      );

      const newPos = positions.get('node1')!;
      // Horizontal position should remain unchanged
      expect(newPos.left).to.equal(150);
    });

    it('adds minimum spacing between nodes', () => {
      const movedBounds: NodeBounds = {
        uuid: 'moved',
        left: 100,
        top: 100,
        right: 200,
        bottom: 200,
        width: 100,
        height: 100
      };

      const allBounds: NodeBounds[] = [
        movedBounds,
        {
          uuid: 'node1',
          left: 100,
          top: 150,
          right: 200,
          bottom: 250,
          width: 100,
          height: 100
        }
      ];

      const positions = calculateReflowPositions(
        'moved',
        movedBounds,
        allBounds,
        false
      );

      const newPos = positions.get('node1')!;
      // Should have at least 20px spacing (MIN_NODE_SPACING)
      expect(newPos.top).to.be.at.least(220); // 200 (bottom of moved) + 20
    });
  });

  describe('edge cases', () => {
    it('handles empty allBounds array', () => {
      const movedBounds: NodeBounds = {
        uuid: 'moved',
        left: 100,
        top: 100,
        right: 200,
        bottom: 200,
        width: 100,
        height: 100
      };

      const positions = calculateReflowPositions(
        'moved',
        movedBounds,
        [],
        false
      );

      expect(positions.size).to.equal(0);
    });

    it('handles single node (no other nodes to collide with)', () => {
      const movedBounds: NodeBounds = {
        uuid: 'moved',
        left: 100,
        top: 100,
        right: 200,
        bottom: 200,
        width: 100,
        height: 100
      };

      const positions = calculateReflowPositions(
        'moved',
        movedBounds,
        [movedBounds],
        false
      );

      expect(positions.size).to.equal(0);
    });

    it('prevents infinite loops with complex collisions', () => {
      const movedBounds: NodeBounds = {
        uuid: 'moved',
        left: 100,
        top: 100,
        right: 200,
        bottom: 200,
        width: 100,
        height: 100
      };

      // Create a complex scenario with many overlapping nodes
      const allBounds: NodeBounds[] = [movedBounds];
      
      for (let i = 0; i < 20; i++) {
        allBounds.push({
          uuid: `node${i}`,
          left: 100 + (i * 10),
          top: 100 + (i * 10),
          right: 200 + (i * 10),
          bottom: 200 + (i * 10),
          width: 100,
          height: 100
        });
      }

      // Should complete without hanging
      const positions = calculateReflowPositions(
        'moved',
        movedBounds,
        allBounds,
        false
      );

      // Should have resolved some collisions
      expect(positions.size).to.be.greaterThan(0);
    });
  });
});
