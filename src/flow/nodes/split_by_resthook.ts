import { ACTION_GROUPS, FormData, NodeConfig } from '../types';
import { CallResthook, Node } from '../../store/flow-definition';
import { generateUUID, createSuccessFailureRouter } from '../../utils';
import { html } from 'lit';
import { resultNameField } from './shared';

export const split_by_resthook: NodeConfig = {
  type: 'split_by_resthook',
  name: 'Call Resthook',
  group: ACTION_GROUPS.services,
  showAsAction: true,
  form: {
    resthook: {
      type: 'select',
      label: 'Resthook',
      required: true,
      searchable: true,
      clearable: false,
      placeholder: 'Select a resthook...',
      endpoint: '/api/resthooks.json',
      valueKey: 'resthook',
      nameKey: 'resthook',
      helpText: 'Select the resthook to call'
    },
    result_name: resultNameField
  },
  layout: ['resthook', 'result_name'],
  validate: (formData: FormData) => {
    const errors: { [key: string]: string } = {};

    // validate resthook is provided
    if (!formData.resthook || formData.resthook.length === 0) {
      errors.resthook = 'A resthook is required';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  },
  render: (node: Node) => {
    const callResthookAction = node.actions?.find(
      (action) => action.type === 'call_resthook'
    ) as CallResthook;
    return html`
      <div
        class="body"
        style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;"
      >
        ${callResthookAction?.resthook || 'Configure resthook'}
      </div>
    `;
  },
  toFormData: (node: Node) => {
    // extract data from the existing node structure
    const callResthookAction = node.actions?.find(
      (action) => action.type === 'call_resthook'
    ) as CallResthook;

    return {
      uuid: node.uuid,
      resthook: callResthookAction?.resthook
        ? [
            {
              value: callResthookAction.resthook,
              name: callResthookAction.resthook
            }
          ]
        : [],
      result_name: callResthookAction?.result_name || ''
    };
  },
  fromFormData: (formData: FormData, originalNode: Node): Node => {
    // get resthook selection
    const resthookSelection =
      Array.isArray(formData.resthook) && formData.resthook.length > 0
        ? formData.resthook[0]
        : null;

    if (!resthookSelection) {
      return originalNode;
    }

    // find existing call_resthook action to preserve its UUID
    const existingCallResthookAction = originalNode.actions?.find(
      (action) => action.type === 'call_resthook'
    );
    const callResthookUuid = existingCallResthookAction?.uuid || generateUUID();

    // create call_resthook action
    const callResthookAction: CallResthook = {
      type: 'call_resthook',
      uuid: callResthookUuid,
      resthook: resthookSelection.value,
      result_name: formData.result_name?.trim() || ''
    };

    // create categories and exits for Success and Failure
    const existingCategories = originalNode.router?.categories || [];
    const existingExits = originalNode.exits || [];
    const existingCases = originalNode.router?.cases || [];

    const { router, exits } = createSuccessFailureRouter(
      '@webhook.json.status',
      {
        type: 'has_text',
        arguments: []
      },
      existingCategories,
      existingExits,
      existingCases
    );

    // return the complete node
    return {
      uuid: originalNode.uuid,
      actions: [callResthookAction],
      router: router,
      exits: exits
    };
  }
};
