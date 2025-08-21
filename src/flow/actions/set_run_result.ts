import { html } from 'lit-html';
import { ActionConfig, COLORS } from '../types';
import { Node, SetRunResult } from '../../store/flow-definition';
import { getStore } from '../../store/Store';

export const set_run_result: ActionConfig = {
  name: 'Save Flow Result',
  color: COLORS.save,
  render: (_node: Node, action: SetRunResult) => {
    return html`<div>Save ${action.value} as <b>${action.name}</b></div>`;
  },
  form: {
    name: {
      type: 'select',
      label: 'Result Name',
      helpText: 'Select an existing result name or type a new one',
      required: true,
      placeholder: 'Select or enter result name...',
      tags: true,
      searchable: true,
      clearable: false,
      options: []
    },
    value: {
      type: 'text',
      label: 'Value',
      helpText: 'The value to save for this result (can use expressions)',
      required: false,
      evaluated: true,
      placeholder: 'Enter value...'
    },
    category: {
      type: 'text',
      label: 'Category',
      helpText: 'Optional category for this result',
      required: false,
      placeholder: 'Enter category...'
    }
  },
  layout: ['name', 'value', 'category'],
  toFormData: (action: SetRunResult) => {
    // Get existing flow results to populate the select options
    const store = getStore();
    const flowResults = store ? store.getState().getFlowResults() : [];

    // Update the form configuration with dynamic options
    const config = set_run_result;
    if (config.form && config.form.name && config.form.name.type === 'select') {
      (config.form.name as any).options = flowResults.map(
        (result) => result.name
      );
    }

    return {
      uuid: action.uuid,
      name: action.name || '',
      value: action.value || '',
      category: action.category || ''
    };
  },
  fromFormData: (formData: any): SetRunResult => {
    // Ensure name is a simple string, handling both direct values and select option objects
    let name = formData.name || '';
    if (Array.isArray(name) && name.length > 0) {
      // If it's an array (from multi-select), take the first item
      name = name[0];
    }
    if (typeof name === 'object' && name.value) {
      // If it's an option object, extract the value
      name = name.value;
    }
    if (typeof name === 'object' && name.name) {
      // If it's an option object with name property, extract it
      name = name.name;
    }

    return {
      uuid: formData.uuid,
      type: 'set_run_result',
      name: String(name), // Ensure it's always a string
      value: formData.value || '',
      category: formData.category || ''
    };
  }
};
