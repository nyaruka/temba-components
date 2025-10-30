import { ACTION_GROUPS, FormData, NodeConfig } from '../types';
import { Node } from '../../store/flow-definition';
import { generateUUID } from '../../utils';
import { html } from 'lit';
import { renderNamedObjects } from '../utils';

export const split_by_subflow: NodeConfig = {
  type: 'split_by_subflow',
  name: 'Enter a Flow',
  group: ACTION_GROUPS.trigger,
  showAsAction: true,
  form: {
    flow: {
      type: 'select',
      required: true,
      placeholder: 'Select a flow...',
      helpText:
        'Once the subflow is complete or expires, the contact will return here',
      endpoint: '/api/v2/flows.json',
      valueKey: 'uuid',
      nameKey: 'name'
    }
  },
  layout: ['flow'],
  render: (node: Node) => {
    const enterFlowAction = node.actions?.find(
      (action) => action.type === 'enter_flow'
    ) as any;
    return html`
      <div class="body">
        ${renderNamedObjects([enterFlowAction?.flow], 'flow')}
      </div>
    `;
  },
  toFormData: (node: Node) => {
    // Extract data from the existing node structure
    const enterFlowAction = node.actions?.find(
      (action) => action.type === 'enter_flow'
    ) as any;

    return {
      uuid: node.uuid,
      flow: enterFlowAction?.flow
        ? [{ uuid: enterFlowAction.flow.uuid, name: enterFlowAction.flow.name }]
        : []
    };
  },
  fromFormData: (formData: FormData, originalNode: Node): Node => {
    // Get flow selection
    const flowSelection =
      Array.isArray(formData.flow) && formData.flow.length > 0
        ? formData.flow[0]
        : null;

    // Find existing enter_flow action to preserve its UUID
    const existingEnterFlowAction = originalNode.actions?.find(
      (action) => action.type === 'enter_flow'
    );
    const enterFlowUuid = existingEnterFlowAction?.uuid || generateUUID();

    // Create enter_flow action
    const enterFlowAction: any = {
      type: 'enter_flow',
      uuid: enterFlowUuid,
      flow: flowSelection
        ? {
            uuid: flowSelection.uuid || flowSelection.value,
            name: flowSelection.name
          }
        : { uuid: '', name: '' }
    };

    // Create categories and exits for Complete and Expired
    const existingCategories = originalNode.router?.categories || [];
    const existingExits = originalNode.exits || [];
    const existingCases = originalNode.router?.cases || [];

    // Find existing Complete category
    const existingCompleteCategory = existingCategories.find(
      (cat) => cat.name === 'Complete'
    );
    const existingCompleteExit = existingCompleteCategory
      ? existingExits.find(
          (exit) => exit.uuid === existingCompleteCategory.exit_uuid
        )
      : null;
    const existingCompleteCase = existingCompleteCategory
      ? existingCases.find(
          (case_) => case_.category_uuid === existingCompleteCategory.uuid
        )
      : null;

    const completeCategoryUuid =
      existingCompleteCategory?.uuid || generateUUID();
    const completeExitUuid = existingCompleteExit?.uuid || generateUUID();
    const completeCaseUuid = existingCompleteCase?.uuid || generateUUID();

    // Find existing Expired category
    const existingExpiredCategory = existingCategories.find(
      (cat) => cat.name === 'Expired'
    );
    const existingExpiredExit = existingExpiredCategory
      ? existingExits.find(
          (exit) => exit.uuid === existingExpiredCategory.exit_uuid
        )
      : null;

    const expiredCategoryUuid = existingExpiredCategory?.uuid || generateUUID();
    const expiredExitUuid = existingExpiredExit?.uuid || generateUUID();

    const categories = [
      {
        uuid: completeCategoryUuid,
        name: 'Complete',
        exit_uuid: completeExitUuid
      },
      {
        uuid: expiredCategoryUuid,
        name: 'Expired',
        exit_uuid: expiredExitUuid
      }
    ];

    const exits = [
      {
        uuid: completeExitUuid,
        destination_uuid: existingCompleteExit?.destination_uuid || null
      },
      {
        uuid: expiredExitUuid,
        destination_uuid: existingExpiredExit?.destination_uuid || null
      }
    ];

    const cases = [
      {
        uuid: completeCaseUuid,
        type: 'has_only_text',
        arguments: ['completed'],
        category_uuid: completeCategoryUuid
      }
    ];

    // Create the router
    const router = {
      type: 'switch' as const,
      categories: categories,
      default_category_uuid: expiredCategoryUuid,
      operand: '@child.status',
      cases: cases
    };

    // Return the complete node
    return {
      uuid: originalNode.uuid,
      actions: [enterFlowAction],
      router: router,
      exits: exits
    };
  }
};
