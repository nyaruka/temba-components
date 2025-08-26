import { COLORS, NodeConfig } from '../types';
import { Node } from '../../store/flow-definition';
import { generateUUID } from '../../utils';
import { html } from 'lit';

export const split_by_ticket: NodeConfig = {
  type: 'split_by_ticket',
  name: 'Split by Ticket',
  color: COLORS.create,
  form: {
    topic: {
      type: 'select',
      label: 'Topic',
      required: true,
      placeholder: 'Select a topic',
      options: [],
      endpoint: '/api/v2/topics.json',
      valueKey: 'uuid',
      nameKey: 'name',
      maxWidth: '200px'
    },
    assignee: {
      type: 'select',
      label: 'Assignee',
      required: false,
      placeholder: 'Select an agent (optional)',
      options: [],
      endpoint: '/api/v2/users.json',
      valueKey: 'uuid',
      getName: (item: {
        first_name?: string;
        last_name?: string;
        name?: string;
      }) => {
        return item.name || [item.first_name, item.last_name].join(' ');
      },
      clearable: true
    },
    note: {
      type: 'textarea',
      label: 'Note',
      required: false,
      placeholder: 'Enter a note for the ticket (optional)',
      minHeight: 100
    }
  },
  layout: [{ type: 'row', items: ['topic', 'assignee'] }, 'note'],
  render: (node: Node) => {
    const openTicketAction = node.actions?.find(
      (action) => action.type === 'open_ticket'
    ) as any;
    return html`
      <div class="body">
        ${openTicketAction?.topic?.name || 'Configure ticket'}
      </div>
    `;
  },
  toFormData: (node: Node) => {
    // Extract data from the existing node structure
    const openTicketAction = node.actions?.find(
      (action) => action.type === 'open_ticket'
    ) as any;

    return {
      uuid: node.uuid,
      topic: openTicketAction?.topic
        ? [
            {
              uuid: openTicketAction.topic.uuid,
              name: openTicketAction.topic.name
            }
          ]
        : [],
      assignee: openTicketAction?.assignee
        ? [
            {
              uuid: openTicketAction.assignee.uuid,
              name: openTicketAction.assignee.name
            }
          ]
        : [],
      note: openTicketAction?.note || ''
    };
  },
  fromFormData: (formData: any, originalNode: Node): Node => {
    // Find existing open_ticket action to preserve its UUID
    const existingOpenTicketAction = originalNode.actions?.find(
      (action) => action.type === 'open_ticket'
    );
    const openTicketUuid = existingOpenTicketAction?.uuid || generateUUID();

    // Create open_ticket action
    const openTicketAction: any = {
      type: 'open_ticket',
      uuid: openTicketUuid,
      topic:
        formData.topic && formData.topic.length > 0
          ? {
              uuid: formData.topic[0].uuid,
              name: formData.topic[0].name
            }
          : undefined,
      assignee:
        formData.assignee && formData.assignee.length > 0
          ? {
              uuid: formData.assignee[0].uuid,
              name:
                formData.assignee[0].name ||
                [
                  formData.assignee[0].first_name,
                  formData.assignee[0].last_name
                ].join(' ')
            }
          : undefined,
      note: formData.note || ''
    };

    // Create categories and exits for Success and Failure
    const existingCategories = originalNode.router?.categories || [];
    const existingExits = originalNode.exits || [];
    const existingCases = originalNode.router?.cases || [];

    // Find existing Success category
    const existingSuccessCategory = existingCategories.find(
      (cat) => cat.name === 'Success'
    );
    const existingSuccessExit = existingSuccessCategory
      ? existingExits.find(
          (exit) => exit.uuid === existingSuccessCategory.exit_uuid
        )
      : null;
    const existingSuccessCase = existingSuccessCategory
      ? existingCases.find(
          (case_) => case_.category_uuid === existingSuccessCategory.uuid
        )
      : null;

    const successCategoryUuid = existingSuccessCategory?.uuid || generateUUID();
    const successExitUuid = existingSuccessExit?.uuid || generateUUID();
    const successCaseUuid = existingSuccessCase?.uuid || generateUUID();

    // Find existing Failure category
    const existingFailureCategory = existingCategories.find(
      (cat) => cat.name === 'Failure'
    );
    const existingFailureExit = existingFailureCategory
      ? existingExits.find(
          (exit) => exit.uuid === existingFailureCategory.exit_uuid
        )
      : null;

    const failureCategoryUuid = existingFailureCategory?.uuid || generateUUID();
    const failureExitUuid = existingFailureExit?.uuid || generateUUID();

    const categories = [
      {
        uuid: successCategoryUuid,
        name: 'Success',
        exit_uuid: successExitUuid
      },
      {
        uuid: failureCategoryUuid,
        name: 'Failure',
        exit_uuid: failureExitUuid
      }
    ];

    const exits = [
      {
        uuid: successExitUuid,
        destination_uuid: existingSuccessExit?.destination_uuid || null
      },
      {
        uuid: failureExitUuid,
        destination_uuid: existingFailureExit?.destination_uuid || null
      }
    ];

    const cases = [
      {
        uuid: successCaseUuid,
        type: 'has_text',
        arguments: [],
        category_uuid: successCategoryUuid
      }
    ];

    // Create the router
    const router = {
      type: 'switch' as const,
      categories: categories,
      default_category_uuid: failureCategoryUuid,
      operand: '@locals._new_ticket',
      cases: cases
    };

    // Return the complete node
    return {
      uuid: originalNode.uuid,
      actions: [openTicketAction],
      router: router,
      exits: exits
    };
  }
};
