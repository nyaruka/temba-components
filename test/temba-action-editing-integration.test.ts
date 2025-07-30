import { expect, fixture, html } from '@open-wc/testing';
import { EditorNode } from '../src/flow/EditorNode';
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
    const editorNode: EditorNode = await fixture(html`
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

    actionContent.click();

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
    const editorNode: EditorNode = await fixture(html`
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
});
