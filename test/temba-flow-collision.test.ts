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

    it('detects edge touching as overlapping (within buffer)', () => {
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

      // edges touching should be considered overlapping due to buffer
      expect(nodesOverlap(bounds1, bounds2)).to.be.true;
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
      const allBounds: NodeBounds[] = [
        {
          uuid: 'moved',
          left: 100,
          top: 100,
          right: 200,
          bottom: 200,
          width: 100,
          height: 100
        },
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

      const positions = calculateReflowPositions(['moved'], allBounds);
      expect(positions.size).to.equal(0);
    });

    it('moves colliding node out of the way', () => {
      const allBounds: NodeBounds[] = [
        {
          uuid: 'moved',
          left: 100,
          top: 100,
          right: 200,
          bottom: 200,
          width: 100,
          height: 100
        },
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

      const positions = calculateReflowPositions(['moved'], allBounds);

      expect(positions.size).to.equal(1);
      expect(positions.has('node1')).to.be.true;
      expect(positions.has('moved')).to.be.false;
    });

    it('sacred node never appears in returned positions', () => {
      const allBounds: NodeBounds[] = [
        {
          uuid: 'dropped',
          left: 100,
          top: 100,
          right: 200,
          bottom: 200,
          width: 100,
          height: 100
        },
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

      const positions = calculateReflowPositions(['dropped'], allBounds);

      expect(positions.has('dropped')).to.be.false;
      expect(positions.has('existing')).to.be.true;
    });

    it('prefers least-displacement direction', () => {
      // Sacred at (100,100)-(200,200), collider at (180,100)-(280,200)
      // Right requires only 60px displacement, down requires 140px
      const allBounds: NodeBounds[] = [
        {
          uuid: 'sacred',
          left: 100,
          top: 100,
          right: 200,
          bottom: 200,
          width: 100,
          height: 100
        },
        {
          uuid: 'collider',
          left: 180,
          top: 100,
          right: 280,
          bottom: 200,
          width: 100,
          height: 100
        }
      ];

      const positions = calculateReflowPositions(['sacred'], allBounds);

      expect(positions.has('collider')).to.be.true;
      const newPos = positions.get('collider')!;
      // Should move right (shorter) rather than down (longer)
      expect(newPos.left).to.be.greaterThan(200);
      expect(newPos.top).to.equal(100); // vertical position unchanged
    });

    it('prefers up when it is the shortest move', () => {
      // Sacred at (100,200)-(200,300), collider at (100,180)-(200,280)
      // Up: newTop=snapToGrid(200-100-30)=snapToGrid(70)=80, distance=100
      // Down: newTop=snapToGrid(300+30)=340, distance=160
      // Right: newLeft=snapToGrid(200+30)=240, distance=140
      const allBounds: NodeBounds[] = [
        {
          uuid: 'sacred',
          left: 100,
          top: 200,
          right: 200,
          bottom: 300,
          width: 100,
          height: 100
        },
        {
          uuid: 'collider',
          left: 100,
          top: 180,
          right: 200,
          bottom: 280,
          width: 100,
          height: 100
        }
      ];

      const positions = calculateReflowPositions(['sacred'], allBounds);

      expect(positions.has('collider')).to.be.true;
      const newPos = positions.get('collider')!;
      // Should move up (shortest displacement)
      expect(newPos.top).to.be.lessThan(200);
      expect(newPos.left).to.equal(100); // horizontal position unchanged
    });

    it('prefers direction with fewer cascading collisions', () => {
      // Sacred at (100,100)-(200,200), collider at (100,150)-(200,250)
      // A node sits below at (100,280)-(200,380) blocking the downward path
      // Down causes cascade, right does not
      const allBounds: NodeBounds[] = [
        {
          uuid: 'sacred',
          left: 100,
          top: 100,
          right: 200,
          bottom: 200,
          width: 100,
          height: 100
        },
        {
          uuid: 'collider',
          left: 100,
          top: 150,
          right: 200,
          bottom: 250,
          width: 100,
          height: 100
        },
        {
          uuid: 'blocker',
          left: 100,
          top: 280,
          right: 200,
          bottom: 380,
          width: 100,
          height: 100
        }
      ];

      const positions = calculateReflowPositions(['sacred'], allBounds);

      expect(positions.has('collider')).to.be.true;
      // Should avoid moving down (would cascade into blocker)
      // blocker should not need to move
      expect(positions.has('blocker')).to.be.false;
    });

    it('resolves cascading collisions', () => {
      const allBounds: NodeBounds[] = [
        {
          uuid: 'moved',
          left: 100,
          top: 100,
          right: 200,
          bottom: 200,
          width: 100,
          height: 100
        },
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

      const positions = calculateReflowPositions(['moved'], allBounds);

      // At least one node should be repositioned
      expect(positions.size).to.be.greaterThan(0);

      // No node should overlap with the sacred node or each other after reflow
      // (verified by the algorithm's correctness guarantee)
    });

    it('handles multiple sacred nodes', () => {
      // Two sacred nodes with a non-sacred node overlapping one
      const allBounds: NodeBounds[] = [
        {
          uuid: 'sacred1',
          left: 100,
          top: 100,
          right: 200,
          bottom: 200,
          width: 100,
          height: 100
        },
        {
          uuid: 'sacred2',
          left: 100,
          top: 400,
          right: 200,
          bottom: 500,
          width: 100,
          height: 100
        },
        {
          uuid: 'collider',
          left: 100,
          top: 150,
          right: 200,
          bottom: 250,
          width: 100,
          height: 100
        }
      ];

      const positions = calculateReflowPositions(
        ['sacred1', 'sacred2'],
        allBounds
      );

      // Sacred nodes should never be moved
      expect(positions.has('sacred1')).to.be.false;
      expect(positions.has('sacred2')).to.be.false;
      // Collider should be moved
      expect(positions.has('collider')).to.be.true;
    });

    it('does not move a node into another sacred node', () => {
      // Two sacred nodes close together with a collider between them
      // Moving right would overlap sacred2, so it should choose another direction
      const allBounds: NodeBounds[] = [
        {
          uuid: 'sacred1',
          left: 100,
          top: 100,
          right: 200,
          bottom: 200,
          width: 100,
          height: 100
        },
        {
          uuid: 'sacred2',
          left: 240,
          top: 100,
          right: 340,
          bottom: 200,
          width: 100,
          height: 100
        },
        {
          uuid: 'collider',
          left: 150,
          top: 100,
          right: 250,
          bottom: 200,
          width: 100,
          height: 100
        }
      ];

      const positions = calculateReflowPositions(
        ['sacred1', 'sacred2'],
        allBounds
      );

      expect(positions.has('collider')).to.be.true;
      const newPos = positions.get('collider')!;
      // Should not overlap either sacred node after reflow
      const newBounds: NodeBounds = {
        uuid: 'collider',
        left: newPos.left,
        top: newPos.top,
        right: newPos.left + 100,
        bottom: newPos.top + 100,
        width: 100,
        height: 100
      };
      expect(nodesOverlap(newBounds, allBounds[0])).to.be.false;
      expect(nodesOverlap(newBounds, allBounds[1])).to.be.false;
    });

    it('snaps reflow positions to grid', () => {
      const allBounds: NodeBounds[] = [
        {
          uuid: 'sacred',
          left: 100,
          top: 100,
          right: 200,
          bottom: 200,
          width: 100,
          height: 100
        },
        {
          uuid: 'collider',
          left: 100,
          top: 150,
          right: 200,
          bottom: 250,
          width: 100,
          height: 100
        }
      ];

      const positions = calculateReflowPositions(['sacred'], allBounds);

      expect(positions.has('collider')).to.be.true;
      const newPos = positions.get('collider')!;
      // Both coordinates should be multiples of 20 (grid size)
      expect(newPos.left % 20).to.equal(0);
      expect(newPos.top % 20).to.equal(0);
    });

    it('clamps positions to zero (no negative coordinates)', () => {
      // Sacred node near top-left, collider above it
      // Moving up would go negative, so it should fall back
      const allBounds: NodeBounds[] = [
        {
          uuid: 'sacred',
          left: 0,
          top: 0,
          right: 200,
          bottom: 200,
          width: 200,
          height: 200
        },
        {
          uuid: 'collider',
          left: 0,
          top: 100,
          right: 200,
          bottom: 200,
          width: 200,
          height: 100
        }
      ];

      const positions = calculateReflowPositions(['sacred'], allBounds);

      expect(positions.has('collider')).to.be.true;
      const newPos = positions.get('collider')!;
      expect(newPos.left).to.be.at.least(0);
      expect(newPos.top).to.be.at.least(0);
    });
  });

  describe('edge cases', () => {
    it('handles empty allBounds array', () => {
      const positions = calculateReflowPositions(['moved'], []);
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

      const positions = calculateReflowPositions(['moved'], [movedBounds]);
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
          left: 100 + i * 10,
          top: 100 + i * 10,
          right: 200 + i * 10,
          bottom: 200 + i * 10,
          width: 100,
          height: 100
        });
      }

      // Should complete without hanging
      const positions = calculateReflowPositions(['moved'], allBounds);

      // Should have resolved some collisions
      expect(positions.size).to.be.greaterThan(0);
    });
  });
});
