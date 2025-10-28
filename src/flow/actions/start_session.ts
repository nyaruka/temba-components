import { html } from 'lit-html';
import {
  ActionConfig,
  EDITOR_TYPES,
  FormData,
  ValidationResult
} from '../types';
import { Node, StartSession } from '../../store/flow-definition';
import { renderNamedObjects } from '../utils';

export const start_session: ActionConfig = {
  name: 'Start Somebody Else',
  editorType: EDITOR_TYPES.execute,
  render: (_node: Node, action: StartSession) => {
    const hasGroups = action.groups && action.groups.length > 0;
    const hasContacts = action.contacts && action.contacts.length > 0;
    const hasRecipients = hasGroups || hasContacts;

    // Build the recipients display
    let recipientsDisplay = html``;
    if (action.create_contact) {
      recipientsDisplay = html`Create a new contact`;
    } else if ((action as any).contact_query) {
      recipientsDisplay = html`${(action as any).contact_query}`;
    } else if (hasRecipients) {
      const allRecipients = [
        ...(action.contacts || []),
        ...(action.groups || [])
      ];
      recipientsDisplay = html`${renderNamedObjects(
        allRecipients,
        hasGroups ? 'group' : 'contact'
      )}`;
    }

    return html`
      <div>
        <div
          style="padding: 3px 10px; background: #f5f5f5; font-size: 11px; border-radius: var(--curvature); margin-bottom: 10px;"
        >
          ${recipientsDisplay}
        </div>
        <div style="padding: 0px 10px;">
          ${renderNamedObjects([action.flow], 'flow')}
        </div>
      </div>
    `;
  },

  toFormData: (action: StartSession) => {
    const extendedAction = action as StartSession & {
      contact_query?: string;
      exclusions?: { in_a_flow?: boolean };
    };

    // Determine start type based on action properties
    let startTypeValue = 'manual';
    if (action.create_contact) {
      startTypeValue = 'create';
    } else if (extendedAction.contact_query) {
      startTypeValue = 'query';
    }

    // Map value to full option object for proper display
    const startTypeOptions = [
      { value: 'manual', name: 'Select recipients manually' },
      { value: 'query', name: 'Select a contact with a query' },
      { value: 'create', name: 'Create a new contact' }
    ];
    const startType =
      startTypeOptions.find((opt) => opt.value === startTypeValue) ||
      startTypeOptions[0];

    return {
      flow: action.flow ? [action.flow] : null,
      recipients: [...(action.contacts || []), ...(action.groups || [])],
      startType: [startType],
      contactQuery: extendedAction.contact_query || '',
      skipContactsInFlow: extendedAction.exclusions?.in_a_flow || false,
      uuid: action.uuid
    };
  },

  form: {
    flow: {
      type: 'select',
      label: 'Flow',
      helpText: 'Select the flow to start',
      required: true,
      searchable: true,
      endpoint: '/api/v2/flows.json',
      valueKey: 'uuid',
      nameKey: 'name',
      placeholder: 'Select a flow...'
    },
    startType: {
      type: 'select',
      label: 'Start Type',
      helpText: 'How should contacts be selected?',
      required: true,
      options: [
        { value: 'manual', name: 'Select recipients manually' },
        { value: 'query', name: 'Select a contact with a query' },
        { value: 'create', name: 'Create a new contact' }
      ]
    },
    recipients: {
      type: 'select',
      label: 'Recipients',
      helpText: 'Select who should be started in the flow',
      options: [],
      multi: true,
      searchable: true,
      endpoint: '/api/v2/contacts.json',
      valueKey: 'uuid',
      nameKey: 'name',
      placeholder: 'Search for contacts or groups...',
      conditions: {
        visible: (formData: FormData) => {
          const startType = formData.startType?.[0]?.value;
          return startType === 'manual';
        }
      }
    },
    contactQuery: {
      type: 'text',
      evaluated: true,
      label: 'Contact Query',
      helpText: 'Only one matching contact will be started',
      placeholder: 'household_id = @fields.household_id',
      conditions: {
        visible: (formData: FormData) => {
          const startType = formData.startType?.[0]?.value;
          return startType === 'query';
        }
      }
    },
    skipContactsInFlow: {
      type: 'checkbox',
      label: 'Skip contacts currently in a flow',
      helpText: 'Avoid interrupting a contact who is already in a flow'
    }
  },

  layout: [
    'flow',
    'startType',
    'recipients',
    'contactQuery',
    'skipContactsInFlow'
  ],

  validate: (formData: FormData): ValidationResult => {
    const errors: { [key: string]: string } = {};

    const startType = formData.startType?.[0]?.value;

    // Check if manual selection has recipients
    if (
      startType === 'manual' &&
      (!formData.recipients || formData.recipients.length === 0)
    ) {
      errors.recipients = 'At least one contact or group must be selected';
    }

    // Check if query has a query string
    if (
      startType === 'query' &&
      (!formData.contactQuery || !formData.contactQuery.trim())
    ) {
      errors.contactQuery = 'Contact query is required';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  },

  fromFormData: (formData: FormData): StartSession => {
    const action: StartSession & {
      contact_query?: string;
      exclusions?: { in_a_flow: boolean };
    } = {
      uuid: formData.uuid,
      type: 'start_session',
      flow: formData.flow[0],
      groups: [],
      contacts: []
    };

    // Get the start type value from array
    const startTypeValue = formData.startType[0].value;

    // Handle different start types
    if (startTypeValue === 'create') {
      action.create_contact = true;
    } else if (startTypeValue === 'query') {
      action.contact_query = formData.contactQuery || '';
    } else {
      // Manual selection - separate contacts and groups
      const recipients = formData.recipients || [];
      action.contacts = recipients.filter((r: any) => !r.group);
      action.groups = recipients.filter((r: any) => r.group);
    }

    // Add exclusions if set
    if (formData.skipContactsInFlow) {
      action.exclusions = { in_a_flow: true };
    }

    return action;
  }
};
