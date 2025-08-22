import { html } from 'lit-html';
import { ActionConfig, COLORS } from '../types';
import { Node, AddInputLabels } from '../../store/flow-definition';
import { renderNamedObjects } from '../utils';

export const add_input_labels: ActionConfig = {
  name: 'Add Input Labels',
  color: COLORS.update,
  render: (_node: Node, action: AddInputLabels) => {
    return html`<div>${renderNamedObjects(action.labels, 'label')}</div>`;
  },

  // Form-level transformations
  toFormData: (action: AddInputLabels) => {
    return {
      labels: action.labels || [],
      uuid: action.uuid
    };
  },
  form: {
    labels: {
      type: 'select',
      label: 'Labels',
      helpText:
        'Select labels to add to the input. Type a new label name to create it.',
      required: true,
      options: [],
      multi: true,
      searchable: true,
      endpoint: '/api/v2/labels.json',
      valueKey: 'uuid',
      nameKey: 'name',
      placeholder: 'Search for labels or type to create new ones...',
      createArbitraryOption: (input: string, options: any[]) => {
        // Check if a label with this name already exists
        const existing = options.find(
          (option) =>
            option.name.toLowerCase().trim() === input.toLowerCase().trim()
        );
        if (!existing && input.trim()) {
          // Generate a temporary UUID for new labels
          return {
            name: input.trim(),
            value: `temp-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            uuid: `temp-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            arbitrary: true
          };
        }
        return null;
      }
    }
  },
  fromFormData: (formData: any): AddInputLabels => {
    return {
      uuid: formData.uuid,
      type: 'add_input_labels',
      labels: formData.labels || []
    };
  }
};
