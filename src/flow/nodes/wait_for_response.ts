import { COLORS, NodeConfig } from '../types';
import { Node, Category, Exit, Case } from '../../store/flow-definition';
import { generateUUID } from '../../utils';
import {
  getWaitForResponseOperators,
  operatorsToSelectOptions,
  getOperatorConfig
} from '../operators';

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
    (cat) =>
      cat.name !== 'No Response' &&
      cat.name !== 'Other' &&
      cat.name !== 'Timeout'
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
        existingCategory = existingUserCategories[categoryCreationOrder];
      }

      const existingExit = existingCategory
        ? existingExits.find((exit) => exit.uuid === existingCategory.exit_uuid)
        : null;

      const exitUuid = existingExit?.uuid || generateUUID();
      const categoryUuid = existingCategory?.uuid || generateUUID();

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

  // Preserve existing timeout categories like "No Response"
  existingCategories.forEach((category) => {
    if (category.name === 'No Response' || category.name === 'Timeout') {
      const existingExit = existingExits.find(
        (exit) => exit.uuid === category.exit_uuid
      );

      if (existingExit) {
        categories.push(category);
        exits.push(existingExit);
      }
    }
  });

  // Add "Other" category (default) only if there are user rules
  if (userRules.length > 0) {
    const existingOtherCategory = existingCategories.find(
      (cat) => cat.name === 'Other'
    );
    const existingOtherExit = existingOtherCategory
      ? existingExits.find(
          (exit) => exit.uuid === existingOtherCategory.exit_uuid
        )
      : null;

    const otherExitUuid = existingOtherExit?.uuid || generateUUID();
    const otherCategoryUuid = existingOtherCategory?.uuid || generateUUID();

    categories.push({
      uuid: otherCategoryUuid,
      name: 'Other',
      exit_uuid: otherExitUuid
    });

    exits.push({
      uuid: otherExitUuid,
      destination_uuid: existingOtherExit?.destination_uuid || null
    });
  }

  return {
    router: {
      type: 'switch' as const,
      categories: categories,
      default_category_uuid: categories.find((cat) => cat.name === 'Other')
        ?.uuid,
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
    result_name: {
      type: 'text',
      label: 'Result Name',
      helpText: 'The name to save the response as',
      placeholder: 'response'
    }
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

        // Skip timeout/system categories like "No Response"
        if (
          category &&
          category.name !== 'No Response' &&
          category.name !== 'Other'
        ) {
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
      result_name: node.router?.result_name || 'response'
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
      const router: any = {
        ...originalNode.router,
        result_name: formData.result_name || 'response'
      };

      // Only set cases to empty if the original node had cases
      if (originalNode.router?.cases !== undefined) {
        router.cases = []; // Clear all cases when no rules
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

        // Find or create the "No Response" category
        let noResponseCategory = originalNode.router?.categories?.find(
          (cat: any) => cat.name === 'No Response'
        );

        if (!noResponseCategory) {
          noResponseCategory = {
            uuid: generateUUID(),
            name: 'No Response',
            exit_uuid: generateUUID()
          };

          // Add to router categories
          router.categories = router.categories || [];
          router.categories.push(noResponseCategory);
        }

        waitConfig.timeout = {
          seconds: timeoutSeconds,
          category_uuid: noResponseCategory.uuid
        };
      }

      router.wait = waitConfig;

      return {
        ...originalNode,
        router
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
      ...router,
      result_name: formData.result_name || 'response'
    };

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
