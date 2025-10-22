import { COLORS, NodeConfig } from '../types';
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

// System contact properties that can be split on
export const CONTACT_PROPERTIES = {
  name: { id: 'name', name: 'Name', type: 'property' },
  language: { id: 'language', name: 'Language', type: 'property' },
  status: { id: 'status', name: 'Status', type: 'property' },
  channel: { id: 'channel', name: 'Channel', type: 'property' }
};

// Helper to get operand for the selected field
const getOperandForField = (field: any): string => {
  // For custom fields, use the key
  if (field.key) {
    return `@fields.${field.key}`;
  }
  // For system properties, use the id
  if (field.type === 'property') {
    return `@contact.${field.id}`;
  }
  // Fallback to id
  return `@contact.${field.id}`;
};

export const split_by_contact_field: NodeConfig = {
  type: 'split_by_contact_field',
  name: 'Split by Contact Field',
  color: COLORS.split,
  dialogSize: 'large',
  form: {
    field: {
      type: 'select',
      label: 'Field',
      helpText:
        'Select the contact field or property to split on. You can split on custom fields or system properties like Name, Language, etc.',
      required: true,
      searchable: true,
      clearable: false,
      endpoint: '/api/v2/fields.json',
      valueKey: 'key',
      nameKey: 'name',
      placeholder: 'Select a field...',
      // Provide system properties as fixed options at the top
      options: Object.values(CONTACT_PROPERTIES).map((prop) => ({
        value: prop.id,
        name: prop.name,
        type: prop.type
      }))
    },
    rules: createRulesArrayConfig(
      operatorsToSelectOptions(getWaitForResponseOperators()),
      'Define rules to split the contact field into categories'
    ),
    result_name: resultNameField
  },
  layout: ['field', 'rules', 'result_name'],
  validate: (formData: any) => {
    const errors: { [key: string]: string } = {};

    if (!formData.field || formData.field.length === 0) {
      errors.field = 'A field is required';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  },
  toFormData: (node: Node, nodeUI?: any) => {
    // Get the field from the UI config operand (source of truth)
    const field = nodeUI?.config?.operand || CONTACT_PROPERTIES.name;

    // Extract rules from router cases using shared function
    const rules = casesToFormRules(node);

    return {
      uuid: node.uuid,
      field: [field],
      rules: rules,
      result_name: node.router?.result_name || ''
    };
  },
  fromFormData: (formData: any, originalNode: Node): Node => {
    // Get selected field (it's an array from the select component)
    const selectedField = formData.field?.[0];

    if (!selectedField) {
      return originalNode;
    }

    // Get operand for the selected field
    const operand = getOperandForField(selectedField);

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
  toUIConfig: (formData: any) => {
    // Get selected field (it's an array from the select component)
    const selectedField = formData.field?.[0];

    if (!selectedField) {
      return {};
    }

    // Return UI config with operand information for persistence
    return {
      operand: {
        id: selectedField.id || selectedField.value || selectedField.key,
        type: selectedField.type || 'field',
        name: selectedField.name
      },
      cases: {} // Placeholder for cases config if needed
    };
  }
};
