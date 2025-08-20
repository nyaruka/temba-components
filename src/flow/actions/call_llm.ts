import { html } from 'lit-html';
import { ActionConfig, COLORS } from '../types';
import { Node, CallLLM } from '../../store/flow-definition';

export const call_llm: ActionConfig = {
  name: 'Call AI',
  color: COLORS.call,
  render: (_node: Node, action: CallLLM) => {
    const llmName = action.llm?.name || 'AI Service';
    return html`<div
      style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;"
    >
      ${llmName}
    </div>`;
  },
  form: {
    llm: {
      type: 'select',
      required: true,
      label: 'Call AI service',
      options: [],
      endpoint: '/test-assets/select/llms.json',
      searchable: true,
      valueKey: 'uuid',
      nameKey: 'name',
      helpText: 'Select the AI model to use for processing'
    },
    instructions: {
      type: 'textarea',
      required: true,
      label: 'Tell the AI what to do with the input',
      evaluated: true,
      placeholder: 'Enter instructions for the AI model...',
      rows: 8,
      helpText: 'Provide detailed instructions for how the AI should process the input'
    },
    result_name: {
      type: 'text',
      required: true,
      label: 'Result name',
      placeholder: 'llm_output',
      helpText: 'The name to use when saving the AI response - can be referenced as @results.{result_name}'
    }
  },
  layout: [
    'llm',
    'instructions', 
    'result_name'
  ],
  toFormData: (action: CallLLM) => {
    return {
      uuid: action.uuid,
      llm: action.llm ? [{ value: action.llm.uuid, name: action.llm.name }] : [],
      instructions: action.instructions || '',
      result_name: action.result_name || ''
    };
  },
  fromFormData: (data: Record<string, any>) => {
    const llmSelection = Array.isArray(data.llm) && data.llm.length > 0 ? data.llm[0] : null;
    return {
      uuid: data.uuid,
      type: 'call_llm',
      llm: llmSelection ? { uuid: llmSelection.value, name: llmSelection.name } : { uuid: '', name: '' },
      instructions: data.instructions || '',
      result_name: data.result_name || ''
    } as CallLLM;
  }
};
