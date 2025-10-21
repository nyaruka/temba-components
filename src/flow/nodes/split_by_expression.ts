import { COLORS, NodeConfig } from '../types';
import { Node } from '../../store/flow-definition';
import {
  isSystemCategory,
  generateDefaultCategoryName,
  createRulesRouter
} from '../../utils';
import {
  getWaitForResponseOperators,
  operatorsToSelectOptions,
  getOperatorConfig
} from '../operators';
import { resultNameField } from './shared';

export const split_by_expression: NodeConfig = {
  type: 'split_by_expression',
  name: 'Split by Expression',
  color: COLORS.split,
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
    rules: {
      type: 'array',
      helpText: 'Define rules to categorize the expression result',
      itemLabel: 'Rule',
      minItems: 0,
      maxItems: 100,
      sortable: true,
      maintainEmptyItem: true,
      isEmptyItem: (item: any) => {
        // Helper function to get operator value from various formats
        const getOperatorValue = (operator: any): string => {
          if (typeof operator === 'string') {
            return operator.trim();
          } else if (Array.isArray(operator) && operator.length > 0) {
            const firstOperator = operator[0];
            if (
              firstOperator &&
              typeof firstOperator === 'object' &&
              firstOperator.value
            ) {
              return firstOperator.value.trim();
            }
          } else if (
            operator &&
            typeof operator === 'object' &&
            operator.value
          ) {
            return operator.value.trim();
          }
          return '';
        };

        // Check if operator and category are provided
        const operatorValue = getOperatorValue(item.operator);
        if (!operatorValue || !item.category || item.category.trim() === '') {
          return true;
        }

        // Check if value is required based on operator configuration
        const operatorConfig = getOperatorConfig(operatorValue);
        if (operatorConfig && operatorConfig.operands === 1) {
          return !item.value1 || item.value1.trim() === '';
        } else if (operatorConfig && operatorConfig.operands === 2) {
          return (
            !item.value1 ||
            item.value1.trim() === '' ||
            !item.value2 ||
            item.value2.trim() === ''
          );
        }

        return false;
      },
      onItemChange: (
        itemIndex: number,
        field: string,
        value: any,
        allItems: any[]
      ) => {
        const updatedItems = [...allItems];
        const item = { ...updatedItems[itemIndex] };

        // Helper to get operator value from various formats
        const getOperatorValue = (operator: any): string => {
          if (typeof operator === 'string') {
            return operator.trim();
          } else if (Array.isArray(operator) && operator.length > 0) {
            const firstOperator = operator[0];
            if (
              firstOperator &&
              typeof firstOperator === 'object' &&
              firstOperator.value
            ) {
              return firstOperator.value.trim();
            }
          } else if (
            operator &&
            typeof operator === 'object' &&
            operator.value
          ) {
            return operator.value.trim();
          }
          return '';
        };

        // Update the changed field
        item[field] = value;

        // Get operator values (before and after the change)
        const oldItem = allItems[itemIndex] || {};
        const oldOperatorValue =
          field === 'operator'
            ? getOperatorValue(oldItem.operator)
            : getOperatorValue(item.operator);
        const newOperatorValue = getOperatorValue(item.operator);

        // Calculate what the default category name should be before the change
        const oldDefaultCategory = generateDefaultCategoryName(
          oldOperatorValue,
          getOperatorConfig,
          field === 'value1' ? oldItem.value1 : item.value1,
          field === 'value2' ? oldItem.value2 : item.value2
        );

        // Calculate what the new default category name should be after the change
        const newDefaultCategory = generateDefaultCategoryName(
          newOperatorValue,
          getOperatorConfig,
          item.value1,
          item.value2
        );

        // Determine if we should auto-update the category
        const shouldUpdateCategory =
          !item.category ||
          item.category.trim() === '' ||
          item.category === oldDefaultCategory;

        // Auto-populate or update category if conditions are met
        if (shouldUpdateCategory && newDefaultCategory) {
          item.category = newDefaultCategory;
        }

        updatedItems[itemIndex] = item;
        return updatedItems;
      },
      itemConfig: {
        operator: {
          type: 'select',
          required: true,
          multi: false,
          options: operatorsToSelectOptions(getWaitForResponseOperators()),
          flavor: 'xsmall',
          width: '200px'
        },
        value1: {
          type: 'text',
          flavor: 'xsmall',
          conditions: {
            visible: (formData: Record<string, any>) => {
              const getOperatorValue = (operator: any): string => {
                if (typeof operator === 'string') {
                  return operator.trim();
                } else if (Array.isArray(operator) && operator.length > 0) {
                  const firstOperator = operator[0];
                  if (
                    firstOperator &&
                    typeof firstOperator === 'object' &&
                    firstOperator.value
                  ) {
                    return firstOperator.value.trim();
                  }
                } else if (
                  operator &&
                  typeof operator === 'object' &&
                  operator.value
                ) {
                  return operator.value.trim();
                }
                return '';
              };

              const operatorValue = getOperatorValue(formData.operator);
              const operatorConfig = getOperatorConfig(operatorValue);
              return operatorConfig ? operatorConfig.operands >= 1 : true;
            }
          }
        },
        value2: {
          type: 'text',
          flavor: 'xsmall',
          conditions: {
            visible: (formData: Record<string, any>) => {
              const getOperatorValue = (operator: any): string => {
                if (typeof operator === 'string') {
                  return operator.trim();
                } else if (Array.isArray(operator) && operator.length > 0) {
                  const firstOperator = operator[0];
                  if (
                    firstOperator &&
                    typeof firstOperator === 'object' &&
                    firstOperator.value
                  ) {
                    return firstOperator.value.trim();
                  }
                } else if (
                  operator &&
                  typeof operator === 'object' &&
                  operator.value
                ) {
                  return operator.value.trim();
                }
                return '';
              };

              const operatorValue = getOperatorValue(formData.operator);
              const operatorConfig = getOperatorConfig(operatorValue);
              return operatorConfig ? operatorConfig.operands === 2 : false;
            }
          }
        },
        category: {
          type: 'text',
          placeholder: 'Category',
          required: true,
          maxWidth: '120px',
          flavor: 'xsmall'
        }
      }
    },
    result_name: resultNameField
  },
  layout: ['operand', 'rules', 'result_name'],
  validate: (formData: any) => {
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
    // Extract rules from router cases
    const rules = [];
    if (node.router?.cases && node.router?.categories) {
      node.router.cases.forEach((case_) => {
        // Find the category for this case
        const category = node.router!.categories.find(
          (cat) => cat.uuid === case_.category_uuid
        );

        // Skip system categories
        if (category && !isSystemCategory(category.name)) {
          // Handle different operator types
          const operatorConfig = getOperatorConfig(case_.type);
          const operatorDisplayName = operatorConfig
            ? operatorConfig.name
            : case_.type;
          let value1 = '';
          let value2 = '';

          if (operatorConfig && operatorConfig.operands === 0) {
            value1 = '';
            value2 = '';
          } else if (operatorConfig && operatorConfig.operands === 1) {
            value1 = case_.arguments.join(' ');
            value2 = '';
          } else if (operatorConfig && operatorConfig.operands === 2) {
            value1 = case_.arguments[0] || '';
            value2 = case_.arguments[1] || '';
          } else {
            value1 = case_.arguments.join(' ');
            value2 = '';
          }

          rules.push({
            operator: { value: case_.type, name: operatorDisplayName },
            value1: value1,
            value2: value2,
            category: category.name
          });
        }
      });
    }

    return {
      uuid: node.uuid,
      operand: node.router?.operand || '@input.text',
      rules: rules,
      result_name: node.router?.result_name || ''
    };
  },
  fromFormData: (formData: any, originalNode: Node): Node => {
    // Helper function to get operator value from various formats
    const getOperatorValue = (operator: any): string => {
      if (typeof operator === 'string') {
        return operator.trim();
      } else if (Array.isArray(operator) && operator.length > 0) {
        const firstOperator = operator[0];
        if (
          firstOperator &&
          typeof firstOperator === 'object' &&
          firstOperator.value
        ) {
          return firstOperator.value.trim();
        }
      } else if (operator && typeof operator === 'object' && operator.value) {
        return operator.value.trim();
      }
      return '';
    };

    // Get user rules
    const userRules = (formData.rules || [])
      .filter((rule: any) => {
        const operatorValue = getOperatorValue(rule?.operator);
        if (
          !operatorValue ||
          !rule?.category ||
          operatorValue === '' ||
          rule.category.trim() === ''
        ) {
          return false;
        }

        const operatorConfig = getOperatorConfig(operatorValue);
        if (operatorConfig && operatorConfig.operands === 1) {
          return rule?.value1 && rule.value1.trim() !== '';
        } else if (operatorConfig && operatorConfig.operands === 2) {
          return (
            rule?.value1 &&
            rule.value1.trim() !== '' &&
            rule?.value2 &&
            rule.value2.trim() !== ''
          );
        }

        return true;
      })
      .map((rule: any) => {
        const operatorValue = getOperatorValue(rule.operator);
        const operatorConfig = getOperatorConfig(operatorValue);

        let value = '';

        if (operatorConfig && operatorConfig.operands === 1) {
          value = rule.value1 ? rule.value1.trim() : '';
        } else if (operatorConfig && operatorConfig.operands === 2) {
          const val1 = rule.value1 ? rule.value1.trim() : '';
          const val2 = rule.value2 ? rule.value2.trim() : '';
          value = `${val1} ${val2}`.trim();
        } else {
          value = '';
        }

        return {
          operator: operatorValue,
          value: value,
          category: rule.category.trim()
        };
      });

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
  }
};
