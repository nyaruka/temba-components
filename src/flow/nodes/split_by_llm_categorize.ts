import { COLORS, NodeConfig } from '../types';
import { CallLLM, Node } from '../../store/flow-definition';
import { generateUUID, createMultiCategoryRouter } from '../../utils';
import { html } from 'lit';

export const split_by_llm_categorize: NodeConfig = {
  type: 'split_by_llm_categorize',
  name: 'Split by AI',
  color: COLORS.call,
  form: {
    llm: {
      type: 'select',
      label: 'LLM',
      helpText: 'Select the LLM to use for categorization',
      required: true,
      endpoint: '/test-assets/select/llms.json',
      valueKey: 'uuid',
      nameKey: 'name',
      placeholder: 'Select an LLM...'
    },
    input: {
      type: 'text',
      label: 'Input',
      helpText: 'The input to categorize (usually @input)',
      required: true,
      evaluated: true,
      placeholder: '@input'
    },
    categories: {
      type: 'array',
      label: 'Categories',
      helpText: 'Define the categories for classification',
      required: true,
      itemLabel: 'Category',
      minItems: 1,
      maxItems: 10,
      isEmptyItem: (item: any) => {
        return !item.name || item.name.trim() === '';
      },
      itemConfig: {
        name: {
          type: 'text',
          placeholder: 'Category name',
          required: true
        }
      }
    }
  },
  layout: ['llm', 'input', 'categories'],
  validate: (formData: any) => {
    const errors: { [key: string]: string } = {};

    // Check for duplicate category names
    if (formData.categories && Array.isArray(formData.categories)) {
      const categories = formData.categories.filter(
        (item: any) => item?.name && item.name.trim() !== ''
      );

      // Find all categories that have duplicates (case-insensitive)
      const duplicateCategories = [];
      const lowerCaseMap = new Map();

      // First pass: map lowercase names to all original cases
      categories.forEach((category) => {
        const lowerName = category.name.trim().toLowerCase();
        if (!lowerCaseMap.has(lowerName)) {
          lowerCaseMap.set(lowerName, []);
        }
        lowerCaseMap.get(lowerName).push(category.name.trim());
      });

      // Second pass: collect all names that appear more than once
      lowerCaseMap.forEach((originalNames) => {
        if (originalNames.length > 1) {
          duplicateCategories.push(...originalNames);
        }
      });

      if (duplicateCategories.length > 0) {
        const uniqueDuplicates = [...new Set(duplicateCategories)];
        errors.categories = `Duplicate category names found: ${uniqueDuplicates.join(
          ', '
        )}`;
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  },
  render: (node: Node) => {
    const callLlmAction = node.actions?.find(
      (action) => action.type === 'call_llm'
    ) as CallLLM;
    return html`
      <div class="body">Categorize with ${callLlmAction.llm.name}</div>
    `;
  },
  toFormData: (node: Node) => {
    // Extract data from the existing node structure
    const callLlmAction = node.actions?.find(
      (action) => action.type === 'call_llm'
    ) as any;
    const categories =
      node.router?.categories
        ?.filter((cat) => cat.name !== 'Other' && cat.name !== 'Failure')
        .map((cat) => ({ name: cat.name })) || [];

    return {
      uuid: node.uuid,
      llm: callLlmAction?.llm
        ? [{ value: callLlmAction.llm.uuid, name: callLlmAction.llm.name }]
        : [],
      input: callLlmAction?.input || '@input',
      categories: categories
    };
  },
  fromFormData: (formData: any, originalNode: Node): Node => {
    // Get LLM selection
    const llmSelection =
      Array.isArray(formData.llm) && formData.llm.length > 0
        ? formData.llm[0]
        : null;

    // Get user categories
    const userCategories = (formData.categories || [])
      .filter((item: any) => item?.name?.trim())
      .map((item: any) => item.name.trim());

    // Find existing call_llm action to preserve its UUID
    const existingCallLlmAction = originalNode.actions?.find(
      (action) => action.type === 'call_llm'
    );
    const callLlmUuid = existingCallLlmAction?.uuid || generateUUID();

    // Create call_llm action (using any type to match the example format)
    const callLlmAction: CallLLM = {
      type: 'call_llm',
      uuid: callLlmUuid,
      llm: llmSelection
        ? { uuid: llmSelection.value, name: llmSelection.name }
        : { uuid: '', name: '' },
      instructions: `@(prompt("categorize", slice(node.categories, 0, -2)))`,
      input: formData.input || '@input',
      output_local: '_llm_output'
    };

    // Create categories and exits
    const existingCategories = originalNode.router?.categories || [];
    const existingExits = originalNode.exits || [];
    const existingCases = originalNode.router?.cases || [];

    const { router, exits } = createMultiCategoryRouter(
      '@locals._llm_output',
      userCategories,
      (categoryName) => ({
        type: 'has_only_text',
        arguments: [categoryName]
      }),
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
