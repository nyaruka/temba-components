import { expect } from '@open-wc/testing';
import { split_by_llm_categorize } from '../src/flow/nodes/split_by_llm_categorize';
import { Node } from '../src/store/flow-definition';

describe('split_by_llm_categorize edge cases and validation', () => {
  it('handles categories with empty names correctly', () => {
    const formData = {
      uuid: 'test-node-uuid',
      llm: [{ value: 'llm-uuid-123', name: 'Claude' }],
      input: '@input',
      categories: [
        { name: 'Valid Category' },
        { name: '' }, // empty name
        { name: '   ' }, // only whitespace
        { name: 'Another Valid' }
      ],
      result_name: 'Intent'
    };

    const originalNode: Node = {
      uuid: 'test-node-uuid',
      actions: [],
      exits: []
    };

    const result = split_by_llm_categorize.fromFormData!(
      formData,
      originalNode
    );

    // Should only include non-empty categories
    const userCategories = result.router!.categories.filter(
      (cat) => cat.name !== 'Other' && cat.name !== 'Failure'
    );
    expect(userCategories).to.have.length(2);
    expect(userCategories.map((cat) => cat.name)).to.deep.equal([
      'Valid Category',
      'Another Valid'
    ]);
  });

  it('handles categories with special characters', () => {
    const formData = {
      uuid: 'test-node-uuid',
      llm: [{ value: 'llm-uuid-123', name: 'Claude' }],
      input: '@input',
      categories: [
        { name: 'Category-1' },
        { name: 'Category_2' },
        { name: 'Category@3' },
        { name: 'Category with spaces' }
      ],
      result_name: 'Intent'
    };

    const originalNode: Node = {
      uuid: 'test-node-uuid',
      actions: [],
      exits: []
    };

    const result = split_by_llm_categorize.fromFormData!(
      formData,
      originalNode
    );

    // Should preserve all special characters in category names
    const userCategories = result.router!.categories.filter(
      (cat) => cat.name !== 'Other' && cat.name !== 'Failure'
    );
    expect(userCategories).to.have.length(4);
    expect(userCategories.map((cat) => cat.name)).to.include.members([
      'Category-1',
      'Category_2',
      'Category@3',
      'Category with spaces'
    ]);

    // Verify cases also have correct names
    const caseNames = result
      .router!.cases.filter((c) => c.arguments[0] !== '<ERROR>')
      .map((c) => c.arguments[0]);
    expect(caseNames).to.include.members([
      'Category-1',
      'Category_2',
      'Category@3',
      'Category with spaces'
    ]);
  });

  it('maintains UUID consistency between categories, cases, and exits', () => {
    const formData = {
      uuid: 'test-node-uuid',
      llm: [{ value: 'llm-uuid-123', name: 'Claude' }],
      input: '@input',
      categories: [{ name: 'Test Category' }],
      result_name: 'Intent'
    };

    const originalNode: Node = {
      uuid: 'test-node-uuid',
      actions: [],
      exits: []
    };

    const result = split_by_llm_categorize.fromFormData!(
      formData,
      originalNode
    );

    // Find the test category
    const testCategory = result.router!.categories.find(
      (cat) => cat.name === 'Test Category'
    );
    const testCase = result.router!.cases.find(
      (c) => c.arguments[0] === 'Test Category'
    );
    const testExit = result.exits.find(
      (exit) => exit.uuid === testCategory!.exit_uuid
    );

    // Verify UUID consistency
    expect(testCase!.category_uuid).to.equal(testCategory!.uuid);
    expect(testExit!.uuid).to.equal(testCategory!.exit_uuid);
  });

  it('generates unique UUIDs for each run', () => {
    const formData = {
      uuid: 'test-node-uuid',
      llm: [{ value: 'llm-uuid-123', name: 'Claude' }],
      input: '@input',
      categories: [{ name: 'Test' }],
      result_name: 'Intent'
    };

    const originalNode: Node = {
      uuid: 'test-node-uuid',
      actions: [],
      exits: []
    };

    const result1 = split_by_llm_categorize.fromFormData!(
      formData,
      originalNode
    );
    const result2 = split_by_llm_categorize.fromFormData!(
      formData,
      originalNode
    );

    // UUIDs should be different for each generation
    expect(result1.actions[0].uuid).to.not.equal(result2.actions[0].uuid);
    expect(result1.router!.categories[0].uuid).to.not.equal(
      result2.router!.categories[0].uuid
    );
    expect(result1.exits[0].uuid).to.not.equal(result2.exits[0].uuid);
  });

  it('roundtrip conversion (fromFormData -> toFormData) works correctly', () => {
    const originalFormData = {
      uuid: 'test-node-uuid',
      llm: [{ value: 'llm-uuid-123', name: 'Claude' }],
      input: '@custom.input',
      categories: [{ name: 'Category1' }, { name: 'Category2' }],
      result_name: 'CustomResult'
    };

    const originalNode: Node = {
      uuid: 'test-node-uuid',
      actions: [],
      exits: []
    };

    // Convert form data to node
    const node = split_by_llm_categorize.fromFormData!(
      originalFormData,
      originalNode
    );

    // Convert back to form data
    const recoveredFormData = split_by_llm_categorize.toFormData!(node);

    // Should match original data
    expect(recoveredFormData.uuid).to.equal(originalFormData.uuid);
    expect(recoveredFormData.llm).to.deep.equal(originalFormData.llm);
    expect(recoveredFormData.input).to.equal(originalFormData.input);
    expect(recoveredFormData.categories).to.deep.equal(
      originalFormData.categories
    );
  });

  it('handles max 10 categories requirement', () => {
    // Create 12 categories to test the limit
    const categories = Array.from({ length: 12 }, (_, i) => ({
      name: `Category${i + 1}`
    }));

    const formData = {
      uuid: 'test-node-uuid',
      llm: [{ value: 'llm-uuid-123', name: 'Claude' }],
      input: '@input',
      categories: categories,
      result_name: 'Intent'
    };

    const originalNode: Node = {
      uuid: 'test-node-uuid',
      actions: [],
      exits: []
    };

    const result = split_by_llm_categorize.fromFormData!(
      formData,
      originalNode
    );

    // Should process all categories provided (fromFormData doesn't enforce the limit, validation should)
    const userCategories = result.router!.categories.filter(
      (cat) => cat.name !== 'Other' && cat.name !== 'Failure'
    );
    expect(userCategories).to.have.length(12);

    // Note: The actual 10-category limit should be enforced by the UI validation
    // which uses the maxItems: 10 property in the form configuration
  });

  it('preserves original node UUID', () => {
    const formData = {
      uuid: 'should-be-ignored',
      llm: [{ value: 'llm-uuid-123', name: 'Claude' }],
      input: '@input',
      categories: [{ name: 'Test' }],
      result_name: 'Intent'
    };

    const originalNode: Node = {
      uuid: 'original-node-uuid',
      actions: [],
      exits: []
    };

    const result = split_by_llm_categorize.fromFormData!(
      formData,
      originalNode
    );

    // Should use original node UUID, not the one from form data
    expect(result.uuid).to.equal('original-node-uuid');
  });
});
