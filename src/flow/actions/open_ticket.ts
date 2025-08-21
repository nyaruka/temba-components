import { html } from 'lit-html';
import { ActionConfig, COLORS } from '../types';
import { Node, OpenTicket } from '../../store/flow-definition';

export const open_ticket: ActionConfig = {
  name: 'Open Ticket',
  color: COLORS.create,
  render: (_node: Node, action: OpenTicket) => {
    return html`<div>${action.topic.name}</div>`;
  },
  form: {
    topic: {
      type: 'select',
      required: true,
      label: 'Topic',
      placeholder: 'Select a topic',
      options: [],
      endpoint: '/api/v2/topics.json',
      valueKey: 'uuid',
      nameKey: 'name'
    },
    assignee: {
      type: 'select',
      required: false,
      label: 'Assignee',
      placeholder: 'Select an agent (optional)',
      options: [],
      endpoint: '/api/v2/agents.json',
      valueKey: 'uuid',
      nameKey: 'name',
      searchable: true,
      clearable: true
    },
    note: {
      type: 'textarea',
      required: false,
      label: 'Note',
      placeholder: 'Enter a note for the ticket (optional)',
      minHeight: 100
    }
  },
  layout: ['topic', 'assignee', 'note'],
  toFormData: (action: OpenTicket) => {
    return {
      uuid: action.uuid,
      topic: action.topic
        ? [{ value: action.topic.uuid, name: action.topic.name }]
        : [],
      assignee: action.assignee
        ? [{ value: action.assignee.uuid, name: action.assignee.name }]
        : [],
      note: action.note || ''
    };
  },
  fromFormData: (data: Record<string, any>) => {
    return {
      uuid: data.uuid,
      type: 'open_ticket',
      topic:
        data.topic && data.topic.length > 0
          ? {
              uuid: data.topic[0].value,
              name: data.topic[0].name
            }
          : undefined,
      assignee:
        data.assignee && data.assignee.length > 0
          ? {
              uuid: data.assignee[0].value,
              name: data.assignee[0].name
            }
          : undefined,
      note: data.note || ''
    } as OpenTicket;
  }
};
