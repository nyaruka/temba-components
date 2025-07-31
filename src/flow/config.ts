/**
 * Simple type-safe Property configuration system for Action Editor components
 *
 * This provides a clean, intuitive structure where type safety is implicitly enforced:
 *
 * ```typescript
 * properties: {
 *   text: {
 *     label: 'Message Text',
 *     required: true,
 *     widget: {
 *       type: 'temba-completion',
 *       attributes: {
 *         textarea: true,
 *         expressions: 'session'
 *         // multi: true  // ❌ TypeScript Error - not valid for completion
 *       }
 *     }
 *   },
 *   quick_replies: {
 *     label: 'Quick Replies',
 *     widget: {
 *       type: 'temba-select',
 *       attributes: {
 *         multi: true,
 *         searchable: true,
 *         maxItems: 10
 *         // textarea: true  // ❌ TypeScript Error - not valid for select
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * The `widget.type` automatically restricts what's allowed in `widget.attributes`.
 */
import { TemplateResult } from 'lit-html';
import {
  renderAddContactUrn,
  renderAddInputLabels,
  renderAddToGroups,
  renderCallClassifier,
  renderCallLLM,
  renderCallResthook,
  renderCallWebhook,
  renderEnterFlow,
  renderOpenTicket,
  renderPlayAudio,
  renderRemoveFromGroups,
  renderRequestOptin,
  renderSayMsg,
  renderSendBroadcast,
  renderSendEmail,
  renderSendMsg,
  renderSetContactChannel,
  renderSetContactField,
  renderSetContactLanguage,
  renderSetContactName,
  renderSetContactStatus,
  renderSetRunResult,
  renderStartSession,
  renderTransferAirtime,
  renderWaitForAudio,
  renderWaitForDigits,
  renderWaitForImage,
  renderWaitForLocation,
  renderWaitForMenu,
  renderWaitForResponse,
  renderWaitForVideo
} from './render';
import { Action, SendMsg, AddToGroup } from '../store/flow-definition';

export interface ValidationResult {
  valid: boolean;
  errors: { [key: string]: string };
}

// Component attribute interfaces - these define what's allowed for each component type
export interface TextInputAttributes {
  type?: 'text' | 'email' | 'number' | 'url' | 'tel';
  placeholder?: string;
  clearable?: boolean;
  maxlength?: number;
  gsm?: boolean;
  autogrow?: boolean;
  textarea?: boolean;
  submitOnEnter?: boolean;
}

export interface CompletionAttributes {
  placeholder?: string;
  clearable?: boolean;
  maxlength?: number;
  gsm?: boolean;
  autogrow?: boolean;
  textarea?: boolean;
  expressions?: string;
  counter?: string;
}

export interface SelectAttributes {
  placeholder?: string;
  multi?: boolean;
  searchable?: boolean;
  tags?: boolean;
  clearable?: boolean;
  endpoint?: string;
  valueKey?: string;
  nameKey?: string;
  queryParam?: string;
  maxItems?: number;
  maxItemsText?: string;
  expressions?: string;
  options?: Array<{ name: string; value: any }>;
  sorted?: boolean;
  allowCreate?: boolean;
  jsonValue?: boolean;
  spaceSelect?: boolean;
  infoText?: string;
}

export interface CheckboxAttributes {
  size?: number;
  disabled?: boolean;
  animateChange?: string;
}

export interface SliderAttributes {
  min?: number;
  max?: number;
  range?: boolean;
}

// Widget configuration using discriminated union for type safety
export type WidgetConfig =
  | { type: 'temba-textinput'; attributes?: TextInputAttributes }
  | { type: 'temba-completion'; attributes?: CompletionAttributes }
  | { type: 'temba-select'; attributes?: SelectAttributes }
  | { type: 'temba-checkbox'; attributes?: CheckboxAttributes }
  | { type: 'temba-slider'; attributes?: SliderAttributes }
  | { type: string; attributes?: { [key: string]: any } }; // Generic fallback

// Property configuration with the clean structure you want
export interface PropertyConfig {
  // Form field metadata
  label?: string;
  helpText?: string;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;

  // Widget configuration
  widget: WidgetConfig;

  // Data transformation functions
  toFormValue?: (actionValue: any) => any;
  fromFormValue?: (formValue: any) => any;
}

export interface UIConfig {
  name: string;
  color: string;
  render?: (node: any, action: any) => TemplateResult;

  // Action editor configuration
  properties?: {
    [propertyName: string]: PropertyConfig;
  };
  validate?: (action: Action) => ValidationResult;
}

const COLORS = {
  send: '#3498db',
  update: '#01c1af',
  broadcast: '#8e5ea7',
  call: '#e68628',
  create: '#df419f',
  save: '#1a777c',
  split: '#aaaaaa',
  execute: '#666666',
  wait: '#4d7dad',
  add: '#309c42',
  remove: '#e74c3c'
};

export const EDITOR_CONFIG: {
  [key: string]: UIConfig;
} = {
  add_input_labels: {
    name: 'Add Labels',
    color: COLORS.update,
    render: renderAddInputLabels
  },
  add_contact_urn: {
    name: 'Add Contact URN',
    color: COLORS.update,
    render: renderAddContactUrn
  },
  set_contact_field: {
    name: 'Update Contact Field',
    color: COLORS.update,
    render: renderSetContactField
  },
  set_contact_channel: {
    name: 'Update Contact Channel',
    color: COLORS.update,
    render: renderSetContactChannel
  },
  set_contact_language: {
    name: 'Update Contact Language',
    color: COLORS.update,
    render: renderSetContactLanguage
  },
  set_contact_status: {
    name: 'Update Contact Status',
    color: COLORS.update,
    render: renderSetContactStatus
  },
  send_broadcast: {
    name: 'Send Broadcast',
    color: COLORS.broadcast,
    render: renderSendBroadcast
  },
  set_run_result: {
    name: 'Save Flow Result',
    color: COLORS.save,
    render: renderSetRunResult
  },
  send_msg: {
    name: 'Send Message',
    color: COLORS.send,
    render: renderSendMsg,
    properties: {
      text: {
        label: 'Message Text',
        helpText:
          'Enter the message to send. You can use expressions like @contact.name',
        required: true,
        widget: {
          type: 'temba-completion',
          attributes: {
            textarea: true,
            expressions: 'session'
          }
        }
      },
      quick_replies: {
        label: 'Quick Replies',
        helpText: 'Add quick reply options for this message',
        widget: {
          type: 'temba-select',
          attributes: {
            multi: true,
            tags: true,
            searchable: true,
            placeholder: 'Add quick replies...',
            expressions: 'session',
            nameKey: 'name',
            valueKey: 'value',
            maxItems: 10,
            maxItemsText: 'You can add up to 10 quick replies'
          }
        },
        // Transform string array to name/value objects for the form
        toFormValue: (actionValue: string[]) => {
          if (!Array.isArray(actionValue)) return [];
          return actionValue.map((text) => ({ name: text, value: text }));
        },
        // Transform name/value objects back to string array for the action
        fromFormValue: (formValue: Array<{ name: string; value: string }>) => {
          if (!Array.isArray(formValue)) return [];
          return formValue.map((item) => item.value || item.name || item);
        }
      }
    },
    validate: (action: SendMsg) => {
      const errors: { [key: string]: string } = {};

      if (!action.text || action.text.trim() === '') {
        errors.text = 'Message text is required';
      }

      if (action.quick_replies && action.quick_replies.length > 3) {
        errors.quick_replies = 'You can add up to 3 quick replies';
      }

      return {
        valid: Object.keys(errors).length === 0,
        errors
      };
    }
  },
  send_email: {
    name: 'Send Email',
    color: COLORS.broadcast,
    render: renderSendEmail
  },
  start_session: {
    name: 'Start Somebody Else',
    color: COLORS.broadcast,
    render: renderStartSession
  },
  open_ticket: {
    name: 'Open Ticket',
    color: COLORS.execute,
    render: renderOpenTicket
  },
  call_webhook: {
    name: 'Call Webhook',
    color: COLORS.call,
    render: renderCallWebhook
  },
  call_classifier: {
    name: 'Call Classifier',
    color: COLORS.call,
    render: renderCallClassifier
  },
  call_resthook: {
    name: 'Call Resthook',
    color: COLORS.call,
    render: renderCallResthook
  },
  call_llm: {
    name: 'Call AI',
    color: COLORS.call,
    render: renderCallLLM
  },
  enter_flow: {
    name: 'Enter Subflow',
    color: COLORS.execute,
    render: renderEnterFlow
  },
  transfer_airtime: {
    name: 'Send Airtime',
    color: COLORS.call,
    render: renderTransferAirtime
  },
  wait_for_response: {
    name: 'Wait for Response',
    color: COLORS.wait,
    render: renderWaitForResponse
  },
  wait_for_menu: {
    name: 'Wait for Menu Selection',
    color: COLORS.wait,
    render: renderWaitForMenu
  },
  wait_for_digits: {
    name: 'Wait for Digits',
    color: COLORS.wait,
    render: renderWaitForDigits
  },
  wait_for_audio: {
    name: 'Wait for Audio',
    color: COLORS.wait,
    render: renderWaitForAudio
  },
  wait_for_video: {
    name: 'Wait for Video',
    color: COLORS.wait,
    render: renderWaitForVideo
  },
  wait_for_image: {
    name: 'Wait for Image',
    color: COLORS.wait,
    render: renderWaitForImage
  },
  wait_for_location: {
    name: 'Wait for Location',
    color: COLORS.wait,
    render: renderWaitForLocation
  },
  set_contact_name: {
    name: 'Update Contact',
    color: '#01c1af',
    render: renderSetContactName
  },
  add_contact_groups: {
    name: 'Add to Group',
    color: COLORS.add,
    render: renderAddToGroups,
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
    validate: (action: AddToGroup) => {
      const errors: { [key: string]: string } = {};

      if (!action.groups || action.groups.length === 0) {
        errors.groups = 'At least one group must be selected';
      }

      return {
        valid: Object.keys(errors).length === 0,
        errors
      };
    }
  },
  remove_contact_groups: {
    name: 'Remove from Group',
    color: COLORS.remove,
    render: renderRemoveFromGroups
  },
  request_optin: {
    name: 'Request Opt-in',
    color: COLORS.send,
    render: renderRequestOptin
  },
  say_msg: {
    name: 'Say Message',
    color: COLORS.send,
    render: renderSayMsg
  },
  play_audio: {
    name: 'Play Audio',
    color: COLORS.send,
    render: renderPlayAudio
  },
  split_by_run_result: {
    name: 'Split by Flow Result',
    color: COLORS.split
  },
  split_by_expression: {
    name: 'Split by Expression',
    color: COLORS.split
  },
  split_by_contact_field: {
    name: 'Split by <Contact Field Name>',
    color: COLORS.split
  },
  split_by_groups: {
    name: 'Split by Group',
    color: COLORS.split
  },
  split_by_scheme: {
    name: 'Split by URN Type',
    color: COLORS.split
  },
  split_by_random: {
    name: 'Split by Random',
    color: COLORS.split
  }
};

// Default property type mappings
export function getDefaultComponent(value: any): WidgetConfig['type'] {
  if (typeof value === 'boolean') {
    return 'temba-checkbox';
  }
  if (typeof value === 'number') {
    return 'temba-textinput';
  }
  if (Array.isArray(value)) {
    return 'temba-select'; // For arrays, use multi-select
  }
  // Default to text input for strings and unknown types
  return 'temba-textinput';
}

// Get component properties for default mappings with proper typing
export function getDefaultComponentProps(value: any): PropertyConfig {
  if (typeof value === 'boolean') {
    return {
      widget: { type: 'temba-checkbox' }
    };
  }
  if (typeof value === 'number') {
    return {
      widget: {
        type: 'temba-textinput',
        attributes: { type: 'number' }
      }
    };
  }
  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === 'string') {
      return {
        widget: {
          type: 'temba-select',
          attributes: { multi: true, tags: true }
        }
      };
    }
    return {
      widget: {
        type: 'temba-select',
        attributes: { multi: true }
      }
    };
  }
  return {
    widget: { type: 'temba-textinput' }
  };
}

// Type guard functions for working with WidgetConfig
export function isTextInputWidget(
  config: WidgetConfig
): config is { type: 'temba-textinput'; attributes?: TextInputAttributes } {
  return config.type === 'temba-textinput';
}

export function isCompletionWidget(
  config: WidgetConfig
): config is { type: 'temba-completion'; attributes?: CompletionAttributes } {
  return config.type === 'temba-completion';
}

export function isSelectWidget(
  config: WidgetConfig
): config is { type: 'temba-select'; attributes?: SelectAttributes } {
  return config.type === 'temba-select';
}

export function isCheckboxWidget(
  config: WidgetConfig
): config is { type: 'temba-checkbox'; attributes?: CheckboxAttributes } {
  return config.type === 'temba-checkbox';
}

export function isSliderWidget(
  config: WidgetConfig
): config is { type: 'temba-slider'; attributes?: SliderAttributes } {
  return config.type === 'temba-slider';
}
