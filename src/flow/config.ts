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
  }
};
