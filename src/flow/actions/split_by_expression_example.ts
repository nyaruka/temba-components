import { html } from 'lit-html';
import { ActionConfig, COLORS } from '../types';

// utility function to generate category from operand
const generateCategoryFromOperand = (operand: string): string => {
  if (!operand) return '';

  // clean up the operand to make a reasonable category name
  return operand
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // remove special chars
    .replace(/\s+/g, '_') // replace spaces with underscores
    .slice(0, 20); // limit length
};

export const split_by_expression: ActionConfig = {
  name: 'Split by Expression',
  color: COLORS.split,
  fields: {
    operand: {
      type: 'text',
      label: 'Split by',
      required: true,
      evaluated: true,
      placeholder: 'Enter expression to evaluate'
    },
    rules: {
      type: 'array',
      label: 'Rules',
      sortable: true,
      minItems: 1,
      itemLabel: 'Rule',
      itemConfig: {
        operator: {
          type: 'select',
          label: 'Operator',
          required: true,
          options: [
            { value: 'contains', label: 'contains' },
            { value: 'equals', label: 'equals' },
            { value: 'starts_with', label: 'starts with' },
            { value: 'regex', label: 'regex' }
          ]
        },
        operand: {
          type: 'text',
          label: 'Value',
          required: true,
          evaluated: true,
          placeholder: 'Value to compare against'
        },
        category: {
          type: 'text',
          label: 'Category',
          required: true,
          placeholder: 'Category name for this rule'
        }
      },
      // handle changes at the item level
      onItemChange: (
        itemIndex: number,
        field: string,
        value: any,
        allItems: any[]
      ) => {
        const updatedItems = [...allItems];
        const item = { ...updatedItems[itemIndex] };

        // update the changed field
        item[field] = value;

        // if operand changed and category is empty, auto-generate category
        if (
          field === 'operand' &&
          (!item.category || item.category.trim() === '')
        ) {
          item.category = generateCategoryFromOperand(value);
        }

        updatedItems[itemIndex] = item;
        return updatedItems;
      }
    }
  },
  render: (_node: any, action: any) => {
    return html`<div>${action.operand || 'Split by expression'}</div>`;
  }
};
