import { TextFieldConfig } from '../types';

/**
 * Shared result_name field configuration for router nodes.
 * This provides a consistent "Save as..." optional field interface across all splits.
 *
 * The field is hidden by default and revealed via a "Save as..." link.
 * Once revealed, it cannot be hidden again (the link disappears).
 * If the field already has a value, it's shown immediately without the link.
 */
export const resultNameField: TextFieldConfig = {
  type: 'text',
  label: 'Result Name',
  required: false,
  placeholder: '(optional)',
  helpText: 'The name to use to reference this result in the flow',
  optionalLink: 'Save result as...'
};
