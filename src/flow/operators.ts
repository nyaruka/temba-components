// Flow router operator configurations
// These define the available operators for rule-based routing in flow nodes

export interface OperatorConfig {
  type: string;
  name: string;
  operands: number; // Number of operands required (0 = no input needed, 1 = single value, 2 = two values)
  categoryName?: string; // Default category name when operands is 0
  visibility?: 'hidden' | 'visible'; // Whether to show in UI
  filter?: string; // Feature filter requirement
}

// All available operators for flow routing
export const OPERATORS: OperatorConfig[] = [
  // Text operators
  {
    type: 'has_any_word',
    name: 'has any of the words',
    operands: 1
  },
  {
    type: 'has_all_words',
    name: 'has all of the words',
    operands: 1
  },
  {
    type: 'has_phrase',
    name: 'has the phrase',
    operands: 1
  },
  {
    type: 'has_only_phrase',
    name: 'has only the phrase',
    operands: 1
  },
  {
    type: 'has_beginning',
    name: 'starts with',
    operands: 1
  },
  {
    type: 'has_text',
    name: 'has some text',
    operands: 0,
    categoryName: 'Has Text'
  },
  {
    type: 'has_pattern',
    name: 'matches regex',
    operands: 1
  },

  // Number operators
  {
    type: 'has_number',
    name: 'has a number',
    operands: 0,
    categoryName: 'Has Number'
  },
  {
    type: 'has_number_between',
    name: 'has a number between',
    operands: 2
  },
  {
    type: 'has_number_lt',
    name: 'has a number below',
    operands: 1
  },
  {
    type: 'has_number_lte',
    name: 'has a number at or below',
    operands: 1
  },
  {
    type: 'has_number_eq',
    name: 'has a number equal to',
    operands: 1
  },
  {
    type: 'has_number_gte',
    name: 'has a number at or above',
    operands: 1
  },
  {
    type: 'has_number_gt',
    name: 'has a number above',
    operands: 1
  },

  // Date operators
  {
    type: 'has_date',
    name: 'has a date',
    operands: 0,
    categoryName: 'Has Date'
  },
  {
    type: 'has_date_lt',
    name: 'has a date before',
    operands: 1
  },
  {
    type: 'has_date_eq',
    name: 'has a date equal to',
    operands: 1
  },
  {
    type: 'has_date_gt',
    name: 'has a date after',
    operands: 1
  },
  {
    type: 'has_time',
    name: 'has a time',
    operands: 0,
    categoryName: 'Has Time'
  },

  // Contact data operators
  {
    type: 'has_phone',
    name: 'has a phone number',
    operands: 0,
    categoryName: 'Has Phone'
  },
  {
    type: 'has_email',
    name: 'has an email',
    operands: 0,
    categoryName: 'Has Email'
  },

  // Location operators (require location feature)
  {
    type: 'has_state',
    name: 'has state',
    operands: 0,
    categoryName: 'Has State',
    filter: 'HAS_LOCATIONS'
  },
  {
    type: 'has_district',
    name: 'has district',
    operands: 1,
    categoryName: 'Has District',
    filter: 'HAS_LOCATIONS'
  },
  {
    type: 'has_ward',
    name: 'has ward',
    operands: 2,
    categoryName: 'Has Ward',
    filter: 'HAS_LOCATIONS'
  },

  // Intent/classifier operators
  {
    type: 'has_intent',
    name: 'has intent',
    operands: 2 // intent name and confidence threshold
  },
  {
    type: 'has_top_intent',
    name: 'has top intent',
    operands: 2 // intent name and confidence threshold
  },

  // Hidden/system operators
  {
    type: 'has_group',
    name: 'is in the group',
    operands: 1,
    visibility: 'hidden'
  },
  {
    type: 'has_category',
    name: 'has the category',
    operands: 0,
    visibility: 'hidden'
  },
  {
    type: 'has_error',
    name: 'has an error',
    operands: 0,
    categoryName: 'Has Error',
    visibility: 'hidden'
  },
  {
    type: 'has_value',
    name: 'is not empty',
    operands: 0,
    categoryName: 'Not Empty',
    visibility: 'hidden'
  }
];

// Get operators suitable for wait_for_response rules
export const getWaitForResponseOperators = (): OperatorConfig[] => {
  return OPERATORS.filter(
    (op) => op.visibility !== 'hidden' && !op.filter // For now, exclude location operators unless we support feature detection
  );
};

// Get operators suitable for intent classification
export const getIntentOperators = (): OperatorConfig[] => {
  return OPERATORS.filter((op) => op.type === 'has_intent' || op.type === 'has_top_intent');
};

// Get operator configuration by type
export const getOperatorConfig = (type: string): OperatorConfig | undefined => {
  return OPERATORS.find((op) => op.type === type);
};

// Convert operators to select options
export const operatorsToSelectOptions = (operators: OperatorConfig[]) => {
  return operators.map((op) => ({
    value: op.type,
    name: op.name
  }));
};

// Create an operator object for select components
export const createOperatorOption = (
  type: string
): { value: string; name: string } => {
  const config = getOperatorConfig(type);
  return {
    value: type,
    name: config ? config.name : type
  };
};
