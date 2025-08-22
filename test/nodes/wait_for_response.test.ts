import { expect } from '@open-wc/testing';
import { wait_for_response } from '../../src/flow/nodes/wait_for_response';
import { Node } from '../../src/store/flow-definition';
import { NodeTest } from '../NodeHelper';

/**
 * Test suite for the wait_for_response node configuration.
 */
describe('wait_for_response node config', () => {
  const helper = new NodeTest(wait_for_response, 'wait_for_response');

  describe('basic properties', () => {
    helper.testBasicProperties();

    it('has correct name', () => {
      expect(wait_for_response.name).to.equal('Wait for Response');
    });

    it('has correct type', () => {
      expect(wait_for_response.type).to.equal('wait_for_response');
    });

    it('has form configuration', () => {
      expect(wait_for_response.form).to.exist;
      expect(wait_for_response.form.result_name).to.exist;
    });

    it('has layout configuration', () => {
      expect(wait_for_response.layout).to.exist;
      expect(wait_for_response.layout).to.deep.equal([
        'timeout',
        'result_name'
      ]);
    });
  });

  describe('node scenarios', () => {
    helper.testNode(
      {
        uuid: 'test-wait-node-1',
        actions: [],
        router: {
          type: 'switch',
          wait: {
            type: 'msg',
            timeout: {
              category_uuid: 'timeout-cat-1',
              seconds: 300
            }
          },
          result_name: 'response',
          categories: [
            {
              uuid: 'timeout-cat-1',
              name: 'No Response',
              exit_uuid: 'timeout-exit-1'
            }
          ]
        },
        exits: [{ uuid: 'timeout-exit-1', destination_uuid: null }]
      } as Node,
      { type: 'wait_for_response' },
      'basic-wait'
    );

    helper.testNode(
      {
        uuid: 'test-wait-node-2',
        actions: [],
        router: {
          type: 'switch',
          wait: {
            type: 'msg',
            timeout: {
              category_uuid: 'timeout-cat-2',
              seconds: 1800
            }
          },
          result_name: 'user_input',
          categories: [
            {
              uuid: 'timeout-cat-2',
              name: 'No Response',
              exit_uuid: 'timeout-exit-2'
            }
          ]
        },
        exits: [{ uuid: 'timeout-exit-2', destination_uuid: null }]
      } as Node,
      { type: 'wait_for_response' },
      'custom-result-name'
    );

    helper.testNode(
      {
        uuid: 'test-wait-node-3',
        actions: [],
        router: {
          type: 'switch',
          wait: {
            type: 'msg',
            timeout: {
              category_uuid: 'timeout-cat-3',
              seconds: 60
            }
          },
          result_name: 'quick_response',
          categories: [
            {
              uuid: 'timeout-cat-3',
              name: 'No Response',
              exit_uuid: 'timeout-exit-3'
            }
          ]
        },
        exits: [{ uuid: 'timeout-exit-3', destination_uuid: null }]
      } as Node,
      { type: 'wait_for_response' },
      'short-timeout'
    );

    helper.testNode(
      {
        uuid: 'test-wait-node-4',
        actions: [],
        router: {
          type: 'switch',
          wait: {
            type: 'msg'
            // No timeout specified
          },
          result_name: 'response',
          categories: []
        },
        exits: []
      } as Node,
      { type: 'wait_for_response' },
      'no-timeout'
    );
  });

  describe('data transformation', () => {
    it('converts node to form data correctly', () => {
      const node: Node = {
        uuid: 'test-node',
        actions: [],
        router: {
          type: 'switch',
          result_name: 'user_response',
          categories: []
        },
        exits: []
      };

      const formData = wait_for_response.toFormData!(node);

      expect(formData.uuid).to.equal('test-node');
      expect(formData.result_name).to.equal('user_response');
    });

    it('converts form data to node correctly', () => {
      const formData = {
        uuid: 'test-node',
        result_name: 'custom_response'
      };

      const originalNode: Node = {
        uuid: 'test-node',
        actions: [],
        exits: [],
        router: {
          type: 'switch',
          result_name: 'response',
          categories: []
        }
      };

      const result = wait_for_response.fromFormData!(formData, originalNode);

      expect(result.uuid).to.equal('test-node');
      expect(result.router?.result_name).to.equal('custom_response');
    });

    it('handles default result name', () => {
      const formData = {
        uuid: 'test-node'
        // No result_name specified
      };

      const originalNode: Node = {
        uuid: 'test-node',
        actions: [],
        exits: [],
        router: {
          type: 'switch',
          categories: []
        }
      };

      const result = wait_for_response.fromFormData!(formData, originalNode);

      expect(result.uuid).to.equal('test-node');
      expect(result.router?.result_name).to.equal('response');
    });
  });
});
