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
    rules: createRulesArrayConfig(
      operatorsToSelectOptions(getWaitForResponseOperators()),
      'Define rules to categorize the result'
    ),
    result_name: resultNameField
  },
  layout: ['result', 'rules', 'result_name'],
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

    return {
      uuid: node.uuid,
      result: result ? [result] : [],
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

    // Build operand from the selected result
    const operand = `@results.${selectedResult.value}`;

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

    // Return UI config with operand information for persistence
    return {
      operand: {
        id: selectedResult.value,
        name: selectedResult.name,
        type: 'result'
      }
    };
  }
};
