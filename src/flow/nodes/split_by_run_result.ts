import { SPLIT_GROUPS, FormData, NodeConfig } from '../types';
import { Node } from '../../store/flow-definition';
import { createRulesRouter } from '../../utils';
import {
  getWaitForResponseOperators,
  operatorsToSelectOptions,
  getOperatorConfig
} from '../operators';
import { resultNameField } from './shared';
import {
  createRulesArrayConfig,
  extractUserRules,
  casesToFormRules
} from './shared-rules';
import { getStore } from '../../store/Store';

// field number options for delimiter feature (first through 20th)
const FIELD_NUMBER_OPTIONS = [
  { value: '0', name: 'first' },
  { value: '1', name: 'second' },
  { value: '2', name: 'third' },
  { value: '3', name: 'fourth' },
  { value: '4', name: 'fifth' },
  { value: '5', name: 'sixth' },
  { value: '6', name: 'seventh' },
  { value: '7', name: 'eighth' },
  { value: '8', name: 'ninth' },
  { value: '9', name: 'tenth' },
  { value: '10', name: '11th' },
  { value: '11', name: '12th' },
  { value: '12', name: '13th' },
  { value: '13', name: '14th' },
  { value: '14', name: '15th' },
  { value: '15', name: '16th' },
  { value: '16', name: '17th' },
  { value: '17', name: '18th' },
  { value: '18', name: '19th' },
  { value: '19', name: '20th' }
];

// delimiter options for delimiter feature
const DELIMITER_OPTIONS = [
  { value: ' ', name: 'spaces' },
  { value: '.', name: 'periods' },
  { value: '+', name: 'plusses' }
];

export const split_by_run_result: NodeConfig = {
  type: 'split_by_run_result',
  name: 'Split by Result',
  group: SPLIT_GROUPS.split,
  dialogSize: 'large',
  form: {
    result: {
      type: 'select',
      label: 'Flow Result',
      helpText: 'Select the flow result to split on',
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
    delimit_enabled: {
      type: 'checkbox',
      label: 'Delimit Result',
      helpText: 'Evaluate your rules against a delimited part of your result'
    },
    field_number: {
      type: 'select',
      label: 'Field',
      required: false,
      searchable: false,
      clearable: false,
      options: FIELD_NUMBER_OPTIONS,
      valueKey: 'value',
      nameKey: 'name',
      conditions: {
        visible: (formData: FormData) => formData.delimit_enabled === true
      }
    },
    delimiter: {
      type: 'select',
      label: 'Delimiter',
      required: false,
      searchable: false,
      clearable: false,
      options: DELIMITER_OPTIONS,
      valueKey: 'value',
      nameKey: 'name',
      conditions: {
        visible: (formData: FormData) => formData.delimit_enabled === true
      }
    },
    rules: createRulesArrayConfig(
      operatorsToSelectOptions(getWaitForResponseOperators()),
      'Define rules to categorize the result'
    ),
    result_name: resultNameField
  },
  layout: [
    'result',
    {
      type: 'group',
      label: 'Advanced',
      collapsible: true,
      collapsed: (formData: FormData) => !formData.delimit_enabled,
      items: [
        'delimit_enabled',
        {
          type: 'row',
          items: ['field_number', 'delimiter'],
          gap: '1rem'
        }
      ]
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

    // Extract delimiter configuration from UI config
    const delimit_enabled = nodeUI?.config?.index !== undefined;
    const field_number = nodeUI?.config?.index ?? 0;
    const delimiter = nodeUI?.config?.delimiter ?? ' ';

    return {
      uuid: node.uuid,
      result: result ? [result] : [],
      delimit_enabled: delimit_enabled,
      field_number: delimit_enabled
        ? [
            FIELD_NUMBER_OPTIONS.find(
              (opt) => opt.value === String(field_number)
            )
          ]
        : [FIELD_NUMBER_OPTIONS[0]],
      delimiter: delimit_enabled
        ? [DELIMITER_OPTIONS.find((opt) => opt.value === delimiter)]
        : [DELIMITER_OPTIONS[0]],
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

    // Build operand based on whether delimiter is enabled
    let operand: string;
    if (formData.delimit_enabled) {
      // Get delimiter configuration
      const fieldNumber = formData.field_number?.[0]?.value ?? '0';
      const delimiter = formData.delimiter?.[0]?.value ?? ' ';

      // Build operand with field() function
      operand = `@(field(results.${selectedResult.value}, ${fieldNumber}, "${delimiter}"))`;
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

    // Add delimiter configuration if enabled
    if (formData.delimit_enabled) {
      config.index = parseInt(formData.field_number?.[0]?.value ?? '0', 10);
      config.delimiter = formData.delimiter?.[0]?.value ?? ' ';
    }

    return config;
  }
};
