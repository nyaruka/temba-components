import { html } from 'lit-html';
import { ActionConfig, ACTION_GROUPS, FormData } from '../types';
import { Node, AddToGroup } from '../../store/flow-definition';
import { renderNamedObjects } from '../utils';

export const add_contact_groups: ActionConfig = {
  name: 'Add to Group',
  group: ACTION_GROUPS.contacts,
  render: (_node: Node, action: AddToGroup) => {
    return html`<div>${renderNamedObjects(action.groups, 'group')}</div>`;
  },

  // Form-level transformations - default 1:1 mapping for this case
  toFormData: (action: AddToGroup) => {
    return {
      groups: action.groups || null,
      uuid: action.uuid
    };
  },
  form: {
    groups: {
      type: 'select',
      label: 'Groups',
      helpText: 'Select the groups to add the contact to',
      required: true,
      options: [],
      multi: true,
      searchable: true,
      endpoint: '/api/v2/groups.json',
      valueKey: 'uuid',
      nameKey: 'name',
      placeholder: 'Search for groups...',
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
  fromFormData: (formData: FormData): AddToGroup => {
    return {
      uuid: formData.uuid,
      type: 'add_contact_groups',
      groups: formData.groups || []
    };
  }
};
