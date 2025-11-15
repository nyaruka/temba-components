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

export const split_by_expression: NodeConfig = {
  type: 'split_by_expression',
  name: 'Split by Expression',
  group: SPLIT_GROUPS.split,
  dialogSize: 'large',
  form: {
    operand: {
      type: 'text',
      label: 'Expression',
      helpText: 'The expression to evaluate and split on',
      required: true,
      evaluated: true,
      placeholder: '@fields.age'
    },
    rules: createRulesArrayConfig(
      operatorsToSelectOptions(getWaitForResponseOperators()),
      'Define rules to categorize the expression result'
    ),
    result_name: resultNameField
  },
  layout: ['operand', 'rules', 'result_name'],
  validate: (formData: FormData) => {
    const errors: { [key: string]: string } = {};

    // Validate operand is provided
    if (!formData.operand || formData.operand.trim() === '') {
      errors.operand = 'Expression is required';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  },
  toFormData: (node: Node) => {
    // Extract rules from router cases using shared function
    const rules = casesToFormRules(node);

    return {
      uuid: node.uuid,
      operand: node.router?.operand || '@input.text',
      rules: rules,
      result_name: node.router?.result_name || ''
    };
  },
  fromFormData: (formData: FormData, originalNode: Node): Node => {
    // Get user rules using shared extraction function
    const userRules = extractUserRules(formData);

    // Get operand from form data
    const operand = formData.operand?.trim() || '@input.text';

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

  // Localization support for categories
  localizable: 'categories',
  toLocalizationFormData: categoriesToLocalizationFormData,
  fromLocalizationFormData: localizationFormDataToCategories
};
