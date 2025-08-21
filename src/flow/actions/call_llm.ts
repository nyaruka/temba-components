import { html } from 'lit-html';
import { ActionConfig, COLORS } from '../types';
import { Node, CallLLM } from '../../store/flow-definition';

export const call_llm: ActionConfig = {
  name: 'Call AI',
  color: COLORS.call,
  render: (_node: Node, action: CallLLM) => {
    return html`<div
      style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto; max-width: 180px; max-height: 100px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical;"
    >
      ${action.instructions}
    </div>`;
  },
  form: {
    llm: {
      type: 'select',
      required: true,
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
      minHeight: 130,
      helpText: 'The result can be referenced as **`@locals._llm_output`**'
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
