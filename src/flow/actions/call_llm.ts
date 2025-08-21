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
      label: 'AI Model',
      options: [],
      endpoint: '/test-assets/select/llms.json',
      searchable: true,
      valueKey: 'uuid',
      nameKey: 'name'
    },
    input: {
      type: 'text',
      required: true,
      label: 'The input the AI will process',
      evaluated: true,
      placeholder: '@input'
    },
    instructions: {
      type: 'textarea',
      required: true,
      label: 'Tell the AI what to do with the input',
      evaluated: true,
      placeholder: 'Enter instructions for the AI model...',
      minHeight: 130
    }
  },
  layout: ['llm', 'input', 'instructions'],
  toFormData: (action: CallLLM) => {
    return {
      uuid: action.uuid,
      llm: action.llm
        ? [{ value: action.llm.uuid, name: action.llm.name }]
        : [],
      input: action.input || '@input',
      instructions: action.instructions || ''
    };
  },
  fromFormData: (data: Record<string, any>) => {
    const llmSelection =
      Array.isArray(data.llm) && data.llm.length > 0 ? data.llm[0] : null;
    return {
      uuid: data.uuid,
      type: 'call_llm',
      input: data.input || '@input',
      llm: llmSelection
        ? { uuid: llmSelection.value, name: llmSelection.name }
        : { uuid: '', name: '' },
      instructions: data.instructions || ''
    } as CallLLM;
  }
};
