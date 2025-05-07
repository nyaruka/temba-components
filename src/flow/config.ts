import { TemplateResult } from 'lit-html';
import {
  renderAddToGroups,
  renderCallWebhook,
  renderSendMsg,
  renderSetContactName,
  renderSetRunResult
} from './render';

export interface UIConfig {
  name: string;
  color: string;
  render?: (node: any, action: any) => TemplateResult;
}

export const EDITOR_CONFIG: {
  [key: string]: UIConfig;
} = {
  add_input_labels: {
    name: 'Add Labels',
    color: '#01c1af'
  },
  add_contact_urn: {
    name: 'Add Contact URN',
    color: '#01c1af'
  },
  set_contact_field: {
    name: 'Update Contact Field',
    color: '#01c1af'
  },
  send_broadcast: {
    name: 'Send Broadcast',
    color: '#8e5ea7;'
  },
  set_run_result: {
    name: 'Save Flow Result',
    color: '#1a777c',
    render: renderSetRunResult
  },
  send_msg: {
    name: 'Send Message',
    color: '#3498db',
    render: renderSendMsg
  },
  send_email: {
    name: 'Send Email',
    color: '#8e5ea7'
  },
  start_session: { name: 'Start Somebody Else', color: '#df419f' },
  call_webhook: {
    name: 'Call Webhook',
    color: '#e68628',
    render: renderCallWebhook
  },
  call_llm: {
    name: 'Call AI',
    color: '#e68628'
  },
  transfer_airtime: {
    name: 'Send Airtime',
    color: '#e68628'
  },
  wait_for_response: { name: 'Wait for Response', color: '#4d7dad' },
  split_by_expression: { name: 'Split by Expression', color: '#aaaaaa' },
  split_by_contact_field: {
    name: 'Split by <Contact Field Name>',
    color: '#aaaaaa'
  },
  set_contact_name: {
    name: 'Update Contact',
    color: '#01c1af',
    render: renderSetContactName
  },
  add_contact_groups: {
    name: 'Add to Group',
    color: '#309c42',
    render: renderAddToGroups
  },
  remove_contact_groups: {
    name: 'Remove from Group',
    color: '#666'
  },
  request_optin: {
    name: 'Request Opt-in',
    color: '#3498db'
  },
  split_by_run_result: {
    name: 'Split by Flow Result',
    color: '#aaaaaa'
  }
};
