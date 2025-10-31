import { expect } from '@open-wc/testing';
import { split_by_subflow } from '../../src/flow/nodes/split_by_subflow';
import { Node } from '../../src/store/flow-definition';
import { NodeTest } from '../NodeHelper';

/**
 * Test suite for the split_by_subflow node configuration.
 */
describe('split_by_subflow node config', () => {
  const helper = new NodeTest(split_by_subflow, 'split_by_subflow');

  describe('basic properties', () => {
    helper.testBasicProperties();

    it('has correct name', () => {
      expect(split_by_subflow.name).to.equal('Enter a Flow');
    });

    it('has correct type', () => {
      expect(split_by_subflow.type).to.equal('split_by_subflow');
    });

    it('has showAsAction set to true', () => {
      expect(split_by_subflow.showAsAction).to.be.true;
    });

    it('has form configuration', () => {
      expect(split_by_subflow.form).to.exist;
      expect(split_by_subflow.form.flow).to.exist;
      expect(split_by_subflow.form.flow.type).to.equal('select');
      expect(split_by_subflow.form.flow.required).to.be.true;
    });

    it('has layout configuration', () => {
      expect(split_by_subflow.layout).to.exist;
      expect(split_by_subflow.layout).to.deep.equal(['flow']);
    });
  });

  describe('toFormData', () => {
    it('extracts data from node with enter_flow action', () => {
      const node: Node = {
        uuid: 'test-node',
        actions: [
          {
            uuid: 'test-action',
            type: 'enter_flow',
            flow: { uuid: 'flow-123', name: 'Registration Flow' }
          } as any
        ],
        router: {
          type: 'switch',
          operand: '@child.status',
          cases: [
            {
              uuid: 'case-1',
              type: 'has_only_text',
              arguments: ['completed'],
              category_uuid: 'cat-1'
            }
          ],
          categories: [
            { uuid: 'cat-1', name: 'Complete', exit_uuid: 'exit-1' },
            { uuid: 'cat-2', name: 'Expired', exit_uuid: 'exit-2' }
          ],
          default_category_uuid: 'cat-2'
        },
        exits: [
          { uuid: 'exit-1', destination_uuid: null },
          { uuid: 'exit-2', destination_uuid: null }
        ]
      };

      const formData = split_by_subflow.toFormData(node);

      expect(formData.uuid).to.equal('test-node');
      expect(formData.flow).to.be.an('array');
      expect(formData.flow).to.have.lengthOf(1);
      expect(formData.flow[0]).to.deep.equal({
        uuid: 'flow-123',
        name: 'Registration Flow'
      });
    });

    it('handles empty node', () => {
      const node: Node = {
        uuid: 'test-node',
        actions: [],
        exits: []
      };

      const formData = split_by_subflow.toFormData(node);

      expect(formData.uuid).to.equal('test-node');
      expect(formData.flow).to.be.an('array');
      expect(formData.flow).to.have.lengthOf(0);
    });
  });

  describe('fromFormData', () => {
    it('creates node with enter_flow action and router from form data', () => {
      const formData = {
        uuid: 'test-node',
        flow: [{ uuid: 'flow-123', name: 'Registration Flow' }]
      };

      const originalNode: Node = {
        uuid: 'test-node',
        actions: [],
        exits: []
      };

      const node = split_by_subflow.fromFormData(formData, originalNode);

      // Check node structure
      expect(node.uuid).to.equal('test-node');
      expect(node.actions).to.have.length(1);
      expect(node.actions[0].type).to.equal('enter_flow');

      // Check enter_flow action has properly formatted flow
      const enterFlowAction = node.actions[0] as any;
      expect(enterFlowAction.flow).to.exist;
      expect(enterFlowAction.flow.uuid).to.equal('flow-123');
      expect(enterFlowAction.flow.name).to.equal('Registration Flow');

      // Check router
      expect(node.router).to.exist;
      expect(node.router.type).to.equal('switch');
      expect(node.router.operand).to.equal('@child.status');
      expect(node.router.categories).to.have.length(2);
      expect(node.router.categories[0].name).to.equal('Complete');
      expect(node.router.categories[1].name).to.equal('Expired');

      // Check exits
      expect(node.exits).to.have.length(2);
    });

    it('handles empty flow selection', () => {
      const formData = {
        uuid: 'test-node',
        flow: []
      };

      const originalNode: Node = {
        uuid: 'test-node',
        actions: [],
        exits: []
      };

      const node = split_by_subflow.fromFormData(formData, originalNode);

      // Should still create the node structure
      expect(node.actions).to.have.length(1);
      const enterFlowAction = node.actions[0] as any;
      expect(enterFlowAction.flow.uuid).to.equal('');
      expect(enterFlowAction.flow.name).to.equal('');
    });

    it('preserves UUIDs when editing existing node', () => {
      const existingNode: Node = {
        uuid: 'test-node',
        actions: [
          {
            uuid: 'existing-action-uuid',
            type: 'enter_flow',
            flow: { uuid: 'flow-old', name: 'Old Flow' }
          } as any
        ],
        router: {
          type: 'switch',
          operand: '@child.status',
          cases: [
            {
              uuid: 'existing-case-uuid',
              type: 'has_only_text',
              arguments: ['completed'],
              category_uuid: 'existing-cat-1'
            }
          ],
          categories: [
            {
              uuid: 'existing-cat-1',
              name: 'Complete',
              exit_uuid: 'existing-exit-1'
            },
            {
              uuid: 'existing-cat-2',
              name: 'Expired',
              exit_uuid: 'existing-exit-2'
            }
          ],
          default_category_uuid: 'existing-cat-2'
        },
        exits: [
          { uuid: 'existing-exit-1', destination_uuid: null },
          { uuid: 'existing-exit-2', destination_uuid: null }
        ]
      };

      const formData = {
        uuid: 'test-node',
        flow: [{ uuid: 'flow-new', name: 'New Flow' }]
      };

      const node = split_by_subflow.fromFormData(formData, existingNode);

      // Should preserve action UUID
      expect(node.actions[0].uuid).to.equal('existing-action-uuid');

      // Should preserve router structure UUIDs
      expect(node.router.categories[0].uuid).to.equal('existing-cat-1');
      expect(node.router.categories[1].uuid).to.equal('existing-cat-2');
      expect(node.exits[0].uuid).to.equal('existing-exit-1');
      expect(node.exits[1].uuid).to.equal('existing-exit-2');

      // But should update the flow
      const enterFlowAction = node.actions[0] as any;
      expect(enterFlowAction.flow.uuid).to.equal('flow-new');
      expect(enterFlowAction.flow.name).to.equal('New Flow');
    });
  });

  describe('round-trip transformation', () => {
    it('should preserve node structure through toFormData -> fromFormData', () => {
      const originalNode: Node = {
        uuid: 'test-node-uuid',
        actions: [
          {
            uuid: 'action-uuid',
            type: 'enter_flow',
            flow: { uuid: 'flow-456', name: 'My Subflow' }
          } as any
        ],
        router: {
          type: 'switch',
          operand: '@child.status',
          cases: [
            {
              uuid: 'case-uuid',
              type: 'has_only_text',
              arguments: ['completed'],
              category_uuid: 'cat-complete'
            }
          ],
          categories: [
            {
              uuid: 'cat-complete',
              name: 'Complete',
              exit_uuid: 'exit-complete'
            },
            {
              uuid: 'cat-expired',
              name: 'Expired',
              exit_uuid: 'exit-expired'
            }
          ],
          default_category_uuid: 'cat-expired'
        },
        exits: [
          { uuid: 'exit-complete', destination_uuid: null },
          { uuid: 'exit-expired', destination_uuid: null }
        ]
      };

      // Convert to form data
      const formData = split_by_subflow.toFormData(originalNode);

      // Convert back to node
      const resultNode = split_by_subflow.fromFormData(formData, originalNode);

      // Should match the original structure
      expect(resultNode).to.deep.equal(originalNode);
    });
  });

  describe('NodeEditor integration', () => {
    it('should properly use node fromFormData when formDataToNode is called', async () => {
      // This test simulates the bug where node.fromFormData should be used
      // to create the entire node (including actions), not action.fromFormData

      const { fixture, html } = await import('@open-wc/testing');
      await import('../../temba-modules');

      const originalNode: Node = {
        uuid: 'test-node-uuid',
        actions: [
          {
            uuid: 'action-uuid',
            type: 'enter_flow',
            flow: { uuid: 'flow-old', name: 'Old Flow' }
          } as any
        ],
        router: {
          type: 'switch',
          operand: '@child.status',
          cases: [
            {
              uuid: 'case-uuid',
              type: 'has_only_text',
              arguments: ['completed'],
              category_uuid: 'cat-complete'
            }
          ],
          categories: [
            {
              uuid: 'cat-complete',
              name: 'Complete',
              exit_uuid: 'exit-complete'
            },
            {
              uuid: 'cat-expired',
              name: 'Expired',
              exit_uuid: 'exit-expired'
            }
          ],
          default_category_uuid: 'cat-expired'
        },
        exits: [
          { uuid: 'exit-complete', destination_uuid: null },
          { uuid: 'exit-expired', destination_uuid: null }
        ]
      };

      const nodeUI = {
        type: 'split_by_subflow',
        position: { left: 50, top: 50 }
      };

      // Create the node editor
      const nodeEditor = (await fixture(html`
        <temba-node-editor
          .node=${originalNode}
          .nodeUI=${nodeUI}
          .action=${originalNode.actions[0]}
          .isOpen=${true}
        ></temba-node-editor>
      `)) as any;

      await nodeEditor.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 200));
      await nodeEditor.updateComplete;

      // Get the initial formData to verify toFormData was called
      const initialFormData = nodeEditor.formData;
      expect(initialFormData.flow).to.exist;
      expect(initialFormData.flow).to.have.lengthOf(1);
      expect(initialFormData.flow[0].uuid).to.equal('flow-old');

      // Simulate changing the flow selection
      const newFormData = {
        ...initialFormData,
        flow: [{ uuid: 'flow-new', name: 'New Flow' }]
      };

      // Call formDataToNode directly to test the transformation
      const resultNode = nodeEditor.formDataToNode(newFormData);

      // Verify that the result node has the new flow properly formatted
      expect(resultNode).to.exist;
      expect(resultNode.actions).to.have.length(1);

      const enterFlowAction = resultNode.actions[0] as any;
      expect(enterFlowAction.type).to.equal('enter_flow');

      // This is the key assertion - the flow should be properly formatted
      // as created by node's fromFormData, not by action's fromFormData
      expect(enterFlowAction.flow).to.exist;
      expect(enterFlowAction.flow.uuid).to.equal('flow-new');
      expect(enterFlowAction.flow.name).to.equal('New Flow');

      // The flow should NOT have extra properties that might come from the select component
      expect(enterFlowAction.flow).to.not.have.property('value');

      // Verify router structure was also created properly by node's fromFormData
      expect(resultNode.router).to.exist;
      expect(resultNode.router.type).to.equal('switch');
      expect(resultNode.router.categories).to.have.length(2);
      expect(resultNode.exits).to.have.length(2);
    });
  });
});
