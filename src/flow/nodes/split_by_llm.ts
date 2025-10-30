import { ACTION_GROUPS, FormData, NodeConfig } from '../types';
import { CallLLM, Node } from '../../store/flow-definition';
import { generateUUID, createSuccessFailureRouter } from '../../utils';
import { html } from 'lit';

export const split_by_llm: NodeConfig = {
  type: 'split_by_llm',
  name: 'Call AI',
  group: ACTION_GROUPS.services,
  showAsAction: true,
  render: (node: Node) => {
    const callLlmAction = node.actions?.find(
      (action) => action.type === 'call_llm'
    ) as CallLLM;
    return html`
      <div
        class="body"
        style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto; max-width: 180px; max-height: 6.2em; margin-bottom:10px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical;"
      >
        ${callLlmAction?.instructions || 'Configure AI instructions'}
      </div>
    `;
  },

  form: {
    llm: {
      type: 'select',
      label: 'LLM',
      required: true,
      options: [],
      endpoint: '/test-assets/select/llms.json',
      searchable: true,
      valueKey: 'uuid',
      nameKey: 'name',
      placeholder: 'Select an LLM...'
    },
    input: {
      type: 'text',
      label: 'Input',
      helpText: 'The input the AI will process',
      required: true,
      evaluated: true,
      placeholder: '@input'
    },
    instructions: {
      type: 'textarea',
      label: 'Instructions',
      helpText:
        'Tell the AI what to do with the input. The result can be referenced as **`@locals._llm_output`**',
      required: true,
      evaluated: true,
      placeholder: 'Enter instructions for the AI model...',
      minHeight: 130
    }
  },
  layout: ['llm', 'input', 'instructions'],
  toFormData: (node: Node) => {
    // Extract data from the existing node structure
    const callLlmAction = node.actions?.find(
      (action) => action.type === 'call_llm'
    ) as CallLLM;

    return {
      uuid: node.uuid,
      llm: callLlmAction?.llm
        ? [{ value: callLlmAction.llm.uuid, name: callLlmAction.llm.name }]
        : [],
      input: callLlmAction?.input || '@input',
      instructions: callLlmAction?.instructions || ''
    };
  },
  fromFormData: (formData: FormData, originalNode: Node): Node => {
    // Get LLM selection
    const llmSelection =
      Array.isArray(formData.llm) && formData.llm.length > 0
        ? formData.llm[0]
        : null;

    // Find existing call_llm action to preserve its UUID
    const existingCallLlmAction = originalNode.actions?.find(
      (action) => action.type === 'call_llm'
    );
    const callLlmUuid = existingCallLlmAction?.uuid || generateUUID();

    // Create call_llm action
    const callLlmAction: CallLLM = {
      type: 'call_llm',
      uuid: callLlmUuid,
      llm: llmSelection
        ? { uuid: llmSelection.value, name: llmSelection.name }
        : { uuid: '', name: '' },
      input: formData.input || '@input',
      instructions: formData.instructions || '',
      output_local: '_llm_output'
    };

    // Create categories and exits for Success and Failure
    const existingCategories = originalNode.router?.categories || [];
    const existingExits = originalNode.exits || [];
    const existingCases = originalNode.router?.cases || [];

    const { router, exits } = createSuccessFailureRouter(
      '@locals._llm_output',
      {
        type: 'has_text',
        arguments: []
      },
      existingCategories,
      existingExits,
      existingCases
    );

    // Return the complete node
    return {
      uuid: originalNode.uuid,
      actions: [callLlmAction],
      router: router,
      exits: exits
    };
  }
};
