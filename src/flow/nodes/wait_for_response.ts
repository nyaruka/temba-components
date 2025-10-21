import { COLORS, NodeConfig } from '../types';
import { Node, Category, Exit, Case } from '../../store/flow-definition';
import { generateUUID } from '../../utils';
import {
  getWaitForResponseOperators,
  operatorsToSelectOptions,
  getOperatorConfig
} from '../operators';
import { resultNameField } from './shared';

const TIMEOUT_OPTIONS = [
  { value: '60', name: '1 minute' },
  { value: '120', name: '2 minutes' },
  { value: '180', name: '3 minutes' },
  { value: '240', name: '4 minutes' },
  { value: '300', name: '5 minutes' },
  { value: '600', name: '10 minutes' },
  { value: '900', name: '15 minutes' },
  { value: '1800', name: '30 minutes' },
  { value: '3600', name: '1 hour' },
  { value: '7200', name: '2 hours' },
  { value: '10800', name: '3 hours' },
  { value: '21600', name: '6 hours' },
  { value: '43200', name: '12 hours' },
  { value: '64800', name: '18 hours' },
  { value: '86400', name: '1 day' },
  { value: '172800', name: '2 days' },
  { value: '259200', name: '3 days' },
  { value: '604800', name: '1 week' }
];

// Helper function to check if a category is a system category
const isSystemCategory = (categoryName: string): boolean => {
  return ['No Response', 'Other', 'All Responses', 'Timeout'].includes(
    categoryName
  );
};

// Helper function to check if a UUID belongs to a system category
const isSystemCategoryUuid = (
  uuid: string,
  categories: Category[]
): boolean => {
  const category = categories.find((cat) => cat.uuid === uuid);
  return category ? isSystemCategory(category.name) : false;
};

// Helper function to generate default category name based on operator and operands
const generateDefaultCategoryName = (
  operator: string,
  value1?: string,
  value2?: string
): string => {
  const operatorConfig = getOperatorConfig(operator);
  if (!operatorConfig) return '';

  // Fixed category names (no operands)
  if (operatorConfig.operands === 0) {
    return operatorConfig.categoryName || '';
  }

  // Dynamic category names based on operands
  const cleanValue1 = (value1 || '').trim();
  const cleanValue2 = (value2 || '').trim();

  // Helper to capitalize first letter
  const capitalize = (str: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  // Handle different operator types
  switch (operator) {
    // Word/phrase operators - capitalize first letter of value
    case 'has_any_word':
    case 'has_all_words':
    case 'has_phrase':
    case 'has_only_phrase':
    case 'has_beginning':
      return cleanValue1 ? capitalize(cleanValue1) : '';

    // Pattern operators - show as-is
    case 'has_pattern':
      return cleanValue1;

    // Number comparison operators - include symbol
    case 'has_number_eq':
      return cleanValue1 ? `= ${cleanValue1}` : '';
    case 'has_number_lt':
      return cleanValue1 ? `< ${cleanValue1}` : '';
    case 'has_number_lte':
      return cleanValue1 ? `≤ ${cleanValue1}` : '';
    case 'has_number_gt':
      return cleanValue1 ? `> ${cleanValue1}` : '';
    case 'has_number_gte':
      return cleanValue1 ? `≥ ${cleanValue1}` : '';

    // Number between - range format
    case 'has_number_between':
      if (cleanValue1 && cleanValue2) {
        return `${cleanValue1} - ${cleanValue2}`;
      }
      return '';

    // Date operators - format with relative expressions
    case 'has_date_lt':
    case 'has_date_lte':
      if (cleanValue1) {
        // Parse relative date expression (e.g., "today + 5" or "today - 3")
        const match = cleanValue1.match(/^(today)\s*([+-])\s*(\d+)$/i);
        if (match) {
          const [, base, operator, days] = match;
          const dayWord = days === '1' ? 'day' : 'days';
          return `Before ${base} ${operator} ${days} ${dayWord}`;
        }
        // Fallback for other date formats
        return `Before ${cleanValue1}`;
      }
      return '';

    case 'has_date_gt':
    case 'has_date_gte':
      if (cleanValue1) {
        // Parse relative date expression
        const match = cleanValue1.match(/^(today)\s*([+-])\s*(\d+)$/i);
        if (match) {
          const [, base, operator, days] = match;
          const dayWord = days === '1' ? 'day' : 'days';
          return `After ${base} ${operator} ${days} ${dayWord}`;
        }
        // Fallback for other date formats
        return `After ${cleanValue1}`;
      }
      return '';

    case 'has_date_eq':
      if (cleanValue1) {
        // Parse relative date expression
        const match = cleanValue1.match(/^(today)\s*([+-])\s*(\d+)$/i);
        if (match) {
          const [, base, operator, days] = match;
          const dayWord = days === '1' ? 'day' : 'days';
          return `${base} ${operator} ${days} ${dayWord}`;
        }
        return cleanValue1;
      }
      return '';

    default:
      // Fallback - capitalize first value
      return cleanValue1 ? capitalize(cleanValue1) : '';
  }
};

// Helper function to create a wait_for_response router with user rules
const createWaitForResponseRouter = (
  userRules: any[],
  existingCategories: Category[] = [],
  existingExits: Exit[] = [],
  existingCases: Case[] = []
) => {
  const categories: Category[] = [];
  const exits: Exit[] = [];
  const cases: Case[] = [];

  // Filter existing categories to get only user-defined rules (exclude system categories)
  const existingUserCategories = existingCategories.filter(
    (cat) => !isSystemCategory(cat.name)
  );

  // Track categories as we create them (case-insensitive lookup)
  const createdCategories = new Map<
    string,
    { uuid: string; name: string; exit_uuid: string }
  >();

  // Process rules in their original order to preserve rule order
  userRules.forEach((rule, ruleIndex) => {
    const categoryKey = rule.category.trim().toLowerCase();
    const categoryName = rule.category.trim(); // Use original casing

    let categoryInfo = createdCategories.get(categoryKey);

    if (!categoryInfo) {
      // First time seeing this category - create it

      // Smart category matching: try by name first, then fall back to position
      let existingCategory = existingUserCategories.find(
        (cat) => cat.name.toLowerCase() === categoryKey
      );

      // If no match by name, try by position (for category rename scenarios)
      const categoryCreationOrder = Array.from(createdCategories.keys()).length;
      if (
        !existingCategory &&
        categoryCreationOrder < existingUserCategories.length
      ) {
        const candidateCategory = existingUserCategories[categoryCreationOrder];
        // Double-check that this candidate is not a system category UUID
        if (
          candidateCategory &&
          !isSystemCategoryUuid(candidateCategory.uuid, existingCategories)
        ) {
          existingCategory = candidateCategory;
        }
      }

      const existingExit = existingCategory
        ? existingExits.find((exit) => exit.uuid === existingCategory.exit_uuid)
        : null;

      // Generate UUIDs, ensuring we don't reuse system category UUIDs
      let exitUuid = existingExit?.uuid || generateUUID();
      let categoryUuid = existingCategory?.uuid || generateUUID();

      // Additional safety check: if somehow we got a system category UUID, generate new ones
      if (isSystemCategoryUuid(categoryUuid, existingCategories)) {
        categoryUuid = generateUUID();
        exitUuid = generateUUID();
      }

      categoryInfo = {
        uuid: categoryUuid,
        name: categoryName,
        exit_uuid: exitUuid
      };

      createdCategories.set(categoryKey, categoryInfo);

      // Add category and exit
      categories.push({
        uuid: categoryUuid,
        name: categoryName,
        exit_uuid: exitUuid
      });

      exits.push({
        uuid: exitUuid,
        destination_uuid: existingExit?.destination_uuid || null
      });
    }

    // Create case for this rule
    let existingCase = existingCases[ruleIndex];

    // If we can't find by position, try to find by matching rule content
    if (!existingCase && existingCases.length > 0) {
      existingCase = existingCases.find((case_) => {
        // Find the category for this case
        const caseCategory = existingCategories.find(
          (cat) => cat.uuid === case_.category_uuid
        );

        // Match by operator type and category name
        return (
          case_.type === rule.operator &&
          caseCategory?.name.toLowerCase() === categoryKey
        );
      });
    }

    const caseUuid = existingCase?.uuid || generateUUID();

    // Parse rule value based on operator configuration
    const operatorConfig = getOperatorConfig(rule.operator);
    let arguments_: string[] = [];

    if (operatorConfig) {
      if (operatorConfig.operands === 0) {
        // No operands needed
        arguments_ = [];
      } else if (operatorConfig.operands === 2) {
        // Split value for two operands (e.g., "1 10" for between)
        arguments_ = rule.value.split(' ').filter((arg: string) => arg.trim());
      } else {
        // Single operand - but split words for operators that expect multiple words
        if (rule.value && rule.value.trim()) {
          // Split on spaces and filter out empty strings
          arguments_ = rule.value
            .trim()
            .split(/\s+/)
            .filter((arg: string) => arg.length > 0);
        } else {
          arguments_ = [];
        }
      }
    } else {
      // Fallback for unknown operators - split on spaces if value exists
      if (rule.value && rule.value.trim()) {
        arguments_ = rule.value
          .trim()
          .split(/\s+/)
          .filter((arg: string) => arg.length > 0);
      } else {
        arguments_ = [];
      }
    }

    cases.push({
      uuid: caseUuid,
      type: rule.operator,
      arguments: arguments_,
      category_uuid: categoryInfo.uuid
    });
  });

  // Add default category (always present)
  // Name is "Other" if there are user rules, "All Responses" if there are no user rules
  const defaultCategoryName = userRules.length > 0 ? 'Other' : 'All Responses';

  // Try to find existing default category by name (prefer exact match)
  let existingDefaultCategory = existingCategories.find(
    (cat) => cat.name === defaultCategoryName
  );

  // If no exact match, try to find the other possible default category name
  if (!existingDefaultCategory) {
    const alternateName = userRules.length > 0 ? 'All Responses' : 'Other';
    existingDefaultCategory = existingCategories.find(
      (cat) => cat.name === alternateName
    );
  }

  const existingDefaultExit = existingDefaultCategory
    ? existingExits.find(
        (exit) => exit.uuid === existingDefaultCategory.exit_uuid
      )
    : null;

  const defaultExitUuid = existingDefaultExit?.uuid || generateUUID();
  const defaultCategoryUuid = existingDefaultCategory?.uuid || generateUUID();

  categories.push({
    uuid: defaultCategoryUuid,
    name: defaultCategoryName,
    exit_uuid: defaultExitUuid
  });

  exits.push({
    uuid: defaultExitUuid,
    destination_uuid: existingDefaultExit?.destination_uuid || null
  });

  // Add "No Response" category last (if it exists in the original)
  const existingNoResponseCategory = existingCategories.find(
    (cat) => cat.name === 'No Response' || cat.name === 'Timeout'
  );

  if (existingNoResponseCategory) {
    const existingNoResponseExit = existingExits.find(
      (exit) => exit.uuid === existingNoResponseCategory.exit_uuid
    );

    if (existingNoResponseExit) {
      categories.push(existingNoResponseCategory);
      exits.push(existingNoResponseExit);
    }
  }

  // Find the default category (either "Other" or "All Responses")
  const defaultCategory = categories.find(
    (cat) => cat.name === 'Other' || cat.name === 'All Responses'
  );

  return {
    router: {
      type: 'switch' as const,
      categories: categories,
      default_category_uuid: defaultCategory?.uuid,
      operand: '@input.text',
      cases: cases
    },
    exits: exits
  };
};

export const wait_for_response: NodeConfig = {
  type: 'wait_for_response',
  name: 'Wait for Response',
  color: COLORS.wait,
  dialogSize: 'large',
  form: {
    rules: {
      type: 'array',
      helpText: 'Define rules to categorize responses',
      itemLabel: 'Rule',
      minItems: 0,
      maxItems: 100,
      sortable: true,
      maintainEmptyItem: true, // Explicitly enable empty item maintenance
      isEmptyItem: (item: any) => {
        // Helper function to get operator value from various formats
        const getOperatorValue = (operator: any): string => {
          if (typeof operator === 'string') {
            return operator.trim();
          } else if (Array.isArray(operator) && operator.length > 0) {
            // Handle array format: [{value: "has_any_word", name: "..."}]
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
            // Handle object format: {value: "has_any_word", name: "..."}
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
          // value1 is required for this operator
          return !item.value1 || item.value1.trim() === '';
        } else if (operatorConfig && operatorConfig.operands === 2) {
          // Both value1 and value2 are required for this operator
          return (
            !item.value1 ||
            item.value1.trim() === '' ||
            !item.value2 ||
            item.value2.trim() === ''
          );
        }

        // No value required for this operator
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
          field === 'value1' ? oldItem.value1 : item.value1,
          field === 'value2' ? oldItem.value2 : item.value2
        );

        // Calculate what the new default category name should be after the change
        const newDefaultCategory = generateDefaultCategoryName(
          newOperatorValue,
          item.value1,
          item.value2
        );

        // Determine if we should auto-update the category
        const shouldUpdateCategory =
          // Category is empty
          !item.category ||
          item.category.trim() === '' ||
          // Category matches the old default (user hasn't customized it)
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
          multi: false, // Explicitly set as single-select
          options: operatorsToSelectOptions(getWaitForResponseOperators()),
          flavor: 'xsmall',
          width: '200px'
        },
        value1: {
          type: 'text',
          flavor: 'xsmall',
          conditions: {
            visible: (formData: Record<string, any>) => {
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

              // Show value1 field for operators that require 1 or 2 operands
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

              // Show value2 field only if operator requires exactly 2 operands
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
    timeout_enabled: {
      type: 'checkbox',
      label: (formData: Record<string, any>) => {
        return formData.timeout_enabled
          ? 'Continue when there is no response for'
          : 'Continue when there is no response..';
      },
      labelPadding: '4px 8px'
    },
    timeout_duration: {
      type: 'select',
      placeholder: '5 minutes',
      multi: false,
      maxWidth: '150px',
      flavor: 'xsmall',
      options: TIMEOUT_OPTIONS,
      conditions: {
        visible: (formData: Record<string, any>) => {
          return formData.timeout_enabled === true;
        }
      }
    },
    result_name: resultNameField
  },
  layout: ['rules', 'result_name'],
  gutter: [
    {
      type: 'row',
      items: ['timeout_enabled', 'timeout_duration'],
      gap: '0.5rem'
    }
  ],
  validate: (_formData: any) => {
    const errors: { [key: string]: string } = {};

    // No validation needed - allow multiple rules to use same category name
    // Rules with the same category name will be merged to use the same exit

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
            // No value needed for operators like has_text, has_number
            value1 = '';
            value2 = '';
          } else if (operatorConfig && operatorConfig.operands === 1) {
            // Single value for operators like has_number_lt - use value1
            value1 = case_.arguments.join(' ');
            value2 = '';
          } else if (operatorConfig && operatorConfig.operands === 2) {
            // Two separate values for operators like has_number_between
            value1 = case_.arguments[0] || '';
            value2 = case_.arguments[1] || '';
          } else {
            // Fallback: use first argument for unknown operators
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

    // Extract timeout configuration
    const timeoutSeconds = node.router?.wait?.timeout?.seconds;
    let timeoutOption = TIMEOUT_OPTIONS.find(
      (opt) => opt.value === String(timeoutSeconds)
    );

    if (!timeoutOption) {
      timeoutOption = { value: '300', name: '5 minutes' };
    }

    return {
      uuid: node.uuid,
      rules: rules,
      timeout_enabled: !!timeoutSeconds,
      timeout_duration: timeoutOption,
      result_name: node.router?.result_name || ''
    };
  },
  fromFormData: (formData: any, originalNode: Node): Node => {
    // Helper function to get operator value from various formats
    const getOperatorValue = (operator: any): string => {
      if (typeof operator === 'string') {
        return operator.trim();
      } else if (Array.isArray(operator) && operator.length > 0) {
        // Handle array format: [{value: "has_any_word", name: "..."}]
        const firstOperator = operator[0];
        if (
          firstOperator &&
          typeof firstOperator === 'object' &&
          firstOperator.value
        ) {
          return firstOperator.value.trim();
        }
      } else if (operator && typeof operator === 'object' && operator.value) {
        // Handle object format: {value: "has_any_word", name: "..."}
        return operator.value.trim();
      }
      return '';
    };

    // Get user rules
    const userRules = (formData.rules || [])
      .filter((rule: any) => {
        // Always need operator and category
        const operatorValue = getOperatorValue(rule?.operator);
        if (
          !operatorValue ||
          !rule?.category ||
          operatorValue === '' ||
          rule.category.trim() === ''
        ) {
          return false;
        }

        // Check if value is required based on operator
        const operatorConfig = getOperatorConfig(operatorValue);
        if (operatorConfig && operatorConfig.operands === 1) {
          // value1 is required for this operator
          return rule?.value1 && rule.value1.trim() !== '';
        } else if (operatorConfig && operatorConfig.operands === 2) {
          // Both value1 and value2 are required for this operator
          return (
            rule?.value1 &&
            rule.value1.trim() !== '' &&
            rule?.value2 &&
            rule.value2.trim() !== ''
          );
        }

        // No value required for this operator
        return true;
      })
      .map((rule: any) => {
        const operatorValue = getOperatorValue(rule.operator);
        const operatorConfig = getOperatorConfig(operatorValue);

        let value = '';

        if (operatorConfig && operatorConfig.operands === 1) {
          // Single value from value1
          value = rule.value1 ? rule.value1.trim() : '';
        } else if (operatorConfig && operatorConfig.operands === 2) {
          // Two values - combine them with space
          const val1 = rule.value1 ? rule.value1.trim() : '';
          const val2 = rule.value2 ? rule.value2.trim() : '';
          value = `${val1} ${val2}`.trim();
        } else {
          // No value needed for 0-operand operators
          value = '';
        }

        return {
          operator: operatorValue,
          value: value,
          category: rule.category.trim()
        };
      });

    // If no user rules, clear cases but preserve other router config
    if (userRules.length === 0) {
      // Get existing router data for preservation
      let existingCategories = originalNode.router?.categories || [];
      const existingExits = [...(originalNode.exits || [])]; // Create a copy to avoid extensibility issues

      // Handle timeout: ensure "No Response" category exists if timeout is enabled,
      // or remove it if timeout is disabled
      if (formData.timeout_enabled) {
        let noResponseCategory = existingCategories.find(
          (cat: any) => cat.name === 'No Response'
        );

        if (!noResponseCategory) {
          // Create new "No Response" category and exit
          const noResponseExitUuid = generateUUID();
          noResponseCategory = {
            uuid: generateUUID(),
            name: 'No Response',
            exit_uuid: noResponseExitUuid
          };

          // Add to existing categories for processing
          existingCategories = [...existingCategories, noResponseCategory];

          // Add corresponding exit if it doesn't exist
          if (!existingExits.find((exit) => exit.uuid === noResponseExitUuid)) {
            existingExits.push({
              uuid: noResponseExitUuid,
              destination_uuid: null
            });
          }
        }
      } else {
        // If timeout is disabled, remove "No Response" category from existing categories
        existingCategories = existingCategories.filter(
          (cat: any) => cat.name !== 'No Response'
        );
      }

      // Create router with "All Responses" as default category
      // This will now properly handle the "No Response" category if it exists
      const { router: noRulesRouter, exits: noRulesExits } =
        createWaitForResponseRouter(
          [], // No user rules
          existingCategories,
          existingExits,
          [] // No cases
        );

      const router: any = {
        ...noRulesRouter,
        cases: [] // Clear all cases when no rules
      };

      // Only set result_name if provided
      if (formData.result_name && formData.result_name.trim() !== '') {
        router.result_name = formData.result_name.trim();
      }

      // Build wait configuration based on form data
      const waitConfig: any = {
        type: 'msg'
      };

      // Add timeout if enabled
      if (formData.timeout_enabled) {
        // Extract timeout value (handle both string and object formats)
        let timeoutSeconds;

        if (formData.timeout_duration) {
          if (
            Array.isArray(formData.timeout_duration) &&
            formData.timeout_duration.length > 0
          ) {
            // Handle array of selected options (multi-select behavior)
            timeoutSeconds = parseInt(formData.timeout_duration[0].value, 10);
          } else if (typeof formData.timeout_duration === 'string') {
            timeoutSeconds = parseInt(formData.timeout_duration, 10);
          } else if (
            formData.timeout_duration &&
            typeof formData.timeout_duration === 'object' &&
            formData.timeout_duration.value
          ) {
            timeoutSeconds = parseInt(formData.timeout_duration.value, 10);
          } else {
            timeoutSeconds = 300; // Default to 5 minutes
          }
        } else {
          // No duration selected, use default
          timeoutSeconds = 300; // Default to 5 minutes
        }

        // Validate that we got a valid number
        if (isNaN(timeoutSeconds) || timeoutSeconds <= 0) {
          timeoutSeconds = 300; // Default to 5 minutes
        }

        // Find the "No Response" category (should exist now)
        const noResponseCategory = router.categories.find(
          (cat: any) => cat.name === 'No Response'
        );

        if (noResponseCategory) {
          waitConfig.timeout = {
            seconds: timeoutSeconds,
            category_uuid: noResponseCategory.uuid
          };
        }
      }

      router.wait = waitConfig;

      return {
        ...originalNode,
        router,
        exits: noRulesExits
      };
    }

    // Get existing router data for preservation
    const existingCategories = originalNode.router?.categories || [];
    const existingExits = originalNode.exits || [];
    const existingCases = originalNode.router?.cases || [];

    // Create router and exits using existing data when possible
    const { router, exits } = createWaitForResponseRouter(
      userRules,
      existingCategories,
      existingExits,
      existingCases
    );

    // Build final router with wait configuration and result_name
    const finalRouter: any = {
      ...router
    };

    // Only set result_name if provided
    if (formData.result_name && formData.result_name.trim() !== '') {
      finalRouter.result_name = formData.result_name.trim();
    }

    // Build wait configuration based on form data
    const waitConfig: any = {
      type: 'msg'
    };

    try {
      // Handle timeout configuration
      if (formData.timeout_enabled) {
        // Extract timeout value (handle both string and object formats)
        let timeoutSeconds;

        if (formData.timeout_duration) {
          try {
            timeoutSeconds = parseInt(formData.timeout_duration[0].value, 10);
          } catch (e) {
            timeoutSeconds = 300; // Default to 5 minutes
          }
        }

        // Find or create the "No Response" category
        const existingNoResponseCategory =
          originalNode.router?.categories?.find(
            (cat: any) => cat.name === 'No Response'
          );

        const noResponseCategory = existingNoResponseCategory || {
          uuid: generateUUID(),
          name: 'No Response',
          exit_uuid: generateUUID()
        };

        waitConfig.timeout = {
          seconds: timeoutSeconds,
          category_uuid: noResponseCategory.uuid
        };

        // Ensure No Response category and exit exist
        if (
          !router.categories?.some((cat: any) => cat.name === 'No Response')
        ) {
          router.categories = router.categories || [];
          router.categories.push(noResponseCategory);

          // Add corresponding exit if it doesn't exist
          if (
            !exits.some(
              (exit: any) => exit.uuid === noResponseCategory.exit_uuid
            )
          ) {
            const noResponseExit = {
              uuid: noResponseCategory.exit_uuid,
              destination_uuid: existingNoResponseCategory?.exit_uuid
                ? originalNode.exits?.find(
                    (exit) => exit.uuid === existingNoResponseCategory.exit_uuid
                  )?.destination_uuid || null
                : null
            };
            exits.push(noResponseExit);
          }
        }
      } else {
        // Remove "No Response" category if timeout is disabled
        if (router.categories) {
          const noResponseCategoryIndex = router.categories.findIndex(
            (cat: any) => cat.name === 'No Response'
          );
          if (noResponseCategoryIndex !== -1) {
            const noResponseCategory =
              router.categories[noResponseCategoryIndex];

            // Remove the category
            router.categories.splice(noResponseCategoryIndex, 1);

            // Remove corresponding exit
            const exitIndex = exits.findIndex(
              (exit: any) => exit.uuid === noResponseCategory.exit_uuid
            );
            if (exitIndex !== -1) {
              exits.splice(exitIndex, 1);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing timeout configuration:', error);
      // Continue without timeout in case of error
    }

    finalRouter.wait = waitConfig;
    return {
      ...originalNode,
      router: finalRouter,
      exits: exits
    };
  }
};
