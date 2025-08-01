import { html } from 'lit-html';
import { UIConfig, COLORS, ValidationResult } from '../types';
import { Node, RemoveFromGroup } from '../../store/flow-definition';
import { renderNamedObjects } from '../utils';

export const remove_contact_groups: UIConfig = {
  name: 'Remove from Group',
  color: COLORS.remove,
  render: (_node: Node, action: RemoveFromGroup) => {
    return html`<div>${renderNamedObjects(action.groups, 'group')}</div>`;
  },

  // Form-level transformations - default 1:1 mapping for this case
  toFormData: (action: RemoveFromGroup) => {
    return {
      all_groups: action.all_groups || false,
      groups: action.groups || []
    };
  },

  fromFormData: (formData: any): RemoveFromGroup => {
    return {
      ...formData,
      type: 'remove_contact_groups',
      uuid: formData.uuid || 'new-uuid',
      all_groups: formData.all_groups || false,
      groups: formData.groups || []
    };
  },

  form: {
    all_groups: {
      helpText:
        'Check this to remove the contact from all groups instead of specific ones',
      label: 'Remove from All Groups',
      widget: {
        type: 'temba-checkbox'
      }
    },
    groups: {
      label: 'Groups',
      helpText: 'Select the groups to remove the contact from',
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
      },
      conditions: {
        visible: (formData) => !formData.all_groups,
        required: (formData) => !formData.all_groups
      }
    }
  },
  validate: (action: RemoveFromGroup): ValidationResult => {
    const errors: { [key: string]: string } = {};

    if (!action.all_groups && (!action.groups || action.groups.length === 0)) {
      errors.groups =
        'At least one group must be selected or check "Remove from All Groups"';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
};
