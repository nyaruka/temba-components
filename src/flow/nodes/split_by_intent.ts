import { ACTION_GROUPS, FormData, NodeConfig } from '../types';
import { CallClassifier, Node } from '../../store/flow-definition';
import { generateUUID, createRulesRouter } from '../../utils';
import { html } from 'lit';
import {
  getIntentOperators,
  operatorsToSelectOptions,
  getOperatorConfig
} from '../operators';

/**
 * Helper to get operator value from various formats
 */
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

/**
 * Helper to get intent value from various formats
 */
const getIntentValue = (intent: any): string => {
  if (typeof intent === 'string') {
    return intent.trim();
  } else if (Array.isArray(intent) && intent.length > 0) {
    const firstIntent = intent[0];
    if (firstIntent && typeof firstIntent === 'object' && firstIntent.value) {
      return firstIntent.value.trim();
    } else if (typeof firstIntent === 'string') {
      return firstIntent.trim();
    }
  } else if (intent && typeof intent === 'object' && intent.value) {
    return intent.value.trim();
  }
  return '';
};

/**
 * Determines if a rule item is empty
 */
const isEmptyRuleItem = (item: any): boolean => {
  const operatorValue = getOperatorValue(item.operator);
  const intentValue = getIntentValue(item.intent);

  if (!operatorValue || !item.category || item.category.trim() === '') {
    return true;
  }

  if (!intentValue || intentValue === '') {
    return true;
  }

  // threshold is optional, defaults to 0.9
  return false;
};

/**
 * Handles auto-updating category names based on operator and intent changes.
 * This function returns a new handler instance but maintains the same logic.
 */
const createRuleItemChangeHandler = () => {
  return (itemIndex: number, field: string, value: any, allItems: any[]) => {
    const updatedItems = [...allItems];
    const item = { ...updatedItems[itemIndex] };

    // Update the changed field
    item[field] = value;

    // Auto-populate category based on intent if category is empty or default
    if (field === 'intent' && value) {
      const intentValue = getIntentValue(value);
      const oldCategory = item.category || '';

      // Only auto-update if category is empty or matches the old intent value
      const oldIntentValue = getIntentValue(allItems[itemIndex]?.intent);
      if (
        !oldCategory ||
        oldCategory.trim() === '' ||
        oldCategory === oldIntentValue
      ) {
        item.category = intentValue;
      }
    }

    // Auto-populate threshold if not set
    if (field === 'intent' && !item.threshold) {
      item.threshold = '0.9';
    }

    updatedItems[itemIndex] = item;
    return updatedItems;
  };
};

export const split_by_intent: NodeConfig = {
  type: 'split_by_intent',
  name: 'Split by Classifier',
  group: ACTION_GROUPS.services,
  dialogSize: 'large',
  form: {
    classifier: {
      type: 'select',
      label: 'Classifier',
      helpText: 'Select the classifier to use for intent recognition',
      required: true,
      endpoint: '/test-assets/select/classifiers.json',
      valueKey: 'uuid',
      nameKey: 'name',
      placeholder: 'Select a classifier...'
    },
    input: {
      type: 'text',
      label: 'Input',
      helpText: 'The text to classify (defaults to the last message)',
      required: false,
      evaluated: true,
      placeholder: '@input.text',
      optionalLink: 'Run the last response through the classifier...'
    },
    rules: {
      type: 'array',
      helpText: 'Define rules to categorize based on intents',
      itemLabel: 'Rule',
      minItems: 0,
      maxItems: 100,
      sortable: true,
      maintainEmptyItem: true,
      isEmptyItem: isEmptyRuleItem,
      onItemChange: createRuleItemChangeHandler(),
      itemConfig: {
        operator: {
          type: 'select',
          required: true,
          multi: false,
          options: operatorsToSelectOptions(getIntentOperators()),
          flavor: 'xsmall',
          width: '200px'
        },
        intent: {
          type: 'select',
          required: true,
          multi: false,
          flavor: 'xsmall',
          placeholder: 'Select intent',
          getDynamicOptions: (formData?: Record<string, any>) => {
            // Extract intents from the selected classifier
            if (!formData || !formData.classifier || !Array.isArray(formData.classifier) || formData.classifier.length === 0) {
              return [];
            }
            
            const selectedClassifier = formData.classifier[0];
            if (!selectedClassifier || !selectedClassifier.intents || !Array.isArray(selectedClassifier.intents)) {
              return [];
            }
            
            // Return intents as options
            return selectedClassifier.intents.map((intent: string) => ({
              value: intent,
              name: intent
            }));
          },
          allowCreate: true, // Allow typing custom intent names as fallback
          searchable: true
        },
        threshold: {
          type: 'text',
          flavor: 'xsmall',
          placeholder: '0.9',
          width: '80px'
        },
        category: {
          type: 'text',
          placeholder: 'Category',
          required: true,
          maxWidth: '120px',
          flavor: 'xsmall'
        }
      }
    }
  },
  layout: ['classifier', 'input', 'rules'],
  validate: (formData: FormData) => {
    const errors: { [key: string]: string } = {};

    // Validate classifier is provided
    if (!formData.classifier || formData.classifier.length === 0) {
      errors.classifier = 'A classifier is required';
    }

    // Validate threshold values in rules
    if (formData.rules && Array.isArray(formData.rules)) {
      const rules = formData.rules.filter(
        (item: any) => !isEmptyRuleItem(item)
      );

      rules.forEach((rule: any, index: number) => {
        const threshold = rule.threshold || '0.9';
        const thresholdNum = parseFloat(threshold);

        if (isNaN(thresholdNum) || thresholdNum < 0 || thresholdNum > 1) {
          errors.rules = `Invalid threshold in rule ${
            index + 1
          }. Must be between 0 and 1.`;
        }
      });
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  },
  render: (node: Node) => {
    const callClassifierAction = node.actions?.find(
      (action) => action.type === 'call_classifier'
    ) as CallClassifier;
    return html`
      <div class="body">
        Classify with ${callClassifierAction.classifier.name}
      </div>
    `;
  },
  toFormData: async (node: Node) => {
    // Extract data from the existing node structure
    const callClassifierAction = node.actions?.find(
      (action) => action.type === 'call_classifier'
    ) as any;

    // Extract rules from router cases
    const rules = [];
    if (node.router?.cases && node.router?.categories) {
      node.router.cases.forEach((case_: any) => {
        // Skip system categories
        const category = node.router!.categories.find(
          (cat: any) => cat.uuid === case_.category_uuid
        );

        if (
          category &&
          category.name !== 'No Response' &&
          category.name !== 'Other'
        ) {
          const operatorConfig = getOperatorConfig(case_.type);
          const operatorDisplayName = operatorConfig
            ? operatorConfig.name
            : case_.type;

          // For intent operators, arguments are [intent_name, threshold]
          const intentValue = case_.arguments[0] || '';
          const thresholdValue = case_.arguments[1] || '0.9';

          rules.push({
            operator: { value: case_.type, name: operatorDisplayName },
            intent: [{ value: intentValue, name: intentValue }],
            threshold: thresholdValue,
            category: category.name
          });
        }
      });
    }

    // Fetch full classifier data if we only have uuid/name
    let classifierArray = [];
    if (callClassifierAction?.classifier) {
      const classifierUuid = callClassifierAction.classifier.uuid;
      const classifierName = callClassifierAction.classifier.name;
      
      try {
        // Fetch classifier data to get intents
        const response = await fetch('/test-assets/select/classifiers.json');
        const data = await response.json();
        const fullClassifier = data.results.find((c: any) => c.uuid === classifierUuid);
        
        if (fullClassifier) {
          classifierArray = [{
            value: fullClassifier.uuid,
            name: fullClassifier.name,
            intents: fullClassifier.intents,
            type: fullClassifier.type
          }];
        } else {
          // Fallback if classifier not found in endpoint
          classifierArray = [{
            value: classifierUuid,
            name: classifierName
          }];
        }
      } catch (error) {
        // Fallback if fetch fails
        console.error('Failed to fetch classifier data:', error);
        classifierArray = [{
          value: classifierUuid,
          name: classifierName
        }];
      }
    }

    return {
      uuid: node.uuid,
      classifier: classifierArray,
      input: callClassifierAction?.input || '@input.text',
      rules: rules
    };
  },
  fromFormData: (formData: FormData, originalNode: Node): Node => {
    // Get classifier selection
    const classifierSelection =
      Array.isArray(formData.classifier) && formData.classifier.length > 0
        ? formData.classifier[0]
        : null;

    // Get input, default to @input.text
    const input =
      formData.input && formData.input.trim() !== ''
        ? formData.input
        : '@input.text';

    // Find existing call_classifier action to preserve its UUID
    const existingCallClassifierAction = originalNode.actions?.find(
      (action) => action.type === 'call_classifier'
    );
    const callClassifierUuid =
      existingCallClassifierAction?.uuid || generateUUID();

    // Create call_classifier action
    const callClassifierAction: CallClassifier = {
      type: 'call_classifier',
      uuid: callClassifierUuid,
      classifier: classifierSelection
        ? { uuid: classifierSelection.value, name: classifierSelection.name }
        : { uuid: '', name: '' },
      input: input
    };

    // Get user rules
    const userRules = (formData.rules || [])
      .filter((rule: any) => !isEmptyRuleItem(rule))
      .map((rule: any) => {
        const operatorValue = getOperatorValue(rule.operator);
        const intentValue = getIntentValue(rule.intent);
        const thresholdValue = rule.threshold || '0.9';

        return {
          operator: operatorValue,
          value: `${intentValue} ${thresholdValue}`.trim(),
          category: rule.category.trim()
        };
      });

    // Get existing router data for preservation
    const existingCategories = originalNode.router?.categories || [];
    const existingExits = originalNode.exits || [];
    const existingCases = originalNode.router?.cases || [];

    // Create router and exits using existing data when possible
    const { router, exits } = createRulesRouter(
      '@input',
      userRules,
      getOperatorConfig,
      existingCategories,
      existingExits,
      existingCases
    );

    // Return the complete node
    return {
      uuid: originalNode.uuid,
      actions: [callClassifierAction],
      router: router,
      exits: exits
    };
  }
};
