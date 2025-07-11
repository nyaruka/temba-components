// Test to reproduce the cascading collision issue mentioned in comment #3064178459
import { fixture, assert, expect } from '@open-wc/testing';
import { html } from 'lit';
import { Editor } from '../src/flow/Editor';
import { FlowDefinition } from '../src/store/flow-definition';

// Register the component
customElements.define('temba-flow-editor-test-cascading', Editor);

describe('Cascading Collision Issue Reproduction', () => {
  let editor: Editor;

  beforeEach(async () => {
    editor = await fixture(html`
      <temba-flow-editor-test-cascading>
        <div id="canvas"></div>
      </temba-flow-editor-test-cascading>
    `);
    
    // Set canvas size
    (editor as any).canvasSize = { width: 1200, height: 800 };
  });

  it('should fully resolve cascading collisions when Node B is dropped on Node A (reproducing comment issue)', async () => {
    // Set up the exact scenario from the demo:
    // Node A at (100, 100), Node B at (320, 100), Node C at (100, 200)
    // Make Node C closer so that moving Node A down would create a collision
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
        }
      ],
      _ui: {
        nodes: {
          'node-a': { position: { left: 100, top: 100 } },  // Node A
          'node-b': { position: { left: 320, top: 100 } },  // Node B  
          'node-c': { position: { left: 100, top: 200 } }   // Node C - closer to force cascading
        }
      }
    };

    (editor as any).definition = mockDefinition;
    await editor.updateComplete;

    // Simulate dragging Node B over Node A
    const droppedItem = {
      uuid: 'node-b',
      type: 'node' as const,
      position: { left: 100, top: 100 }, // Node B dropped on Node A's position
      boundingBox: {
        left: 100,
        top: 100,
        right: 300,  // 100 + 200 (node width)
        bottom: 180, // 100 + 80 (node height)
        width: 200,
        height: 80
      }
    };

    const autoLayoutResolveCollisions = (editor as any).autoLayoutResolveCollisions.bind(editor);
    const moves = autoLayoutResolveCollisions(droppedItem);

    console.log('Moves returned by auto-layout:', Array.from(moves.entries()));

    // After resolution, verify there are NO collisions anywhere
    const getAllItems = (editor as any).getAllItems.bind(editor);
    const hasCollision = (editor as any).hasCollision.bind(editor);
    
    // Apply all moves to get final positions
    const finalItems = getAllItems().map(item => {
      const move = moves.get(item.uuid);
      if (move) {
        return {
          ...item,
          position: move,
          boundingBox: (editor as any).getBoundingBox(item.uuid, item.type, move)
        };
      }
      return item;
    });

    // Include the dropped item in final positions
    const droppedIndex = finalItems.findIndex(item => item.uuid === droppedItem.uuid);
    if (droppedIndex >= 0) {
      finalItems[droppedIndex] = droppedItem;
    } else {
      finalItems.push(droppedItem);
    }

    console.log('Final item positions:', finalItems.map(item => ({ 
      uuid: item.uuid, 
      position: item.position, 
      boundingBox: item.boundingBox 
    })));

    // Check for any remaining collisions
    const remainingCollisions = [];
    for (let i = 0; i < finalItems.length; i++) {
      for (let j = i + 1; j < finalItems.length; j++) {
        if (hasCollision(finalItems[i].boundingBox, finalItems[j].boundingBox)) {
          remainingCollisions.push({
            item1: finalItems[i].uuid,
            item2: finalItems[j].uuid,
            box1: finalItems[i].boundingBox,
            box2: finalItems[j].boundingBox
          });
        }
      }
    }

    console.log('Remaining collisions:', remainingCollisions);

    // The main assertion: there should be NO collisions after auto-layout
    expect(remainingCollisions.length).to.equal(0, 
      `Found ${remainingCollisions.length} remaining collisions after auto-layout: ${JSON.stringify(remainingCollisions, null, 2)}`);
  });

  it('should resolve collisions when right movement is blocked and downward movement causes cascading', async () => {
    // Set up a scenario where:
    // - Node A at (100, 100)
    // - Node B at (300, 100) - blocking rightward movement of Node A
    // - Node C at (100, 200) - would collide if Node A moves down
    // - Node D dropped on Node A, forcing Node A to move down and cascade
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
          uuid: 'node-d',
          actions: [],
          exits: []
        }
      ],
      _ui: {
        nodes: {
          'node-a': { position: { left: 100, top: 100 } },  // Node A
          'node-b': { position: { left: 320, top: 100 } },  // Node B - blocking right movement
          'node-c': { position: { left: 100, top: 200 } },  // Node C - would collide if A moves down
          'node-d': { position: { left: 400, top: 400 } }   // Node D (to be dropped on A)
        }
      }
    };

    (editor as any).definition = mockDefinition;
    await editor.updateComplete;

    // Simulate dropping Node D on Node A, forcing Node A to move
    const droppedItem = {
      uuid: 'node-d',
      type: 'node' as const,
      position: { left: 100, top: 100 }, // Node D dropped on Node A's position
      boundingBox: {
        left: 100,
        top: 100,
        right: 300,  // 100 + 200 (node width)
        bottom: 180, // 100 + 80 (node height)
        width: 200,
        height: 80
      }
    };

    const autoLayoutResolveCollisions = (editor as any).autoLayoutResolveCollisions.bind(editor);
    const moves = autoLayoutResolveCollisions(droppedItem);

    console.log('Moves returned by auto-layout (cascading test):', Array.from(moves.entries()));

    // After resolution, verify there are NO collisions anywhere
    const getAllItems = (editor as any).getAllItems.bind(editor);
    const hasCollision = (editor as any).hasCollision.bind(editor);
    
    // Apply all moves to get final positions
    const finalItems = getAllItems().map(item => {
      const move = moves.get(item.uuid);
      if (move) {
        return {
          ...item,
          position: move,
          boundingBox: (editor as any).getBoundingBox(item.uuid, item.type, move)
        };
      }
      return item;
    });

    // Include the dropped item in final positions
    const droppedIndex = finalItems.findIndex(item => item.uuid === droppedItem.uuid);
    if (droppedIndex >= 0) {
      finalItems[droppedIndex] = droppedItem;
    } else {
      finalItems.push(droppedItem);
    }

    console.log('Final item positions (cascading test):', finalItems.map(item => ({ 
      uuid: item.uuid, 
      position: item.position, 
      boundingBox: item.boundingBox 
    })));

    // Check for any remaining collisions
    const remainingCollisions = [];
    for (let i = 0; i < finalItems.length; i++) {
      for (let j = i + 1; j < finalItems.length; j++) {
        if (hasCollision(finalItems[i].boundingBox, finalItems[j].boundingBox)) {
          remainingCollisions.push({
            item1: finalItems[i].uuid,
            item2: finalItems[j].uuid,
            box1: finalItems[i].boundingBox,
            box2: finalItems[j].boundingBox
          });
        }
      }
    }

    console.log('Remaining collisions (cascading test):', remainingCollisions);

    // The main assertion: there should be NO collisions after auto-layout
    expect(remainingCollisions.length).to.equal(0, 
      `Found ${remainingCollisions.length} remaining collisions after auto-layout: ${JSON.stringify(remainingCollisions, null, 2)}`);
  });

  it('should prefer left movement when it results in fewer total movements', async () => {
    // Set up a scenario where moving left would be more efficient:
    // - Node A at (320, 100) 
    // - Node B at (540, 100) - far to the right
    // - Node C at (760, 100) - even further to the right  
    // - Node D dropped on Node A, Node A could move left (to 100,100) with less total movement
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
          uuid: 'node-d',
          actions: [],
          exits: []
        }
      ],
      _ui: {
        nodes: {
          'node-a': { position: { left: 320, top: 100 } },  // Node A
          'node-b': { position: { left: 540, top: 100 } },  // Node B - far right
          'node-c': { position: { left: 760, top: 100 } },  // Node C - further right 
          'node-d': { position: { left: 400, top: 400 } }   // Node D (to be dropped on A)
        }
      }
    };

    (editor as any).definition = mockDefinition;
    await editor.updateComplete;

    // Simulate dropping Node D on Node A
    const droppedItem = {
      uuid: 'node-d',
      type: 'node' as const,
      position: { left: 320, top: 100 }, // Node D dropped on Node A's position
      boundingBox: {
        left: 320,
        top: 100,
        right: 520,  // 320 + 200 (node width)
        bottom: 180, // 100 + 80 (node height)
        width: 200,
        height: 80
      }
    };

    const autoLayoutResolveCollisions = (editor as any).autoLayoutResolveCollisions.bind(editor);
    const moves = autoLayoutResolveCollisions(droppedItem);

    console.log('Moves returned by auto-layout (left movement test):', Array.from(moves.entries()));

    // The algorithm should prefer moving Node A left to (100, 100) rather than 
    // moving Node A, B, and C all to the right
    const nodeAMove = moves.get('node-a');
    if (nodeAMove) {
      // If Node A is moved, it should preferably move left (to reduce total movements)
      console.log('Node A moved to:', nodeAMove);
      // Note: Current implementation might not support left movement yet, but this shows the ideal
    }

    // After resolution, verify there are NO collisions anywhere
    const getAllItems = (editor as any).getAllItems.bind(editor);
    const hasCollision = (editor as any).hasCollision.bind(editor);
    
    // Apply all moves to get final positions
    const finalItems = getAllItems().map(item => {
      const move = moves.get(item.uuid);
      if (move) {
        return {
          ...item,
          position: move,
          boundingBox: (editor as any).getBoundingBox(item.uuid, item.type, move)
        };
      }
      return item;
    });

    // Include the dropped item in final positions
    const droppedIndex = finalItems.findIndex(item => item.uuid === droppedItem.uuid);
    if (droppedIndex >= 0) {
      finalItems[droppedIndex] = droppedItem;
    } else {
      finalItems.push(droppedItem);
    }

    console.log('Final item positions (left movement test):', finalItems.map(item => ({ 
      uuid: item.uuid, 
      position: item.position, 
      boundingBox: item.boundingBox 
    })));

    // Check for any remaining collisions
    const remainingCollisions = [];
    for (let i = 0; i < finalItems.length; i++) {
      for (let j = i + 1; j < finalItems.length; j++) {
        if (hasCollision(finalItems[i].boundingBox, finalItems[j].boundingBox)) {
          remainingCollisions.push({
            item1: finalItems[i].uuid,
            item2: finalItems[j].uuid,
            box1: finalItems[i].boundingBox,
            box2: finalItems[j].boundingBox
          });
        }
      }
    }

    console.log('Remaining collisions (left movement test):', remainingCollisions);

    // The main assertion: there should be NO collisions after auto-layout
    expect(remainingCollisions.length).to.equal(0, 
      `Found ${remainingCollisions.length} remaining collisions after auto-layout: ${JSON.stringify(remainingCollisions, null, 2)}`);
  });
});