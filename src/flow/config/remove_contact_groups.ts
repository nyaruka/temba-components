import { html } from 'lit-html';
import { UIConfig, COLORS, ValidationResult } from '../types';
import { Node, RemoveFromGroup } from '../../store/flow-definition';
import { renderNamedObjects } from '../utils';

const render = (node: Node, action: RemoveFromGroup) => {
  return html`<div>${renderNamedObjects(action.groups, 'group')}</div>`;
};

export const remove_contact_groups: UIConfig = {
  name: 'Remove from Group',
  color: COLORS.remove,
  render,
  properties: {
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
