import { html } from 'lit-html';
import { ActionConfig, COLORS, ValidationResult } from '../types';
import { Node, RemoveFromGroup } from '../../store/flow-definition';
import { renderNamedObjects } from '../utils';

export const remove_contact_groups: ActionConfig = {
  name: 'Remove from Group',
  color: COLORS.remove,
  render: (_node: Node, action: RemoveFromGroup) => {
    if (action.all_groups) {
      return html`<div>Remove from all groups</div>`;
    }
    return html`<div>${renderNamedObjects(action.groups, 'group')}</div>`;
  },
  toFormData: (action: RemoveFromGroup) => {
    return {
      uuid: action.uuid,
      all_groups: action.all_groups || false,
      groups: action.groups || []
    };
  },
  form: {
    all_groups: {
      type: 'checkbox',
      label: 'Remove from All Groups',
      helpText:
        'Check this to remove the contact from all groups instead of specific ones'
    },
    groups: {
      type: 'select',
      label: 'Groups',
      helpText: 'Select the groups to remove the contact from',
      options: [],
      multi: true,
      searchable: true,
      endpoint: '/api/v2/groups.json',
      valueKey: 'uuid',
      nameKey: 'name',
      placeholder: 'Search for groups...',
      conditions: {
        visible: (formData) => !formData.all_groups
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
  },
  fromFormData: (formData: any): RemoveFromGroup => {
    return {
      uuid: formData.uuid,
      type: 'remove_contact_groups',
      groups: formData.all_groups ? [] : formData.groups || [],
      all_groups: formData.all_groups || false
    };
  }
};
