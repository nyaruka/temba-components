import { expect } from '@open-wc/testing';
import { wait_for_response } from '../../src/flow/nodes/wait_for_response';
import { Node } from '../../src/store/flow-definition';
import { NodeTest } from '../NodeHelper';
import { createOperatorOption } from '../../src/flow/operators';

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
        'rules',
        { type: 'row', items: ['timeout_enabled', 'timeout_duration'] },
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
      expect(formData.rules).to.deep.equal([]);
    });

    it('converts node with rules to form data correctly', () => {
      const node: Node = {
        uuid: 'test-node',
        actions: [],
        router: {
          type: 'switch',
          result_name: 'user_response',
          operand: '@input.text',
          categories: [
            {
              uuid: 'red-cat',
              name: 'Red',
              exit_uuid: 'red-exit'
            },
            {
              uuid: 'green-cat',
              name: 'Green',
              exit_uuid: 'green-exit'
            },
            {
              uuid: 'other-cat',
              name: 'Other',
              exit_uuid: 'other-exit'
            }
          ],
          cases: [
            {
              uuid: 'red-case',
              type: 'has_any_word',
              arguments: ['red'],
              category_uuid: 'red-cat'
            },
            {
              uuid: 'green-case',
              type: 'has_phrase',
              arguments: ['green'],
              category_uuid: 'green-cat'
            }
          ]
        },
        exits: [
          { uuid: 'red-exit', destination_uuid: null },
          { uuid: 'green-exit', destination_uuid: null },
          { uuid: 'other-exit', destination_uuid: null }
        ]
      };

      const formData = wait_for_response.toFormData!(node);

      expect(formData.uuid).to.equal('test-node');
      expect(formData.result_name).to.equal('user_response');
      expect(formData.rules).to.have.length(2);
      expect(formData.rules[0]).to.deep.equal({
        operator: createOperatorOption('has_any_word'),
        value: 'red',
        category: 'Red'
      });
      expect(formData.rules[1]).to.deep.equal({
        operator: createOperatorOption('has_phrase'),
        value: 'green',
        category: 'Green'
      });
    });

    it('converts form data to node correctly', () => {
      const formData = {
        uuid: 'test-node',
        result_name: 'custom_response',
        rules: []
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

    it('converts form data with rules to node correctly', () => {
      const formData = {
        uuid: 'test-node',
        result_name: 'custom_response',
        rules: [
          {
            operator: 'has_any_word',
            value: 'red',
            category: 'Red'
          },
          {
            operator: 'has_phrase',
            value: 'blue',
            category: 'Blue'
          }
        ]
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
      expect(result.router?.operand).to.equal('@input.text');
      expect(result.router?.categories).to.have.length(3); // Red, Blue, Other
      expect(result.router?.cases).to.have.length(2);
      expect(result.exits).to.have.length(3);

      // Check categories
      const categoryNames = result.router!.categories.map((cat) => cat.name);
      expect(categoryNames).to.include.members(['Red', 'Blue', 'Other']);

      // Check cases
      const redCase = result.router!.cases.find(
        (c) => c.type === 'has_any_word'
      );
      expect(redCase).to.exist;
      expect(redCase!.arguments).to.deep.equal(['red']);

      const blueCase = result.router!.cases.find(
        (c) => c.type === 'has_phrase'
      );
      expect(blueCase).to.exist;
      expect(blueCase!.arguments).to.deep.equal(['blue']);
    });

    it('handles default result name', () => {
      const formData = {
        uuid: 'test-node',
        rules: []
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

    it('handles operators with no operands correctly', () => {
      const formData = {
        uuid: 'test-node',
        result_name: 'custom_response',
        rules: [
          {
            operator: 'has_text',
            value: '', // No value needed for has_text
            category: 'Has Text'
          },
          {
            operator: 'has_number',
            value: '', // No value needed for has_number
            category: 'Has Number'
          }
        ]
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
      expect(result.router?.categories).to.have.length(3); // Has Text, Has Number, Other
      expect(result.router?.cases).to.have.length(2);
      expect(result.exits).to.have.length(3);

      // Check categories
      const categoryNames = result.router!.categories.map((cat) => cat.name);
      expect(categoryNames).to.include.members([
        'Has Text',
        'Has Number',
        'Other'
      ]);

      // Check cases - should have empty arguments for 0-operand operators
      const hasTextCase = result.router!.cases.find(
        (c) => c.type === 'has_text'
      );
      expect(hasTextCase).to.exist;
      expect(hasTextCase!.arguments).to.deep.equal([]);

      const hasNumberCase = result.router!.cases.find(
        (c) => c.type === 'has_number'
      );
      expect(hasNumberCase).to.exist;
      expect(hasNumberCase!.arguments).to.deep.equal([]);
    });

    it('preserves timeout categories when adding rules', () => {
      const formData = {
        uuid: 'test-node',
        result_name: 'response',
        timeout_enabled: true,
        timeout_duration: [{ value: '300', name: '5 minutes' }],
        rules: [
          {
            operator: 'has_text',
            value: 'yes',
            category: 'Positive'
          }
        ]
      };

      const originalNode: Node = {
        uuid: 'test-node',
        actions: [],
        router: {
          type: 'switch',
          wait: {
            type: 'msg',
            timeout: {
              category_uuid: 'timeout-cat',
              seconds: 300
            }
          },
          result_name: 'response',
          categories: [
            {
              uuid: 'timeout-cat',
              name: 'No Response',
              exit_uuid: 'timeout-exit'
            }
          ]
        },
        exits: [{ uuid: 'timeout-exit', destination_uuid: null }]
      };

      const result = wait_for_response.fromFormData!(formData, originalNode);

      expect(result.router?.categories).to.have.length(3); // Positive, No Response, Other
      const categoryNames = result.router!.categories.map((cat) => cat.name);
      expect(categoryNames).to.include.members([
        'Positive',
        'No Response',
        'Other'
      ]);

      // Verify timeout configuration is preserved
      expect(result.router?.wait).to.exist;
      expect(result.router?.wait?.timeout?.category_uuid).to.equal(
        'timeout-cat'
      );
    });
  });

  describe('validation', () => {
    it('validates form data correctly with no errors', () => {
      const formData = {
        rules: [
          { operator: 'has_text', value: 'yes', category: 'Positive' },
          { operator: 'has_text', value: 'no', category: 'Negative' }
        ]
      };

      const validation = wait_for_response.validate!(formData);
      expect(validation.valid).to.be.true;
      expect(validation.errors).to.be.empty;
    });

    it('detects duplicate category names', () => {
      const formData = {
        rules: [
          { operator: 'has_text', value: 'yes', category: 'Positive' },
          { operator: 'has_text', value: 'ok', category: 'positive' }, // case insensitive duplicate
          { operator: 'has_text', value: 'no', category: 'Negative' }
        ]
      };

      const validation = wait_for_response.validate!(formData);
      expect(validation.valid).to.be.false;
      expect(validation.errors.rules).to.contain(
        'Duplicate category names found'
      );
      expect(validation.errors.rules).to.contain('Positive');
    });

    it('allows rules with operators that need no values', () => {
      const formData = {
        rules: [
          { operator: 'has_text', value: '', category: 'Has Text' },
          { operator: 'has_number', value: '', category: 'Has Number' },
          { operator: 'has_any_word', value: 'hello', category: 'Greeting' }
        ]
      };

      const validation = wait_for_response.validate!(formData);
      expect(validation.valid).to.be.true;
      expect(validation.errors).to.be.empty;
    });

    it('ignores empty rules in validation', () => {
      const formData = {
        rules: [
          { operator: 'has_phrase', value: 'yes', category: 'Positive' },
          { operator: '', value: '', category: '' }, // empty rule
          { operator: 'has_phrase', value: 'no', category: 'Negative' }
        ]
      };

      const validation = wait_for_response.validate!(formData);
      expect(validation.valid).to.be.true;
      expect(validation.errors).to.be.empty;
    });
  });
});
