import { html } from 'lit-html';
import { ActionConfig, COLORS, ValidationResult } from '../types';
import { Node, SetContactChannel } from '../../store/flow-definition';

export const set_contact_channel: ActionConfig = {
  name: 'Update Contact',
  color: COLORS.update,
  render: (_node: Node, action: SetContactChannel) => {
    return html`<div>
      Set contact channel to <b>${action.channel.name}</b>
    </div>`;
  },
  form: {
    channel: {
      type: 'select',
      label: 'Channel',
      required: true,
      searchable: true,
      clearable: false,
      endpoint: '/api/v2/channels.json',
      valueKey: 'uuid',
      nameKey: 'name',
      helpText: 'Select the channel to set for the contact'
    }
  },
  validate: (formData: SetContactChannel): ValidationResult => {
    const errors: { [key: string]: string } = {};

    if (!formData.channel) {
      errors.channel = 'Channel is required';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
};
