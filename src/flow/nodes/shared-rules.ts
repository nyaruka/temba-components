import { getOperatorConfig } from '../operators';
import { generateDefaultCategoryName } from '../../utils';

/**
 * Shared helper function to get operator value from various formats.
 * Handles string, object, and array formats that can come from the form system.
 */
export const getOperatorValue = (operator: any): string => {
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

/**
 * Shared isEmptyItem function for rules array.
 * Determines if a rule item is considered empty and should be filtered out.
 */
export const isEmptyRuleItem = (item: any): boolean => {
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
};

/**
 * Shared onItemChange function for rules array.
 * Handles auto-updating category names based on operator and value changes.
 */
export const createRuleItemChangeHandler = () => {
  return (itemIndex: number, field: string, value: any, allItems: any[]) => {
    const updatedItems = [...allItems];
    const item = { ...updatedItems[itemIndex] };

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
  };
};

/**
 * Shared visibility condition for value1 field.
 */
export const value1VisibilityCondition = (formData: Record<string, any>) => {
  const operatorValue = getOperatorValue(formData.operator);
  const operatorConfig = getOperatorConfig(operatorValue);
  return operatorConfig ? operatorConfig.operands >= 1 : true;
};

/**
 * Shared visibility condition for value2 field.
 */
export const value2VisibilityCondition = (formData: Record<string, any>) => {
  const operatorValue = getOperatorValue(formData.operator);
  const operatorConfig = getOperatorConfig(operatorValue);
  return operatorConfig ? operatorConfig.operands === 2 : false;
};

/**
 * Shared item configuration for rules array.
 * This defines the operator, value1, value2, and category fields.
 */
export const createRulesItemConfig = () => ({
  operator: {
    type: 'select' as const,
    required: true,
    multi: false,
    options: [], // Will be set by the caller
    flavor: 'xsmall' as const,
    width: '200px'
  },
  value1: {
    type: 'text' as const,
    flavor: 'xsmall' as const,
    conditions: {
      visible: value1VisibilityCondition
    }
  },
  value2: {
    type: 'text' as const,
    flavor: 'xsmall' as const,
    conditions: {
      visible: value2VisibilityCondition
    }
  },
  category: {
    type: 'text' as const,
    placeholder: 'Category',
    required: true,
    maxWidth: '120px',
    flavor: 'xsmall' as const
  }
});

/**
 * Shared function to extract rules from form data.
 * Filters and transforms form rules into the format expected by createRulesRouter.
 */
export const extractUserRules = (formData: any) => {
  return (formData.rules || [])
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
};

/**
 * Shared function to transform router cases to form rules.
 * Converts node router cases back into the form data structure.
 */
export const casesToFormRules = (node: any) => {
  const rules = [];
  if (node.router?.cases && node.router?.categories) {
    node.router.cases.forEach((case_: any) => {
      // Find the category for this case
      const category = node.router!.categories.find(
        (cat: any) => cat.uuid === case_.category_uuid
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
  return rules;
};

/**
 * Helper to check if a category is a system category
 */
function isSystemCategory(categoryName: string): boolean {
  return ['No Response', 'Other', 'All Responses', 'Timeout'].includes(
    categoryName
  );
}

/**
 * Creates a complete rules array configuration for forms.
 * This is the shared configuration used by both wait_for_response and split_by_expression.
 *
 * @param operatorOptions - The operator options to use (from operatorsToSelectOptions)
 * @param helpText - The help text to display for the rules array
 * @returns A complete array field configuration object
 */
export const createRulesArrayConfig = (
  operatorOptions: any[],
  helpText: string = 'Define rules to categorize responses'
) => ({
  type: 'array' as const,
  helpText,
  itemLabel: 'Rule',
  minItems: 0,
  maxItems: 100,
  sortable: true,
  maintainEmptyItem: true,
  isEmptyItem: isEmptyRuleItem,
  onItemChange: createRuleItemChangeHandler(),
  itemConfig: {
    ...createRulesItemConfig(),
    operator: {
      ...createRulesItemConfig().operator,
      options: operatorOptions
    }
  }
});
