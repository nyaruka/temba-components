import { SPLIT_GROUPS, FormData, NodeConfig } from '../types';
import { Node } from '../../store/flow-definition';
import { createRulesRouter } from '../../utils';
import {
  getWaitForResponseOperators,
  operatorsToSelectOptions,
  getOperatorConfig
} from '../operators';
import {
  resultNameField,
  categoriesToLocalizationFormData,
  localizationFormDataToCategories
} from './shared';
import {
  createRulesArrayConfig,
  extractUserRules,
  casesToFormRules
} from './shared-rules';
import { getStore } from '../../store/Store';

// delimit index options (first through 20th)
const DELIMIT_INDEX_OPTIONS = [
  { value: '0', name: 'first result' },
  { value: '1', name: 'second result' },
  { value: '2', name: 'third result' },
  { value: '3', name: 'fourth result' },
  { value: '4', name: 'fifth result' },
  { value: '5', name: 'sixth result' },
  { value: '6', name: 'seventh result' },
  { value: '7', name: 'eighth result' },
  { value: '8', name: 'ninth result' },
  { value: '9', name: 'tenth result' },
  { value: '10', name: '11th result' },
  { value: '11', name: '12th result' },
  { value: '12', name: '13th result' },
  { value: '13', name: '14th result' },
  { value: '14', name: '15th result' },
  { value: '15', name: '16th result' },
  { value: '16', name: '17th result' },
  { value: '17', name: '18th result' },
  { value: '18', name: '19th result' },
  { value: '19', name: '20th result' }
];

// delimit by options - includes "don't delimit" and delimiter characters
const DELIMIT_BY_OPTIONS = [
  { value: '', name: "Don't delimit result" },
  { value: ' ', name: 'Delimited by spaces' },
  { value: '.', name: 'Delimited by periods' },
  { value: '+', name: 'Delimited by plusses' }
];

export const split_by_run_result: NodeConfig = {
  type: 'split_by_run_result',
  name: 'Split by Result',
  group: SPLIT_GROUPS.split,
  dialogSize: 'large',
  form: {
    result: {
      type: 'select',

      required: true,
      searchable: false,
      clearable: false,
      placeholder: 'Select a result...',
      getDynamicOptions: () => {
        const store = getStore();
        return store
          ? store
              .getState()
              .getFlowResults()
              .map((r) => ({ value: r.key, name: r.name }))
          : [];
      },
      valueKey: 'value',
      nameKey: 'name'
    },
    delimit_by: {
      type: 'select',
      required: false,
      searchable: false,
      clearable: false,
      options: DELIMIT_BY_OPTIONS,
      valueKey: 'value',
      nameKey: 'name',
      maxWidth: '180px'
    },
    delimit_index: {
      type: 'select',
      required: false,
      searchable: false,
      clearable: false,
      options: DELIMIT_INDEX_OPTIONS,
      valueKey: 'value',
      nameKey: 'name',
      maxWidth: '140px',
      conditions: {
        visible: (formData: FormData) => {
          const delimitBy = formData.delimit_by?.[0]?.value;
          return delimitBy !== undefined && delimitBy !== '';
        }
      }
    },
    rules: createRulesArrayConfig(
      operatorsToSelectOptions(getWaitForResponseOperators()),
      'Define rules to categorize the result'
    ),
    result_name: resultNameField
  },
  layout: [
    {
      type: 'row',
      label: 'Flow Result',
      helpText:
        'Select a flow result and optionally delimit it to split on a specific part',
      items: ['result', 'delimit_by', 'delimit_index']
    },
    'rules',
    'result_name'
  ],
  validate: (formData: FormData) => {
    const errors: { [key: string]: string } = {};

    // Validate result is provided
    if (!formData.result || formData.result.length === 0) {
      errors.result = 'A flow result is required';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  },
  toFormData: (node: Node, nodeUI?: any) => {
    // Get the result from the UI config operand (source of truth)
    const result = nodeUI?.config?.operand;

    // Extract rules from router cases using shared function
    const rules = casesToFormRules(node);

    // Extract delimiter configuration by checking the actual operand string
    // If operand contains field() function, we have a delimiter
    const operand = node.router?.operand || '';
    const fieldFunctionMatch = operand.match(
      /field\(results\.[\w]+,\s*(\d+),\s*"(.+?)"\)/
    );

    const hasDelimiter = fieldFunctionMatch !== null;
    const delimitIndex = hasDelimiter
      ? parseInt(fieldFunctionMatch![1], 10)
      : 0;
    const delimiter = hasDelimiter ? fieldFunctionMatch![2] : '';

    return {
      uuid: node.uuid,
      result: result ? [result] : [],
      delimit_by: hasDelimiter
        ? [DELIMIT_BY_OPTIONS.find((opt) => opt.value === delimiter)]
        : [DELIMIT_BY_OPTIONS[0]],
      delimit_index: hasDelimiter
        ? [
            DELIMIT_INDEX_OPTIONS.find(
              (opt) => opt.value === String(delimitIndex)
            )
          ]
        : [DELIMIT_INDEX_OPTIONS[0]],
      rules: rules,
      result_name: node.router?.result_name || ''
    };
  },
  fromFormData: (formData: FormData, originalNode: Node): Node => {
    // Get selected result (it's an array from the select component)
    const selectedResult = formData.result?.[0];

    if (!selectedResult) {
      return originalNode;
    }

    // Build operand based on whether delimiter is selected
    let operand: string;
    const delimitBy = formData.delimit_by?.[0]?.value;
    const hasDelimiter = delimitBy !== undefined && delimitBy !== '';

    if (hasDelimiter) {
      // Get delimiter configuration
      const delimitIndex = formData.delimit_index?.[0]?.value ?? '0';

      // Build operand with field() function
      operand = `@(field(results.${selectedResult.value}, ${delimitIndex}, "${delimitBy}"))`;
    } else {
      // Standard operand without delimiter
      operand = `@results.${selectedResult.value}`;
    }

    // Get user rules using shared extraction function
    const userRules = extractUserRules(formData);

    // Get existing router data for preservation
    const existingCategories = originalNode.router?.categories || [];
    const existingExits = originalNode.exits || [];
    const existingCases = originalNode.router?.cases || [];

    // Create router and exits using existing data when possible
    const { router, exits } = createRulesRouter(
      operand,
      userRules,
      getOperatorConfig,
      existingCategories,
      existingExits,
      existingCases
    );

    // Build final router with result_name
    const finalRouter: any = {
      ...router
    };

    // Only set result_name if provided
    if (formData.result_name && formData.result_name.trim() !== '') {
      finalRouter.result_name = formData.result_name.trim();
    }

    return {
      ...originalNode,
      router: finalRouter,
      exits: exits
    };
  },
  toUIConfig: (formData: FormData) => {
    // Get selected result (it's an array from the select component)
    const selectedResult = formData.result?.[0];

    if (!selectedResult) {
      return {};
    }

    // Build UI config with operand information
    const config: any = {
      operand: {
        id: selectedResult.value,
        name: selectedResult.name,
        type: 'result'
      }
    };

    // Add delimiter configuration if selected
    const delimitBy = formData.delimit_by?.[0]?.value;
    const hasDelimiter = delimitBy !== undefined && delimitBy !== '';

    if (hasDelimiter) {
      config.index = parseInt(formData.delimit_index?.[0]?.value ?? '0', 10);
      config.delimiter = delimitBy;
    }

    return config;
  },

  // Localization support for categories
  localizable: 'categories',
  toLocalizationFormData: categoriesToLocalizationFormData,
  fromLocalizationFormData: localizationFormDataToCategories
};
