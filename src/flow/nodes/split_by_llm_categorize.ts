import { COLORS, NodeConfig, PropertyConfig } from '../types';
import { Node, CallLLM } from '../../store/flow-definition';
import { generateUUID } from '../../utils';

// Validation function to check for unique categories
const validateUniqueCategories = (categories: string[]): boolean => {
  const seen = new Set();
  for (const category of categories) {
    if (seen.has(category.toLowerCase())) {
      return false;
    }
    seen.add(category.toLowerCase());
  }
  return true;
};

export const split_by_llm_categorize: NodeConfig = {
  type: 'split_by_llm_categorize',
  name: 'Split by AI Categorize',
  color: COLORS.split,
  properties: {
    llm: {
      label: 'AI Model',
      required: true,
      widget: {
        type: 'temba-select',
        attributes: {
          endpoint: '/test-assets/select/llms.json',
          searchable: true,
          valueKey: 'uuid',
          nameKey: 'name'
        }
      }
    } satisfies PropertyConfig,
    input: {
      label: 'Input to categorize',
      required: true,
      widget: {
        type: 'temba-textinput',
        attributes: {
          placeholder: '@input'
        }
      }
    } satisfies PropertyConfig,
    categories: {
      label: 'Categories',
      required: true,
      widget: {
        type: 'temba-array-editor',
        attributes: {
          maxItems: 10,
          minItems: 1,
          itemLabel: 'Category',
          itemConfig: {
            name: {
              type: 'text',
              required: true,
              placeholder: 'Category name'
            }
          },
          isEmptyItem: (item: any) => !item?.name?.trim()
        }
      }
    } satisfies PropertyConfig,
    result_name: {
      label: 'Result name',
      widget: {
        type: 'temba-textinput',
        attributes: {
          placeholder: 'Intent'
        }
      }
    } satisfies PropertyConfig
  },
  toFormData: (node: Node) => {
    // Extract data from the existing node structure
    const callLlmAction = node.actions?.find(action => action.type === 'call_llm') as any;
    const categories = node.router?.categories?.filter(cat => 
      cat.name !== 'Other' && cat.name !== 'Failure'
    ).map(cat => ({ name: cat.name })) || [];
    
    return {
      uuid: node.uuid,
      llm: callLlmAction?.llm ? [{ value: callLlmAction.llm.uuid, name: callLlmAction.llm.name }] : [],
      input: callLlmAction?.input || '@input',
      categories: categories,
      result_name: node.router?.result_name || 'Intent'
    };
  },
  fromFormData: (formData: any, originalNode: Node): Node => {
    const callLlmUuid = generateUUID();
    const resultName = formData.result_name || 'Intent';
    
    // Get LLM selection
    const llmSelection = Array.isArray(formData.llm) && formData.llm.length > 0 ? formData.llm[0] : null;
    
    // Get user categories
    const userCategories = (formData.categories || [])
      .filter((item: any) => item?.name?.trim())
      .map((item: any) => item.name.trim());
    
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
    
    // Add user categories
    userCategories.forEach((categoryName: string) => {
      const categoryUuid = generateUUID();
      const exitUuid = generateUUID();
      
      categories.push({
        uuid: categoryUuid,
        name: categoryName,
        exit_uuid: exitUuid
      });
      
      exits.push({
        uuid: exitUuid,
        destination_uuid: null
      });
      
      cases.push({
        uuid: generateUUID(),
        type: 'has_only_text',
        arguments: [categoryName],
        category_uuid: categoryUuid
      });
    });
    
    // Add "Other" category (default)
    const otherCategoryUuid = generateUUID();
    const otherExitUuid = generateUUID();
    categories.push({
      uuid: otherCategoryUuid,
      name: 'Other',
      exit_uuid: otherExitUuid
    });
    exits.push({
      uuid: otherExitUuid,
      destination_uuid: null
    });
    
    // Add "Failure" category
    const failureCategoryUuid = generateUUID();
    const failureExitUuid = generateUUID();
    categories.push({
      uuid: failureCategoryUuid,
      name: 'Failure',
      exit_uuid: failureExitUuid
    });
    exits.push({
      uuid: failureExitUuid,
      destination_uuid: null
    });
    
    // Add failure case for <ERROR>
    cases.push({
      uuid: generateUUID(),
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
      result_name: resultName,
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