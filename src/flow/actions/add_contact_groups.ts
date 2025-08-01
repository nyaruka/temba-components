import { html } from 'lit-html';
import { ActionConfig, COLORS } from '../types';
import { Node, AddToGroup } from '../../store/flow-definition';
import { renderNamedObjects } from '../utils';

export const add_contact_groups: ActionConfig = {
  name: 'Add to Group',
  color: COLORS.add,
  render: (_node: Node, action: AddToGroup) => {
    return html`<div>${renderNamedObjects(action.groups, 'group')}</div>`;
  },

  // Form-level transformations - default 1:1 mapping for this case
  toFormData: (action: AddToGroup) => {
    return {
      groups: action.groups || [],
      uuid: action.uuid
    };
  },
  form: {
    groups: {
      label: 'Groups',
      helpText: 'Select the groups to add the contact to',
      required: true,
      widget: {
        type: 'temba-select',
        attributes: {
          multi: true,
          searchable: true,
          endpoint: '/api/v2/groups.json',
          valueKey: 'uuid',
          nameKey: 'name',
          placeholder: 'Search for groups...'
        }
      }
    }
  },
  fromFormData: (formData: any): AddToGroup => {
    return {
      uuid: formData.uuid,
      type: 'add_contact_groups',
      groups: formData.groups || []
    };
  }
};
