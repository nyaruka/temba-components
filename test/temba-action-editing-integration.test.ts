import { expect, fixture, html } from '@open-wc/testing';
import { CanvasNode } from '../src/flow/CanvasNode';
import { SendMsg, Node } from '../src/store/flow-definition';
import { CustomEventType } from '../src/interfaces';
import '../temba-modules';

describe('Action Editing Integration', () => {
  it('should handle complete action editing workflow', async () => {
    // Create a test node with a send_msg action
    const testNode: Node = {
      uuid: 'test-node',
      actions: [
        {
          type: 'send_msg',
          uuid: 'test-action',
          text: 'Hello world',
          quick_replies: []
        } as SendMsg
      ],
      exits: []
    };

    // Create EditorNode
    const editorNode: CanvasNode = await fixture(html`
      <temba-flow-node
        .node=${testNode}
        .ui=${{ position: { left: 0, top: 0 } }}
      ></temba-flow-node>
    `);

    await editorNode.updateComplete;

    // Verify action is rendered
    const actionElement = editorNode.querySelector('.action');
    expect(actionElement).to.exist;

    // Set up event listener to catch ActionEditRequested event
    let editRequestedEvent: CustomEvent | null = null;
    editorNode.addEventListener(
      CustomEventType.ActionEditRequested,
      (event: CustomEvent) => {
        editRequestedEvent = event;
      }
    );

    // Simulate clicking on the action content (not the remove button)
    const actionContent = editorNode.querySelector(
      '.action-content'
    ) as HTMLElement;
    expect(actionContent).to.exist;

    // Simulate a click (mousedown followed by mouseup at same position)
    const mouseDownEvent = new MouseEvent('mousedown', {
      clientX: 100,
      clientY: 100,
      bubbles: true
    });
    const mouseUpEvent = new MouseEvent('mouseup', {
      clientX: 100,
      clientY: 100,
      bubbles: true
    });

    actionContent.dispatchEvent(mouseDownEvent);
    actionContent.dispatchEvent(mouseUpEvent);

    // Verify event was fired
    expect(editRequestedEvent).to.exist;
    expect(editRequestedEvent!.detail.action).to.deep.equal(
      testNode.actions[0]
    );
    expect(editRequestedEvent!.detail.nodeUuid).to.equal('test-node');
  });

  it('should ignore clicks on remove button', async () => {
    // Create a test node with a send_msg action
    const testNode: Node = {
      uuid: 'test-node',
      actions: [
        {
          type: 'send_msg',
          uuid: 'test-action',
          text: 'Hello world',
          quick_replies: []
        } as SendMsg
      ],
      exits: []
    };

    // Create EditorNode
    const editorNode: CanvasNode = await fixture(html`
      <temba-flow-node
        .node=${testNode}
        .ui=${{ position: { left: 0, top: 0 } }}
      ></temba-flow-node>
    `);

    await editorNode.updateComplete;

    // Set up event listener to catch ActionEditRequested event
    let editRequestedEvent: CustomEvent | null = null;
    editorNode.addEventListener(
      CustomEventType.ActionEditRequested,
      (event: CustomEvent) => {
        editRequestedEvent = event;
      }
    );

    // Simulate clicking on the remove button
    const removeButton = editorNode.querySelector(
      '.remove-button'
    ) as HTMLElement;
    expect(removeButton).to.exist;

    removeButton.click();

    // Verify NO ActionEditRequested event was fired (only remove action handling)
    expect(editRequestedEvent).to.be.null;
  });

  it('should not open action editor when dragging beyond threshold', async () => {
    // Create a test node with a send_msg action
    const testNode: Node = {
      uuid: 'test-node',
      actions: [
        {
          type: 'send_msg',
          uuid: 'test-action',
          text: 'Hello world',
          quick_replies: []
        } as SendMsg
      ],
      exits: []
    };

    // Create EditorNode
    const editorNode: CanvasNode = await fixture(html`
      <temba-flow-node
        .node=${testNode}
        .ui=${{ position: { left: 0, top: 0 } }}
      ></temba-flow-node>
    `);

    await editorNode.updateComplete;

    // Set up event listener to catch ActionEditRequested event
    let editRequestedEvent: CustomEvent | null = null;
    editorNode.addEventListener(
      CustomEventType.ActionEditRequested,
      (event: CustomEvent) => {
        editRequestedEvent = event;
      }
    );

    // Simulate a drag operation (mousedown followed by mouseup at different position beyond threshold)
    const actionContent = editorNode.querySelector(
      '.action-content'
    ) as HTMLElement;
    expect(actionContent).to.exist;

    const mouseDownEvent = new MouseEvent('mousedown', {
      clientX: 100,
      clientY: 100,
      bubbles: true
    });
    const mouseUpEvent = new MouseEvent('mouseup', {
      clientX: 110, // 10 pixels away, beyond the 5 pixel threshold
      clientY: 100,
      bubbles: true
    });

    actionContent.dispatchEvent(mouseDownEvent);
    actionContent.dispatchEvent(mouseUpEvent);

    // Verify NO ActionEditRequested event was fired because we dragged beyond threshold
    expect(editRequestedEvent).to.be.null;
  });

  it('should open action editor when clicking within threshold', async () => {
    // Create a test node with a send_msg action
    const testNode: Node = {
      uuid: 'test-node',
      actions: [
        {
          type: 'send_msg',
          uuid: 'test-action',
          text: 'Hello world',
          quick_replies: []
        } as SendMsg
      ],
      exits: []
    };

    // Create EditorNode
    const editorNode: CanvasNode = await fixture(html`
      <temba-flow-node
        .node=${testNode}
        .ui=${{ position: { left: 0, top: 0 } }}
      ></temba-flow-node>
    `);

    await editorNode.updateComplete;

    // Set up event listener to catch ActionEditRequested event
    let editRequestedEvent: CustomEvent | null = null;
    editorNode.addEventListener(
      CustomEventType.ActionEditRequested,
      (event: CustomEvent) => {
        editRequestedEvent = event;
      }
    );

    // Simulate a small movement (mousedown followed by mouseup at position within threshold)
    const actionContent = editorNode.querySelector(
      '.action-content'
    ) as HTMLElement;
    expect(actionContent).to.exist;

    const mouseDownEvent = new MouseEvent('mousedown', {
      clientX: 100,
      clientY: 100,
      bubbles: true
    });
    const mouseUpEvent = new MouseEvent('mouseup', {
      clientX: 103, // 3 pixels away, within the 5 pixel threshold
      clientY: 102, // 2 pixels away
      bubbles: true
    });

    actionContent.dispatchEvent(mouseDownEvent);
    actionContent.dispatchEvent(mouseUpEvent);

    // Verify ActionEditRequested event was fired because we stayed within threshold
    expect(editRequestedEvent).to.exist;
    expect(editRequestedEvent!.detail.action).to.deep.equal(
      testNode.actions[0]
    );
    expect(editRequestedEvent!.detail.nodeUuid).to.equal('test-node');
  });
});
