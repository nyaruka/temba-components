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
    render: renderSendMsg
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
    render: renderAddToGroups
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
