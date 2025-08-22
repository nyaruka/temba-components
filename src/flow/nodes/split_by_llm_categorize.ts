import { COLORS, NodeConfig } from '../types';
import { Node } from '../../store/flow-definition';
import { generateUUID } from '../../utils';
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
    ) as any;
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
    const callLlmAction: any = {
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
    const categories = [];
    const exits = [];
    const cases = [];

    // Get existing categories from original node for UUID preservation
    const existingCategories = originalNode.router?.categories || [];
    const existingExits = originalNode.exits || [];
    const existingCases = originalNode.router?.cases || [];

    // Add user categories
    userCategories.forEach((categoryName: string) => {
      // Check if this category already exists
      const existingCategory = existingCategories.find(
        (cat) => cat.name === categoryName
      );
      const existingExit = existingCategory
        ? existingExits.find((exit) => exit.uuid === existingCategory.exit_uuid)
        : null;
      const existingCase = existingCategory
        ? existingCases.find(
            (case_) => case_.category_uuid === existingCategory.uuid
          )
        : null;

      // Use existing UUIDs if category name hasn't changed, otherwise generate new ones
      const categoryUuid = existingCategory?.uuid || generateUUID();
      const exitUuid = existingExit?.uuid || generateUUID();
      const caseUuid = existingCase?.uuid || generateUUID();

      categories.push({
        uuid: categoryUuid,
        name: categoryName,
        exit_uuid: exitUuid
      });

      exits.push({
        uuid: exitUuid,
        destination_uuid: existingExit?.destination_uuid || null
      });

      cases.push({
        uuid: caseUuid,
        type: 'has_only_text',
        arguments: [categoryName],
        category_uuid: categoryUuid
      });
    });

    // Add "Other" category (default)
    const existingOtherCategory = existingCategories.find(
      (cat) => cat.name === 'Other'
    );
    const existingOtherExit = existingOtherCategory
      ? existingExits.find(
          (exit) => exit.uuid === existingOtherCategory.exit_uuid
        )
      : null;

    const otherCategoryUuid = existingOtherCategory?.uuid || generateUUID();
    const otherExitUuid = existingOtherExit?.uuid || generateUUID();

    categories.push({
      uuid: otherCategoryUuid,
      name: 'Other',
      exit_uuid: otherExitUuid
    });
    exits.push({
      uuid: otherExitUuid,
      destination_uuid: existingOtherExit?.destination_uuid || null
    });

    // Add "Failure" category
    const existingFailureCategory = existingCategories.find(
      (cat) => cat.name === 'Failure'
    );
    const existingFailureExit = existingFailureCategory
      ? existingExits.find(
          (exit) => exit.uuid === existingFailureCategory.exit_uuid
        )
      : null;
    const existingFailureCase = existingFailureCategory
      ? existingCases.find(
          (case_) =>
            case_.category_uuid === existingFailureCategory.uuid &&
            case_.arguments?.[0] === '<ERROR>'
        )
      : null;

    const failureCategoryUuid = existingFailureCategory?.uuid || generateUUID();
    const failureExitUuid = existingFailureExit?.uuid || generateUUID();
    const failureCaseUuid = existingFailureCase?.uuid || generateUUID();

    categories.push({
      uuid: failureCategoryUuid,
      name: 'Failure',
      exit_uuid: failureExitUuid
    });
    exits.push({
      uuid: failureExitUuid,
      destination_uuid: existingFailureExit?.destination_uuid || null
    });

    // Add failure case for <ERROR>
    cases.push({
      uuid: failureCaseUuid,
      type: 'has_only_text',
      arguments: ['<ERROR>'],
      category_uuid: failureCategoryUuid
    });

    // Create the router
    const router = {
      type: 'switch' as const,
      categories: categories,
      default_category_uuid: otherCategoryUuid,
      operand: '@locals._llm_output',
      cases: cases
    };

    // Return the complete node
    return {
      uuid: originalNode.uuid,
      actions: [callLlmAction],
      router: router,
      exits: exits
    };
  }
};
