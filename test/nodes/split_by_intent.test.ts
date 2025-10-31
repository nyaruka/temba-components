import { expect } from '@open-wc/testing';
import { split_by_intent } from '../../src/flow/nodes/split_by_intent';
import { Node } from '../../src/store/flow-definition';
import { NodeTest } from '../NodeHelper';

/**
 * Helper function to create routers with proper cases and exits for intent classification
 */
function createIntentRouter(
  rules: Array<{
    intent: string;
    threshold: string;
    operator: string;
    category: string;
  }>
) {
  const categories = [];
  const exits = [];
  const cases = [];

  // Add user categories from rules
  rules.forEach((rule) => {
    const categoryUuid = `category-${rule.category
      .toLowerCase()
      .replace(/\s+/g, '-')}`;
    const exitUuid = `exit-${rule.category.toLowerCase().replace(/\s+/g, '-')}`;
    const caseUuid = `case-${rule.category.toLowerCase().replace(/\s+/g, '-')}`;

    categories.push({
      uuid: categoryUuid,
      name: rule.category,
      exit_uuid: exitUuid
    });

    exits.push({
      uuid: exitUuid,
      destination_uuid: null
    });

    cases.push({
      uuid: caseUuid,
      type: rule.operator,
      arguments: [rule.intent, rule.threshold],
      category_uuid: categoryUuid
    });
  });

  // Add "Other" category (default)
  const otherCategoryUuid = 'category-other';
  const otherExitUuid = 'exit-other';

  categories.push({
    uuid: otherCategoryUuid,
    name: 'Other',
    exit_uuid: otherExitUuid
  });
  exits.push({
    uuid: otherExitUuid,
    destination_uuid: null
  });

  return {
    router: {
      type: 'switch' as const,
      categories: categories,
      default_category_uuid: otherCategoryUuid,
      operand: '@input',
      cases: cases
    },
    exits: exits
  };
}

/**
 * Test suite for the split_by_intent node configuration.
 */
describe('split_by_intent node config', () => {
  const helper = new NodeTest(split_by_intent, 'split_by_intent');

  describe('basic properties', () => {
    helper.testBasicProperties();

    it('has correct name', () => {
      expect(split_by_intent.name).to.equal('Split by Classifier');
    });

    it('has correct type', () => {
      expect(split_by_intent.type).to.equal('split_by_intent');
    });
  });

  describe('node scenarios', () => {
    it('renders basic intent classification', async () => {
      const basicRouter = createIntentRouter([
        {
          intent: 'book_flight',
          threshold: '0.9',
          operator: 'has_intent',
          category: 'Flight'
        },
        {
          intent: 'book_hotel',
          threshold: '0.9',
          operator: 'has_intent',
          category: 'Hotel'
        }
      ]);
      await helper.testNode(
        {
          uuid: 'test-node-1',
          actions: [
            {
              uuid: 'call-classifier-uuid',
              type: 'call_classifier',
              classifier: {
                uuid: 'classifier-123',
                name: 'Booking Classifier'
              },
              input: '@input.text'
            } as any
          ],
          router: basicRouter.router,
          exits: basicRouter.exits
        } as Node,
        { type: 'split_by_intent' },
        'basic-intent-classification'
      );
    });

    it('renders with has_top_intent operator', async () => {
      const topIntentRouter = createIntentRouter([
        {
          intent: 'greeting',
          threshold: '0.8',
          operator: 'has_top_intent',
          category: 'Greeting'
        },
        {
          intent: 'goodbye',
          threshold: '0.8',
          operator: 'has_top_intent',
          category: 'Goodbye'
        }
      ]);
      await helper.testNode(
        {
          uuid: 'test-node-2',
          actions: [
            {
              uuid: 'call-classifier-uuid-2',
              type: 'call_classifier',
              classifier: {
                uuid: 'classifier-456',
                name: 'Support Classifier'
              },
              input: '@input.text'
            } as any
          ],
          router: topIntentRouter.router,
          exits: topIntentRouter.exits
        } as Node,
        { type: 'split_by_intent' },
        'has-top-intent-operator'
      );
    });

    it('renders with custom input', async () => {
      const customInputRouter = createIntentRouter([
        {
          intent: 'complaint',
          threshold: '0.7',
          operator: 'has_intent',
          category: 'Complaint'
        }
      ]);
      await helper.testNode(
        {
          uuid: 'test-node-3',
          actions: [
            {
              uuid: 'call-classifier-uuid-3',
              type: 'call_classifier',
              classifier: {
                uuid: 'classifier-789',
                name: 'Feedback Classifier'
              },
              input: '@contact.fields.feedback'
            } as any
          ],
          router: customInputRouter.router,
          exits: customInputRouter.exits
        } as Node,
        { type: 'split_by_intent' },
        'custom-input'
      );
    });

    it('renders with mixed operators and thresholds', async () => {
      const mixedRouter = createIntentRouter([
        {
          intent: 'book_flight',
          threshold: '0.95',
          operator: 'has_top_intent',
          category: 'Flight'
        },
        {
          intent: 'book_hotel',
          threshold: '0.8',
          operator: 'has_intent',
          category: 'Hotel'
        },
        {
          intent: 'cancel_booking',
          threshold: '0.9',
          operator: 'has_intent',
          category: 'Cancel'
        }
      ]);
      await helper.testNode(
        {
          uuid: 'test-node-4',
          actions: [
            {
              uuid: 'call-classifier-uuid-4',
              type: 'call_classifier',
              classifier: {
                uuid: 'classifier-mixed',
                name: 'Booking Classifier'
              },
              input: '@input.text'
            } as any
          ],
          router: mixedRouter.router,
          exits: mixedRouter.exits
        } as Node,
        { type: 'split_by_intent' },
        'mixed-operators-and-thresholds'
      );
    });

    it('renders with many intents', async () => {
      const manyIntentsRouter = createIntentRouter([
        {
          intent: 'greeting',
          threshold: '0.9',
          operator: 'has_intent',
          category: 'Greeting'
        },
        {
          intent: 'goodbye',
          threshold: '0.9',
          operator: 'has_intent',
          category: 'Goodbye'
        },
        {
          intent: 'help',
          threshold: '0.85',
          operator: 'has_intent',
          category: 'Help'
        },
        {
          intent: 'complaint',
          threshold: '0.8',
          operator: 'has_intent',
          category: 'Complaint'
        },
        {
          intent: 'feedback',
          threshold: '0.75',
          operator: 'has_intent',
          category: 'Feedback'
        }
      ]);
      await helper.testNode(
        {
          uuid: 'test-node-5',
          actions: [
            {
              uuid: 'call-classifier-uuid-5',
              type: 'call_classifier',
              classifier: {
                uuid: 'classifier-support',
                name: 'Support Classifier'
              },
              input: '@input.text'
            } as any
          ],
          router: manyIntentsRouter.router,
          exits: manyIntentsRouter.exits
        } as Node,
        { type: 'split_by_intent' },
        'many-intents'
      );
    });
  });

  describe('round-trip conversion validation', () => {
    it('converts to form data correctly', () => {
      const testRouter = createIntentRouter([
        {
          intent: 'book_flight',
          threshold: '0.9',
          operator: 'has_intent',
          category: 'Flight'
        },
        {
          intent: 'book_hotel',
          threshold: '0.8',
          operator: 'has_intent',
          category: 'Hotel'
        }
      ]);
      const node: Node = {
        uuid: 'test-node',
        actions: [
          {
            uuid: 'call-classifier-uuid',
            type: 'call_classifier',
            classifier: {
              uuid: 'classifier-123',
              name: 'Booking Classifier'
            },
            input: '@input.text'
          } as any
        ],
        router: testRouter.router,
        exits: testRouter.exits
      };

      const formData = split_by_intent.toFormData!(node);

      expect(formData.uuid).to.equal('test-node');
      expect(formData.classifier).to.deep.equal([
        { value: 'classifier-123', name: 'Booking Classifier' }
      ]);
      expect(formData.input).to.equal('@input.text');
      expect(formData.rules).to.have.length(2);
      expect(formData.rules[0].intent).to.deep.equal([
        { value: 'book_flight', name: 'book_flight' }
      ]);
      expect(formData.rules[0].threshold).to.equal('0.9');
      expect(formData.rules[0].category).to.equal('Flight');
    });

    it('converts from form data correctly', () => {
      const formData = {
        uuid: 'test-node',
        classifier: [{ value: 'classifier-456', name: 'Support Classifier' }],
        input: '@contact.name',
        rules: [
          {
            operator: { value: 'has_intent', name: 'has intent' },
            intent: [{ value: 'greeting', name: 'greeting' }],
            threshold: '0.85',
            category: 'Greeting'
          },
          {
            operator: { value: 'has_top_intent', name: 'has top intent' },
            intent: [{ value: 'help', name: 'help' }],
            threshold: '0.9',
            category: 'Help'
          }
        ]
      };

      const originalNode: Node = {
        uuid: 'test-node',
        actions: [],
        exits: []
      };

      const result = split_by_intent.fromFormData!(formData, originalNode);

      expect(result.uuid).to.equal('test-node');
      expect(result.actions).to.have.length(1);
      expect(result.actions[0].type).to.equal('call_classifier');
      expect((result.actions[0] as any).classifier.uuid).to.equal(
        'classifier-456'
      );
      expect((result.actions[0] as any).classifier.name).to.equal(
        'Support Classifier'
      );
      expect((result.actions[0] as any).input).to.equal('@contact.name');

      // Should have user categories plus Other
      expect(result.router!.categories).to.have.length(3);
      const categoryNames = result.router!.categories.map((cat) => cat.name);
      expect(categoryNames).to.include.members(['Greeting', 'Help', 'Other']);

      // Should have corresponding exits
      expect(result.exits).to.have.length(3);

      // Verify cases have correct arguments
      const greetingCase = result.router!.cases.find(
        (c) => c.arguments[0] === 'greeting'
      );
      expect(greetingCase).to.exist;
      expect(greetingCase!.type).to.equal('has_intent');
      expect(greetingCase!.arguments).to.deep.equal(['greeting', '0.85']);
    });

    it('defaults input to @input.text when empty', () => {
      const formData = {
        uuid: 'test-node',
        classifier: [{ value: 'classifier-123', name: 'Test Classifier' }],
        input: '',
        rules: [
          {
            operator: { value: 'has_intent', name: 'has intent' },
            intent: [{ value: 'test', name: 'test' }],
            threshold: '0.9',
            category: 'Test'
          }
        ]
      };

      const originalNode: Node = {
        uuid: 'test-node',
        actions: [],
        exits: []
      };

      const result = split_by_intent.fromFormData!(formData, originalNode);
      expect((result.actions[0] as any).input).to.equal('@input.text');
    });

    it('defaults threshold to 0.9 when not provided', () => {
      const formData = {
        uuid: 'test-node',
        classifier: [{ value: 'classifier-123', name: 'Test Classifier' }],
        input: '@input.text',
        rules: [
          {
            operator: { value: 'has_intent', name: 'has intent' },
            intent: [{ value: 'test', name: 'test' }],
            threshold: '', // empty threshold
            category: 'Test'
          }
        ]
      };

      const originalNode: Node = {
        uuid: 'test-node',
        actions: [],
        exits: []
      };

      const result = split_by_intent.fromFormData!(formData, originalNode);

      const testCase = result.router!.cases[0];
      expect(testCase.arguments[1]).to.equal('0.9');
    });
  });

  describe('validation', () => {
    it('should require a classifier', () => {
      const formData = {
        uuid: 'test-node',
        classifier: [],
        input: '@input.text',
        rules: []
      };

      const validationResult = split_by_intent.validate!(formData);

      expect(validationResult.valid).to.be.false;
      expect(validationResult.errors.classifier).to.equal(
        'A classifier is required'
      );
    });

    it('should validate threshold is a number', () => {
      const formData = {
        uuid: 'test-node',
        classifier: [{ value: 'classifier-123', name: 'Test Classifier' }],
        input: '@input.text',
        rules: [
          {
            operator: { value: 'has_intent', name: 'has intent' },
            intent: [{ value: 'test', name: 'test' }],
            threshold: 'not-a-number',
            category: 'Test'
          }
        ]
      };

      const validationResult = split_by_intent.validate!(formData);

      expect(validationResult.valid).to.be.false;
      expect(validationResult.errors.rules).to.include(
        'Invalid threshold in rule 1'
      );
    });

    it('should validate threshold is between 0 and 1', () => {
      const formData = {
        uuid: 'test-node',
        classifier: [{ value: 'classifier-123', name: 'Test Classifier' }],
        input: '@input.text',
        rules: [
          {
            operator: { value: 'has_intent', name: 'has intent' },
            intent: [{ value: 'test', name: 'test' }],
            threshold: '1.5',
            category: 'Test'
          }
        ]
      };

      const validationResult = split_by_intent.validate!(formData);

      expect(validationResult.valid).to.be.false;
      expect(validationResult.errors.rules).to.include(
        'Invalid threshold in rule 1'
      );
    });

    it('should pass validation with valid data', () => {
      const formData = {
        uuid: 'test-node',
        classifier: [{ value: 'classifier-123', name: 'Test Classifier' }],
        input: '@input.text',
        rules: [
          {
            operator: { value: 'has_intent', name: 'has intent' },
            intent: [{ value: 'test', name: 'test' }],
            threshold: '0.9',
            category: 'Test'
          }
        ]
      };

      const validationResult = split_by_intent.validate!(formData);

      expect(validationResult.valid).to.be.true;
      expect(Object.keys(validationResult.errors)).to.have.length(0);
    });

    it('should allow threshold of 0', () => {
      const formData = {
        uuid: 'test-node',
        classifier: [{ value: 'classifier-123', name: 'Test Classifier' }],
        input: '@input.text',
        rules: [
          {
            operator: { value: 'has_intent', name: 'has intent' },
            intent: [{ value: 'test', name: 'test' }],
            threshold: '0',
            category: 'Test'
          }
        ]
      };

      const validationResult = split_by_intent.validate!(formData);

      expect(validationResult.valid).to.be.true;
    });

    it('should allow threshold of 1', () => {
      const formData = {
        uuid: 'test-node',
        classifier: [{ value: 'classifier-123', name: 'Test Classifier' }],
        input: '@input.text',
        rules: [
          {
            operator: { value: 'has_intent', name: 'has intent' },
            intent: [{ value: 'test', name: 'test' }],
            threshold: '1',
            category: 'Test'
          }
        ]
      };

      const validationResult = split_by_intent.validate!(formData);

      expect(validationResult.valid).to.be.true;
    });
  });

  describe('edge cases', () => {
    it('handles empty rules correctly', () => {
      const formData = {
        uuid: 'test-node',
        classifier: [{ value: 'classifier-123', name: 'Test Classifier' }],
        input: '@input.text',
        rules: []
      };

      const originalNode: Node = {
        uuid: 'test-node',
        actions: [],
        exits: []
      };

      const result = split_by_intent.fromFormData!(formData, originalNode);

      // Should have only default category (named "All Responses" when no rules)
      expect(result.router!.categories).to.have.length(1);
      expect(result.router!.categories[0].name).to.equal('All Responses');
    });

    it('preserves original node UUID', () => {
      const formData = {
        uuid: 'should-be-ignored',
        classifier: [{ value: 'classifier-123', name: 'Test Classifier' }],
        input: '@input.text',
        rules: []
      };

      const originalNode: Node = {
        uuid: 'original-node-uuid',
        actions: [],
        exits: []
      };

      const result = split_by_intent.fromFormData!(formData, originalNode);

      expect(result.uuid).to.equal('original-node-uuid');
    });

    it('roundtrip conversion works correctly', () => {
      const originalFormData = {
        uuid: 'test-node-uuid',
        classifier: [{ value: 'classifier-123', name: 'Test Classifier' }],
        input: '@custom.input',
        rules: [
          {
            operator: { value: 'has_intent', name: 'has intent' },
            intent: [{ value: 'greeting', name: 'greeting' }],
            threshold: '0.85',
            category: 'Greeting'
          }
        ]
      };

      const originalNode: Node = {
        uuid: 'test-node-uuid',
        actions: [],
        exits: []
      };

      // Convert form data to node
      const node = split_by_intent.fromFormData!(
        originalFormData,
        originalNode
      );

      // Convert back to form data
      const recoveredFormData = split_by_intent.toFormData!(node);

      // Should match original data
      expect(recoveredFormData.uuid).to.equal(originalFormData.uuid);
      expect(recoveredFormData.classifier).to.deep.equal(
        originalFormData.classifier
      );
      expect(recoveredFormData.input).to.equal(originalFormData.input);
      expect(recoveredFormData.rules).to.have.length(1);
      expect(recoveredFormData.rules[0].category).to.equal('Greeting');
      expect(recoveredFormData.rules[0].threshold).to.equal('0.85');
    });
  });
});
