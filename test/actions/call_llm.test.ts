import { expect } from '@open-wc/testing';
import { call_llm } from '../../src/flow/actions/call_llm';
import { CallLLM } from '../../src/store/flow-definition';
import { ActionTest } from '../ActionHelper';

/**
 * Test suite for the call_llm action configuration.
 */
describe('call_llm action config', () => {
  const helper = new ActionTest(call_llm, 'call_llm');

  describe('basic properties', () => {
    helper.testBasicProperties();

    it('has correct name', () => {
      expect(call_llm.name).to.equal('Call AI');
    });

    it('has form configuration', () => {
      expect(call_llm.form).to.exist;
      expect(call_llm.form.llm).to.exist;
      expect(call_llm.form.instructions).to.exist;
      expect(call_llm.form.input).to.exist;
    });

    it('has layout configuration', () => {
      expect(call_llm.layout).to.exist;
      expect(call_llm.layout).to.deep.equal(['llm', 'input', 'instructions']);
    });

    it('has data transformation functions', () => {
      expect(call_llm.toFormData).to.be.a('function');
      expect(call_llm.fromFormData).to.be.a('function');
    });
  });

  describe('data transformations', () => {
    it('converts action to form data correctly', () => {
      const action: CallLLM = {
        uuid: 'test-llm-1',
        type: 'call_llm',
        input: '@input',
        llm: { uuid: 'gpt-4', name: 'GPT 4.1' },
        instructions: 'Translate to French',
        result_name: 'translated_text'
      };

      const formData = call_llm.toFormData(action);

      expect(formData.uuid).to.equal('test-llm-1');
      expect(formData.llm).to.deep.equal([{ value: 'gpt-4', name: 'GPT 4.1' }]);
      expect(formData.instructions).to.equal('Translate to French');
      expect(formData.input).to.equal('@input');
    });

    it('converts form data to action correctly', () => {
      const formData = {
        uuid: 'test-llm-2',
        llm: [{ value: 'gpt-5', name: 'GPT 5' }],
        instructions: 'Summarize the following text',
        input: '@input'
      };

      const action = call_llm.fromFormData(formData) as CallLLM;

      expect(action.uuid).to.equal('test-llm-2');
      expect(action.type).to.equal('call_llm');
      expect(action.llm).to.deep.equal({ uuid: 'gpt-5', name: 'GPT 5' });
      expect(action.instructions).to.equal('Summarize the following text');
      expect(action.input).to.equal('@input');
    });

    it('handles empty form data', () => {
      const formData = {
        uuid: 'test-llm-3',
        llm: [],
        instructions: '',
        input: ''
      };

      const action = call_llm.fromFormData(formData) as CallLLM;

      expect(action.llm).to.deep.equal({ uuid: '', name: '' });
      expect(action.instructions).to.equal('');
      expect(action.input).to.equal('@input');
    });
  });

  describe('action scenarios', () => {
    helper.testAction(
      {
        uuid: 'test-action-1',
        type: 'call_llm',
        llm: { uuid: 'gpt-4', name: 'GPT 4.1' },
        instructions: 'Translate to French',
        input: '@input'
      } as CallLLM,
      'translation-task'
    );

    helper.testAction(
      {
        uuid: 'test-action-2',
        type: 'call_llm',
        llm: { uuid: 'gpt-5', name: 'GPT 5' },
        instructions:
          'Analyze the sentiment of the following message and classify it as positive, negative, or neutral. Provide a brief explanation for your classification.',
        input: '@input'
      } as CallLLM,
      'sentiment-analysis'
    );

    helper.testAction(
      {
        uuid: 'test-action-3',
        type: 'call_llm',
        llm: { uuid: 'gpt-4', name: 'GPT 4.1' },
        instructions:
          'Summarize the key points from the conversation above in bullet format.',
        input: '@input'
      } as CallLLM,
      'summarization'
    );

    helper.testAction(
      {
        uuid: 'test-action-4',
        type: 'call_llm',
        llm: { uuid: 'gpt-5', name: 'GPT 5' },
        instructions:
          'Extract any contact information (phone numbers, email addresses) from the text and format them as a JSON object.',
        input: '@input'
      } as CallLLM,
      'information-extraction'
    );
  });
});
