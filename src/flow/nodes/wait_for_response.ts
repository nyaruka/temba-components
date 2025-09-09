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

  // Create categories, exits, and cases for user-defined rules
  userRules.forEach((rule) => {
    // Try to find existing category by name
    const existingCategory = existingCategories.find(
      (cat) => cat.name === rule.category
    );
    const existingExit = existingCategory
      ? existingExits.find((exit) => exit.uuid === existingCategory.exit_uuid)
      : null;
    const existingCase = existingCategory
      ? existingCases.find(
          (case_) => case_.category_uuid === existingCategory.uuid
        )
      : null;

    const exitUuid = existingExit?.uuid || generateUUID();
    const categoryUuid = existingCategory?.uuid || generateUUID();
    const caseUuid = existingCase?.uuid || generateUUID();

    categories.push({
      uuid: categoryUuid,
      name: rule.category,
      exit_uuid: exitUuid
    });

    exits.push({
      uuid: exitUuid,
      destination_uuid: existingExit?.destination_uuid || null
    });

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
      category_uuid: categoryUuid
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
  form: {
    rules: {
      type: 'array',
      label: 'Rules',
      helpText: 'Define rules to categorize responses',
      itemLabel: 'Rule',
      minItems: 0,
      maxItems: 100,
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
        if (operatorConfig && operatorConfig.operands > 0) {
          // Value is required for this operator
          return !item.value || item.value.trim() === '';
        }

        // No value required for this operator
        return false;
      },
      itemConfig: {
        operator: {
          type: 'select',
          required: true,
          multi: false, // Explicitly set as single-select
          options: operatorsToSelectOptions(getWaitForResponseOperators())
        },
        value: {
          type: 'text',
          placeholder: 'Value to match',
          conditions: {
            visible: (formData: Record<string, any>) => {
              // Show value field only if operator requires operands
              const operatorConfig = getOperatorConfig(formData.operator);
              return operatorConfig ? operatorConfig.operands > 0 : true;
            }
          }
        },
        category: {
          type: 'text',
          placeholder: 'Category name',
          required: true
        }
      }
    },
    timeout_enabled: {
      type: 'checkbox',
      label: 'Continue when there is no response for',
      maxWidth: '290px'
    },
    timeout_duration: {
      type: 'select',
      placeholder: '5 minutes',
      multi: false,

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
  layout: [
    'rules',
    { type: 'row', items: ['timeout_enabled', 'timeout_duration'] },
    'result_name'
  ],
  validate: (formData: any) => {
    const errors: { [key: string]: string } = {};

    // Check for duplicate category names in rules
    if (formData.rules && Array.isArray(formData.rules)) {
      const rules = formData.rules.filter(
        (rule: any) => rule?.category && rule.category.trim() !== ''
      );

      // Find all categories that have duplicates (case-insensitive)
      const duplicateCategories = [];
      const lowerCaseMap = new Map();

      // First pass: map lowercase names to all original cases
      rules.forEach((rule) => {
        const lowerName = rule.category.trim().toLowerCase();
        if (!lowerCaseMap.has(lowerName)) {
          lowerCaseMap.set(lowerName, []);
        }
        lowerCaseMap.get(lowerName).push(rule.category.trim());
      });

      // Second pass: collect all names that appear more than once
      lowerCaseMap.forEach((originalNames) => {
        if (originalNames.length > 1) {
          duplicateCategories.push(...originalNames);
        }
      });

      if (duplicateCategories.length > 0) {
        const uniqueDuplicates = [...new Set(duplicateCategories)];
        errors.rules = `Duplicate category names found: ${uniqueDuplicates.join(
          ', '
        )}`;
      }
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
          let value = '';

          if (operatorConfig && operatorConfig.operands === 0) {
            // No value needed for operators like has_text, has_number
            value = '';
          } else {
            // Join arguments for operators that require values
            value = case_.arguments.join(' ');
          }

          rules.push({
            operator: { value: case_.type, name: operatorDisplayName },
            value: value,
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
        if (operatorConfig && operatorConfig.operands > 0) {
          // Value is required for this operator
          return rule?.value && rule.value.trim() !== '';
        }

        // No value required for this operator
        return true;
      })
      .map((rule: any) => {
        const operatorValue = getOperatorValue(rule.operator);
        return {
          operator: operatorValue,
          value: rule.value ? rule.value.trim() : '',
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
