import { html } from 'lit-html';
import { ActionConfig, ACTION_GROUPS, FormData } from '../types';
import { Node, AddInputLabels } from '../../store/flow-definition';
import { renderNamedObjects } from '../utils';

export const add_input_labels: ActionConfig = {
  name: 'Add Input Labels',
  group: ACTION_GROUPS.save,
  render: (_node: Node, action: AddInputLabels) => {
    return html`<div>${renderNamedObjects(action.labels, 'label')}</div>`;
  },

  // Form-level transformations
  toFormData: (action: AddInputLabels) => {
    return {
      labels: action.labels || null,
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
      allowCreate: true,
      createArbitraryOption: (input: string, options: any[]) => {
        // Check if a label with this name already exists
        const existing = options.find(
          (option) =>
            option.name.toLowerCase().trim() === input.toLowerCase().trim()
        );
        if (!existing && input.trim()) {
          return {
            name: input.trim(),
            arbitrary: true
          };
        }
        return null;
      }
    }
  },
  fromFormData: (formData: FormData): AddInputLabels => {
    return {
      uuid: formData.uuid,
      type: 'add_input_labels',
      labels: formData.labels || []
    };
  }
};
