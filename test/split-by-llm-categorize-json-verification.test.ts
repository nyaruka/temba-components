import { expect } from '@open-wc/testing';
import { split_by_llm_categorize } from '../src/flow/nodes/split_by_llm_categorize';
import { Node } from '../src/store/flow-definition';

describe('split_by_llm_categorize JSON output verification', () => {
  it('generates JSON matching the exact format from the issue', () => {
    const formData = {
      uuid: '145eb3d3-b841-4e66-abac-297ae525c7ad',
      llm: [{ value: '1c06c884-39dd-4ce4-ad9f-9a01cbe6c000', name: 'Claude' }],
      input: '@input',
      categories: [{ name: 'Flights' }, { name: 'Hotels' }],
      result_name: 'Intent'
    };

    const originalNode: Node = {
      uuid: '145eb3d3-b841-4e66-abac-297ae525c7ad',
      actions: [],
      exits: []
    };

    const result = split_by_llm_categorize.fromFormData!(
      formData,
      originalNode
    );

    // Verify the call_llm action
    const callLlmAction = result.actions[0] as any;
    expect(callLlmAction.type).to.equal('call_llm');
    expect(callLlmAction.llm.uuid).to.equal(
      '1c06c884-39dd-4ce4-ad9f-9a01cbe6c000'
    );
    expect(callLlmAction.llm.name).to.equal('Claude');
    expect(callLlmAction.instructions).to.equal(
      '@(prompt("categorize", slice(node.categories, 0, -2)))'
    );
    expect(callLlmAction.input).to.equal('@input');
    expect(callLlmAction.output_local).to.equal('_llm_output');

    // Verify the router structure
    const router = result.router!;
    expect(router.type).to.equal('switch');
    expect(router.operand).to.equal('@locals._llm_output');

    // Verify categories structure
    expect(router.categories).to.have.length(4);
    const categoryNames = router.categories.map((cat) => cat.name);
    expect(categoryNames).to.include.members([
      'Flights',
      'Hotels',
      'Other',
      'Failure'
    ]);

    // Verify cases structure
    expect(router.cases).to.have.length(3);
    const caseArguments = router.cases.map((c) => c.arguments[0]);
    expect(caseArguments).to.include.members(['Flights', 'Hotels', '<ERROR>']);

    // Verify all cases use has_only_text
    router.cases.forEach((caseItem) => {
      expect(caseItem.type).to.equal('has_only_text');
    });

    // Verify exits match categories
    expect(result.exits).to.have.length(4);
    router.categories.forEach((category) => {
      const matchingExit = result.exits.find(
        (exit) => exit.uuid === category.exit_uuid
      );
      expect(matchingExit).to.exist;
    });

    // Verify default category is "Other"
    const otherCategory = router.categories.find((cat) => cat.name === 'Other');
    expect(router.default_category_uuid).to.equal(otherCategory!.uuid);
  });
});
