import { expect } from '@open-wc/testing';
import { split_by_run_result } from '../../src/flow/nodes/split_by_run_result';
import { Node } from '../../src/store/flow-definition';
import { NodeTest } from '../NodeHelper';
import { zustand } from '../../src/store/AppState';

/**
 * Test suite for the split_by_run_result node configuration.
 */
describe('split_by_run_result node config', () => {
  const helper = new NodeTest(split_by_run_result, 'split_by_run_result');

  // Setup mock flow results in the store before each test
  beforeEach(() => {
    // Mock the store with flow results
    zustand.setState({
      flowInfo: {
        results: [
          {
            key: 'favorite_color',
            name: 'Favorite Color',
            categories: ['Red', 'Blue', 'Green'],
            node_uuids: ['node-1']
          },
          {
            key: 'age',
            name: 'Age',
            categories: ['Adult', 'Teen', 'Child'],
            node_uuids: ['node-2']
          }
        ],
        dependencies: [],
        counts: { nodes: 0, languages: 0 },
        locals: []
      }
    } as any);
  });

  describe('basic properties', () => {
    helper.testBasicProperties();

    it('has correct name', () => {
      expect(split_by_run_result.name).to.equal('Split by Result');
    });

    it('has correct type', () => {
      expect(split_by_run_result.type).to.equal('split_by_run_result');
    });

    it('has correct dialog size', () => {
      expect(split_by_run_result.dialogSize).to.equal('large');
    });
  });

  describe('toFormData', () => {
    it('should transform node with rules to form data correctly', () => {
      const node: Node = {
        uuid: 'test-node-uuid',
        actions: [],
        router: {
          type: 'switch',
          operand: '@results.favorite_color',
          cases: [
            {
              uuid: 'case-1',
              type: 'has_phrase',
              arguments: ['red'],
              category_uuid: 'cat-1'
            },
            {
              uuid: 'case-2',
              type: 'has_any_word',
              arguments: ['blue', 'azure'],
              category_uuid: 'cat-2'
            }
          ],
          categories: [
            { uuid: 'cat-1', name: 'Red', exit_uuid: 'exit-1' },
            { uuid: 'cat-2', name: 'Blue', exit_uuid: 'exit-2' },
            { uuid: 'cat-other', name: 'Other', exit_uuid: 'exit-other' }
          ],
          default_category_uuid: 'cat-other',
          result_name: 'color_category'
        },
        exits: [
          { uuid: 'exit-1', destination_uuid: null },
          { uuid: 'exit-2', destination_uuid: null },
          { uuid: 'exit-other', destination_uuid: null }
        ]
      };

      const nodeUI = {
        config: {
          operand: {
            value: 'favorite_color',
            name: 'Favorite Color'
          }
        }
      };

      const formData = split_by_run_result.toFormData!(node, nodeUI);

      expect(formData.uuid).to.equal('test-node-uuid');
      expect(formData.result).to.be.an('array');
      expect(formData.result[0].value).to.equal('favorite_color');
      expect(formData.result[0].name).to.equal('Favorite Color');
      expect(formData.rules).to.have.lengthOf(2);

      // Check first rule
      expect(formData.rules[0].operator.value).to.equal('has_phrase');
      expect(formData.rules[0].value1).to.equal('red');
      expect(formData.rules[0].category).to.equal('Red');

      // Check second rule
      expect(formData.rules[1].operator.value).to.equal('has_any_word');
      expect(formData.rules[1].value1).to.equal('blue azure');
      expect(formData.rules[1].category).to.equal('Blue');

      expect(formData.result_name).to.equal('color_category');
    });

    it('should transform node with no rules to form data correctly', () => {
      const node: Node = {
        uuid: 'test-node-uuid',
        actions: [],
        router: {
          type: 'switch',
          operand: '@results.age',
          cases: [],
          categories: [
            {
              uuid: 'cat-all',
              name: 'All Responses',
              exit_uuid: 'exit-all'
            }
          ],
          default_category_uuid: 'cat-all'
        },
        exits: [{ uuid: 'exit-all', destination_uuid: null }]
      };

      const nodeUI = {
        config: {
          operand: {
            value: 'age',
            name: 'Age'
          }
        }
      };

      const formData = split_by_run_result.toFormData!(node, nodeUI);

      expect(formData.uuid).to.equal('test-node-uuid');
      expect(formData.result).to.be.an('array');
      expect(formData.result[0].value).to.equal('age');
      expect(formData.result[0].name).to.equal('Age');
      expect(formData.rules).to.have.lengthOf(0);
      expect(formData.result_name).to.equal('');
    });

    it('should handle missing nodeUI config gracefully', () => {
      const node: Node = {
        uuid: 'test-node-uuid',
        actions: [],
        router: {
          type: 'switch',
          operand: '@results.favorite_color',
          cases: [],
          categories: [
            {
              uuid: 'cat-all',
              name: 'All Responses',
              exit_uuid: 'exit-all'
            }
          ],
          default_category_uuid: 'cat-all'
        },
        exits: [{ uuid: 'exit-all', destination_uuid: null }]
      };

      const formData = split_by_run_result.toFormData!(node);

      expect(formData.uuid).to.equal('test-node-uuid');
      expect(formData.result).to.be.an('array');
      expect(formData.result).to.have.lengthOf(0);
    });

    it('should transform node with two-operand operators correctly', () => {
      const node: Node = {
        uuid: 'test-node-uuid',
        actions: [],
        router: {
          type: 'switch',
          operand: '@results.age',
          cases: [
            {
              uuid: 'case-1',
              type: 'has_number_between',
              arguments: ['13', '17'],
              category_uuid: 'cat-1'
            }
          ],
          categories: [
            { uuid: 'cat-1', name: 'Teen', exit_uuid: 'exit-1' },
            { uuid: 'cat-other', name: 'Other', exit_uuid: 'exit-other' }
          ],
          default_category_uuid: 'cat-other'
        },
        exits: [
          { uuid: 'exit-1', destination_uuid: null },
          { uuid: 'exit-other', destination_uuid: null }
        ]
      };

      const nodeUI = {
        config: {
          operand: {
            value: 'age',
            name: 'Age'
          }
        }
      };

      const formData = split_by_run_result.toFormData!(node, nodeUI);

      expect(formData.rules).to.have.lengthOf(1);
      expect(formData.rules[0].operator.value).to.equal('has_number_between');
      expect(formData.rules[0].value1).to.equal('13');
      expect(formData.rules[0].value2).to.equal('17');
      expect(formData.rules[0].category).to.equal('Teen');
    });

    it('should transform node with zero-operand operators correctly', () => {
      const node: Node = {
        uuid: 'test-node-uuid',
        actions: [],
        router: {
          type: 'switch',
          operand: '@results.age',
          cases: [
            {
              uuid: 'case-1',
              type: 'has_number',
              arguments: [],
              category_uuid: 'cat-1'
            }
          ],
          categories: [
            { uuid: 'cat-1', name: 'Has Number', exit_uuid: 'exit-1' },
            { uuid: 'cat-other', name: 'Other', exit_uuid: 'exit-other' }
          ],
          default_category_uuid: 'cat-other'
        },
        exits: [
          { uuid: 'exit-1', destination_uuid: null },
          { uuid: 'exit-other', destination_uuid: null }
        ]
      };

      const nodeUI = {
        config: {
          operand: {
            value: 'age',
            name: 'Age'
          }
        }
      };

      const formData = split_by_run_result.toFormData!(node, nodeUI);

      expect(formData.rules).to.have.lengthOf(1);
      expect(formData.rules[0].operator.value).to.equal('has_number');
      expect(formData.rules[0].value1).to.equal('');
      expect(formData.rules[0].value2).to.equal('');
    });
  });

  describe('fromFormData', () => {
    it('should transform form data with rules to node correctly', () => {
      const formData = {
        uuid: 'test-node-uuid',
        result: [{ value: 'favorite_color', name: 'Favorite Color' }],
        rules: [
          {
            operator: { value: 'has_phrase', name: 'has the phrase' },
            value1: 'red',
            value2: '',
            category: 'Red'
          },
          {
            operator: { value: 'has_any_word', name: 'has any of the words' },
            value1: 'blue azure',
            value2: '',
            category: 'Blue'
          }
        ],
        result_name: 'color_category'
      };

      const originalNode: Node = {
        uuid: 'test-node-uuid',
        actions: [],
        router: {
          type: 'switch',
          operand: '@results.old_result',
          cases: [],
          categories: [],
          default_category_uuid: ''
        },
        exits: []
      };

      const resultNode = split_by_run_result.fromFormData!(
        formData,
        originalNode
      );

      expect(resultNode.uuid).to.equal('test-node-uuid');
      expect(resultNode.router).to.exist;
      expect(resultNode.router!.type).to.equal('switch');
      expect(resultNode.router!.operand).to.equal('@results.favorite_color');
      expect(resultNode.router!.result_name).to.equal('color_category');

      // Verify cases
      expect(resultNode.router!.cases).to.have.lengthOf(2);
      expect(resultNode.router!.cases![0].type).to.equal('has_phrase');
      expect(resultNode.router!.cases![0].arguments).to.deep.equal(['red']);
      expect(resultNode.router!.cases![1].type).to.equal('has_any_word');
      expect(resultNode.router!.cases![1].arguments).to.deep.equal([
        'blue',
        'azure'
      ]);

      // Verify categories
      expect(resultNode.router!.categories).to.have.lengthOf(3); // Red, Blue, Other
      expect(resultNode.router!.categories[0].name).to.equal('Red');
      expect(resultNode.router!.categories[1].name).to.equal('Blue');
      expect(resultNode.router!.categories[2].name).to.equal('Other');

      // Verify exits
      expect(resultNode.exits).to.have.lengthOf(3);
    });

    it('should transform form data without rules to node correctly', () => {
      const formData = {
        uuid: 'test-node-uuid',
        result: [{ value: 'age', name: 'Age' }],
        rules: [],
        result_name: ''
      };

      const originalNode: Node = {
        uuid: 'test-node-uuid',
        actions: [],
        router: {
          type: 'switch',
          operand: '@results.old_result',
          cases: [],
          categories: [],
          default_category_uuid: ''
        },
        exits: []
      };

      const resultNode = split_by_run_result.fromFormData!(
        formData,
        originalNode
      );

      expect(resultNode.uuid).to.equal('test-node-uuid');
      expect(resultNode.router).to.exist;
      expect(resultNode.router!.type).to.equal('switch');
      expect(resultNode.router!.operand).to.equal('@results.age');
      expect(resultNode.router!.result_name).to.be.undefined;

      // Should have only the default 'All Responses' category (no rules means "All Responses")
      expect(resultNode.router!.categories).to.have.lengthOf(1);
      expect(resultNode.router!.categories[0].name).to.equal('All Responses');

      // Should have one exit
      expect(resultNode.exits).to.have.lengthOf(1);
    });

    it('should not set result_name if empty', () => {
      const formData = {
        uuid: 'test-node-uuid',
        result: [{ value: 'favorite_color', name: 'Favorite Color' }],
        rules: [],
        result_name: ''
      };

      const originalNode: Node = {
        uuid: 'test-node-uuid',
        actions: [],
        router: {
          type: 'switch',
          operand: '@results.old_result',
          cases: [],
          categories: [],
          default_category_uuid: ''
        },
        exits: []
      };

      const resultNode = split_by_run_result.fromFormData!(
        formData,
        originalNode
      );

      expect(resultNode.router!.result_name).to.be.undefined;
    });

    it('should preserve existing UUIDs when updating categories', () => {
      const formData = {
        uuid: 'test-node-uuid',
        result: [{ value: 'favorite_color', name: 'Favorite Color' }],
        rules: [
          {
            operator: { value: 'has_phrase', name: 'has the phrase' },
            value1: 'red',
            value2: '',
            category: 'Red'
          }
        ],
        result_name: ''
      };

      const originalNode: Node = {
        uuid: 'test-node-uuid',
        actions: [],
        router: {
          type: 'switch',
          operand: '@results.favorite_color',
          cases: [
            {
              uuid: 'existing-case-uuid',
              type: 'has_phrase',
              arguments: ['red'],
              category_uuid: 'existing-cat-uuid'
            }
          ],
          categories: [
            {
              uuid: 'existing-cat-uuid',
              name: 'Red',
              exit_uuid: 'existing-exit-uuid'
            },
            {
              uuid: 'existing-other-uuid',
              name: 'Other',
              exit_uuid: 'existing-other-exit-uuid'
            }
          ],
          default_category_uuid: 'existing-other-uuid'
        },
        exits: [
          { uuid: 'existing-exit-uuid', destination_uuid: 'some-node' },
          { uuid: 'existing-other-exit-uuid', destination_uuid: null }
        ]
      };

      const resultNode = split_by_run_result.fromFormData!(
        formData,
        originalNode
      );

      // Should preserve existing category UUIDs
      const redCategory = resultNode.router!.categories.find(
        (cat) => cat.name === 'Red'
      );
      expect(redCategory!.uuid).to.equal('existing-cat-uuid');
      expect(redCategory!.exit_uuid).to.equal('existing-exit-uuid');

      const otherCategory = resultNode.router!.categories.find(
        (cat) => cat.name === 'Other'
      );
      expect(otherCategory!.uuid).to.equal('existing-other-uuid');
      expect(otherCategory!.exit_uuid).to.equal('existing-other-exit-uuid');

      // Should preserve exit destinations
      const redExit = resultNode.exits.find(
        (exit) => exit.uuid === 'existing-exit-uuid'
      );
      expect(redExit!.destination_uuid).to.equal('some-node');
    });

    it('should handle form data without result selection', () => {
      const formData = {
        uuid: 'test-node-uuid',
        result: [],
        rules: [],
        result_name: ''
      };

      const originalNode: Node = {
        uuid: 'test-node-uuid',
        actions: [],
        router: {
          type: 'switch',
          operand: '@results.old_result',
          cases: [],
          categories: [],
          default_category_uuid: ''
        },
        exits: []
      };

      const resultNode = split_by_run_result.fromFormData!(
        formData,
        originalNode
      );

      // Should return the original node unchanged
      expect(resultNode).to.equal(originalNode);
    });

    it('should handle incomplete rules gracefully', () => {
      const formData = {
        uuid: 'test-node-uuid',
        result: [{ value: 'age', name: 'Age' }],
        rules: [
          {
            operator: { value: 'has_number_gte', name: 'has a number above' },
            value1: '18',
            value2: '',
            category: 'Adult'
          },
          {
            operator: { value: 'has_number_lt', name: 'has a number below' },
            value1: '', // Missing value1
            value2: '',
            category: 'Child'
          },
          {
            operator: {
              value: 'has_number_between',
              name: 'has a number between'
            },
            value1: '10',
            value2: '', // Missing value2 for 2-operand operator
            category: 'Teen'
          }
        ],
        result_name: ''
      };

      const originalNode: Node = {
        uuid: 'test-node-uuid',
        actions: [],
        router: {
          type: 'switch',
          operand: '@results.age',
          cases: [],
          categories: [],
          default_category_uuid: ''
        },
        exits: []
      };

      const resultNode = split_by_run_result.fromFormData!(
        formData,
        originalNode
      );

      // Only the first complete rule should be included
      expect(resultNode.router!.cases).to.have.lengthOf(1);
      expect(resultNode.router!.cases![0].type).to.equal('has_number_gte');

      // Should have Adult category and Other
      expect(resultNode.router!.categories).to.have.lengthOf(2);
      expect(resultNode.router!.categories[0].name).to.equal('Adult');
      expect(resultNode.router!.categories[1].name).to.equal('Other');
    });

    it('should handle two-operand operators correctly', () => {
      const formData = {
        uuid: 'test-node-uuid',
        result: [{ value: 'age', name: 'Age' }],
        rules: [
          {
            operator: {
              value: 'has_number_between',
              name: 'has a number between'
            },
            value1: '13',
            value2: '17',
            category: 'Teen'
          }
        ],
        result_name: ''
      };

      const originalNode: Node = {
        uuid: 'test-node-uuid',
        actions: [],
        router: {
          type: 'switch',
          operand: '@results.age',
          cases: [],
          categories: [],
          default_category_uuid: ''
        },
        exits: []
      };

      const resultNode = split_by_run_result.fromFormData!(
        formData,
        originalNode
      );

      expect(resultNode.router!.cases).to.have.lengthOf(1);
      expect(resultNode.router!.cases![0].type).to.equal('has_number_between');
      expect(resultNode.router!.cases![0].arguments).to.deep.equal([
        '13',
        '17'
      ]);
    });
  });

  describe('validation', () => {
    it('should validate that a result is required', () => {
      const formData = {
        result: [],
        rules: [],
        result_name: ''
      };

      const validation = split_by_run_result.validate!(formData);

      expect(validation.valid).to.be.false;
      expect(validation.errors).to.have.property('result');
      expect(validation.errors.result).to.equal('A flow result is required');
    });

    it('should pass validation with valid result', () => {
      const formData = {
        result: [{ value: 'favorite_color', name: 'Favorite Color' }],
        rules: [],
        result_name: ''
      };

      const validation = split_by_run_result.validate!(formData);

      expect(validation.valid).to.be.true;
      expect(validation.errors).to.deep.equal({});
    });

    it('should pass validation with result and rules', () => {
      const formData = {
        result: [{ value: 'age', name: 'Age' }],
        rules: [
          {
            operator: { value: 'has_number_gte', name: 'has a number above' },
            value1: '18',
            value2: '',
            category: 'Adult'
          }
        ],
        result_name: 'age_category'
      };

      const validation = split_by_run_result.validate!(formData);

      expect(validation.valid).to.be.true;
      expect(validation.errors).to.deep.equal({});
    });
  });
});
