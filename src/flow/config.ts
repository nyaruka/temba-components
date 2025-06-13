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
    color: COLORS.update
  },
  add_contact_urn: {
    name: 'Add Contact URN',
    color: COLORS.update
  },
  set_contact_field: {
    name: 'Update Contact Field',
    color: COLORS.update
  },
  set_contact_channel: {
    name: 'Update Contact Channel',
    color: COLORS.update
  },
  set_contact_language: {
    name: 'Update Contact Language',
    color: COLORS.update
  },
  send_broadcast: {
    name: 'Send Broadcast',
    color: COLORS.broadcast
  },
  set_run_result: {
    name: 'Save Flow Result',
    color: COLORS.save,
    render: renderSetRunResult
  },
  send_msg: {
    name: 'Send Message',
    color: COLORS.send,
    render: renderSendMsg
  },
  send_email: {
    name: 'Send Email',
    color: COLORS.broadcast
  },
  start_session: {
    name: 'Start Somebody Else',
    color: COLORS.broadcast
  },
  open_ticket: {
    name: 'Open Ticket',
    color: COLORS.execute
  },
  call_webhook: {
    name: 'Call Webhook',
    color: COLORS.call,
    render: renderCallWebhook
  },
  enter_flow: {
    name: 'Enter Subflow',
    color: COLORS.execute
  },
  call_llm: {
    name: 'Call AI',
    color: COLORS.call
  },
  transfer_airtime: {
    name: 'Send Airtime',
    color: COLORS.call
  },
  wait_for_response: {
    name: 'Wait for Response',
    color: COLORS.wait
  },
  set_contact_name: {
    name: 'Update Contact',
    color: '#01c1af',
    render: renderSetContactName
  },
  add_contact_groups: {
    name: 'Add to Group',
    color: COLORS.add,
    render: renderAddToGroups
  },
  remove_contact_groups: {
    name: 'Remove from Group',
    color: COLORS.remove
  },
  request_optin: {
    name: 'Request Opt-in',
    color: COLORS.send
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
