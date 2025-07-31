import { html } from 'lit-html';
import { UIConfig, COLORS, ValidationResult } from '../types';
import { Node, AddToGroup } from '../../store/flow-definition';
import { renderNamedObjects } from '../utils';

export const add_contact_groups: UIConfig = {
  name: 'Add to Group',
  color: COLORS.add,
  render: (node: Node, action: AddToGroup) => {
    return html`<div>${renderNamedObjects(action.groups, 'group')}</div>`;
  },
  properties: {
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
  validate: (action: AddToGroup): ValidationResult => {
    const errors: { [key: string]: string } = {};

    if (!action.groups || action.groups.length === 0) {
      errors.groups = 'At least one group must be selected';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
};
