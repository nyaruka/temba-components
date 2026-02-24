import { html } from 'lit-html';
import { ActionConfig, ACTION_GROUPS, FormData, FlowTypes } from '../types';
import { Node, SetContactChannel } from '../../store/flow-definition';

export const set_contact_channel: ActionConfig = {
  name: 'Update Channel',
  group: ACTION_GROUPS.contacts,
  flowTypes: [FlowTypes.VOICE, FlowTypes.MESSAGE, FlowTypes.BACKGROUND],
  render: (_node: Node, action: SetContactChannel) => {
    return html`<div>Set to <strong>${action.channel.name}</strong></div>`;
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
      placeholder: 'Select channel',
      helpText: 'Select the channel to set for the contact'
    }
  },
  toFormData: (action: SetContactChannel) => {
    return {
      uuid: action.uuid,
      channel: action.channel ? [action.channel] : null
    };
  },
  fromFormData: (formData: FormData): SetContactChannel => {
    const channel = formData.channel?.[0];
    return {
      uuid: formData.uuid,
      type: 'set_contact_channel',
      channel: {
        uuid: channel.uuid || channel.value,
        name: channel.name
      }
    };
  }
};
