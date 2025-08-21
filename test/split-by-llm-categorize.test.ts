import { assert, expect } from '@open-wc/testing';
import { split_by_llm_categorize } from '../src/flow/nodes/split_by_llm_categorize';
import { Node } from '../src/store/flow-definition';

describe('split_by_llm_categorize', () => {
  it('has correct basic configuration', () => {
    expect(split_by_llm_categorize.type).to.equal('split_by_llm_categorize');
    expect(split_by_llm_categorize.name).to.equal('Split by AI Categorize');
    expect(split_by_llm_categorize.properties).to.exist;
  });

  it('has required properties defined', () => {
    const properties = split_by_llm_categorize.properties!;
    expect(properties.llm).to.exist;
    expect(properties.input).to.exist;
    expect(properties.categories).to.exist;
    expect(properties.result_name).to.exist;
    
    // Check required fields
    expect(properties.llm.required).to.be.true;
    expect(properties.input.required).to.be.true;
    expect(properties.categories.required).to.be.true;
  });

  it('generates correct node structure with fromFormData', () => {
    const formData = {
      uuid: 'test-node-uuid',
      llm: [{ value: 'llm-uuid-123', name: 'Claude' }],
      input: '@input',
      categories: [
        { name: 'Flights' },
        { name: 'Hotels' }
      ],
      result_name: 'Intent'
    };

    const originalNode: Node = {
      uuid: 'test-node-uuid',
      actions: [],
      exits: []
    };

    const result = split_by_llm_categorize.fromFormData!(formData, originalNode);

    // Check basic structure
    expect(result.uuid).to.equal('test-node-uuid');
    expect(result.actions).to.have.length(1);
    expect(result.router).to.exist;
    expect(result.exits).to.have.length(4); // 2 user categories + Other + Failure

    // Check call_llm action
    const callLlmAction = result.actions[0] as any;
    expect(callLlmAction.type).to.equal('call_llm');
    expect(callLlmAction.llm.uuid).to.equal('llm-uuid-123');
    expect(callLlmAction.llm.name).to.equal('Claude');
    expect(callLlmAction.input).to.equal('@input');
    expect(callLlmAction.instructions).to.equal('@(prompt("categorize", slice(node.categories, 0, -2)))');
    expect(callLlmAction.output_local).to.equal('_llm_output');

    // Check router
    const router = result.router!;
    expect(router.type).to.equal('switch');
    expect(router.operand).to.equal('@locals._llm_output');
    expect(router.result_name).to.equal('Intent');
    expect(router.categories).to.have.length(4);
    expect(router.cases).to.have.length(3); // 2 user categories + failure case

    // Check categories
    const categoryNames = router.categories.map(cat => cat.name);
    expect(categoryNames).to.include('Flights');
    expect(categoryNames).to.include('Hotels');
    expect(categoryNames).to.include('Other');
    expect(categoryNames).to.include('Failure');

    // Check default category is "Other"
    const otherCategory = router.categories.find(cat => cat.name === 'Other');
    expect(router.default_category_uuid).to.equal(otherCategory!.uuid);

    // Check cases
    const flightCase = router.cases.find(c => c.arguments[0] === 'Flights');
    const hotelCase = router.cases.find(c => c.arguments[0] === 'Hotels');
    const errorCase = router.cases.find(c => c.arguments[0] === '<ERROR>');

    expect(flightCase).to.exist;
    expect(flightCase!.type).to.equal('has_only_text');
    expect(hotelCase).to.exist;
    expect(hotelCase!.type).to.equal('has_only_text');
    expect(errorCase).to.exist;
    expect(errorCase!.type).to.equal('has_only_text');
  });

  it('extracts form data correctly with toFormData', () => {
    const node: Node = {
      uuid: 'test-node-uuid',
      actions: [{
        type: 'call_llm',
        uuid: 'action-uuid',
        llm: { uuid: 'llm-uuid-123', name: 'Claude' },
        instructions: '@(prompt("categorize", slice(node.categories, 0, -2)))',
        input: '@input',
        result_name: 'Intent'
      } as any],
      exits: [],
      router: {
        type: 'switch',
        result_name: 'Intent',
        categories: [
          { uuid: 'cat1', name: 'Flights', exit_uuid: 'exit1' },
          { uuid: 'cat2', name: 'Hotels', exit_uuid: 'exit2' },
          { uuid: 'cat3', name: 'Other', exit_uuid: 'exit3' },
          { uuid: 'cat4', name: 'Failure', exit_uuid: 'exit4' }
        ]
      }
    };

    const formData = split_by_llm_categorize.toFormData!(node);

    expect(formData.uuid).to.equal('test-node-uuid');
    expect(formData.llm).to.have.length(1);
    expect(formData.llm[0].value).to.equal('llm-uuid-123');
    expect(formData.llm[0].name).to.equal('Claude');
    expect(formData.input).to.equal('@input');
    expect(formData.result_name).to.equal('Intent');
    expect(formData.categories).to.have.length(2);
    expect(formData.categories.map((c: any) => c.name)).to.deep.equal(['Flights', 'Hotels']);
  });

  it('handles empty categories correctly', () => {
    const formData = {
      uuid: 'test-node-uuid',
      llm: [{ value: 'llm-uuid-123', name: 'Claude' }],
      input: '@input',
      categories: [],
      result_name: 'Intent'
    };

    const originalNode: Node = {
      uuid: 'test-node-uuid',
      actions: [],
      exits: []
    };

    const result = split_by_llm_categorize.fromFormData!(formData, originalNode);

    expect(result.router!.categories).to.have.length(2); // Only Other + Failure
    expect(result.router!.cases).to.have.length(1); // Only failure case
    expect(result.exits).to.have.length(2); // Only Other + Failure exits
  });

  it('handles missing LLM selection', () => {
    const formData = {
      uuid: 'test-node-uuid',
      llm: [],
      input: '@input',
      categories: [{ name: 'Test' }],
      result_name: 'Intent'
    };

    const originalNode: Node = {
      uuid: 'test-node-uuid',
      actions: [],
      exits: []
    };

    const result = split_by_llm_categorize.fromFormData!(formData, originalNode);
    const callLlmAction = result.actions[0] as any;

    expect(callLlmAction.llm.uuid).to.equal('');
    expect(callLlmAction.llm.name).to.equal('');
  });

  it('uses default values correctly', () => {
    const formData = {
      uuid: 'test-node-uuid',
      llm: [{ value: 'llm-uuid-123', name: 'Claude' }],
      categories: [{ name: 'Test' }]
    };

    const originalNode: Node = {
      uuid: 'test-node-uuid',
      actions: [],
      exits: []
    };

    const result = split_by_llm_categorize.fromFormData!(formData, originalNode);
    const callLlmAction = result.actions[0] as any;

    expect(callLlmAction.input).to.equal('@input');
    expect(result.router!.result_name).to.equal('Intent');
  });
});