// Re-export all types and utilities
export * from './types';

// Import all action configurations
import { add_input_labels } from './config/add_input_labels';
import { add_contact_urn } from './config/add_contact_urn';
import { set_contact_field } from './config/set_contact_field';
import { set_contact_channel } from './config/set_contact_channel';
import { set_contact_language } from './config/set_contact_language';
import { set_contact_status } from './config/set_contact_status';
import { send_broadcast } from './config/send_broadcast';
import { set_run_result } from './config/set_run_result';
import { send_msg } from './config/send_msg';
import { send_email } from './config/send_email';
import { start_session } from './config/start_session';
import { open_ticket } from './config/open_ticket';
import { call_webhook } from './config/call_webhook';
import { call_classifier } from './config/call_classifier';
import { call_resthook } from './config/call_resthook';
import { call_llm } from './config/call_llm';
import { enter_flow } from './config/enter_flow';
import { transfer_airtime } from './config/transfer_airtime';
import { wait_for_response } from './config/wait_for_response';
import { wait_for_menu } from './config/wait_for_menu';
import { wait_for_digits } from './config/wait_for_digits';
import { wait_for_audio } from './config/wait_for_audio';
import { wait_for_video } from './config/wait_for_video';
import { wait_for_image } from './config/wait_for_image';
import { wait_for_location } from './config/wait_for_location';
import { set_contact_name } from './config/set_contact_name';
import { add_contact_groups } from './config/add_contact_groups';
import { remove_contact_groups } from './config/remove_contact_groups';
import { request_optin } from './config/request_optin';
import { say_msg } from './config/say_msg';
import { play_audio } from './config/play_audio';
import { split_by_run_result } from './config/split_by_run_result';
import { split_by_expression } from './config/split_by_expression';
import { split_by_contact_field } from './config/split_by_contact_field';
import { split_by_groups } from './config/split_by_groups';
import { split_by_scheme } from './config/split_by_scheme';
import { split_by_random } from './config/split_by_random';

import type { UIConfig } from './types';

export const EDITOR_CONFIG: {
  [key: string]: UIConfig;
} = {
  add_input_labels,
  add_contact_urn,
  set_contact_field,
  set_contact_channel,
  set_contact_language,
  set_contact_status,
  send_broadcast,
  set_run_result,
  send_msg,
  send_email,
  start_session,
  open_ticket,
  call_webhook,
  call_classifier,
  call_resthook,
  call_llm,
  enter_flow,
  transfer_airtime,
  wait_for_response,
  wait_for_menu,
  wait_for_digits,
  wait_for_audio,
  wait_for_video,
  wait_for_image,
  wait_for_location,
  set_contact_name,
  add_contact_groups,
  remove_contact_groups,
  request_optin,
  say_msg,
  play_audio,
  split_by_run_result,
  split_by_expression,
  split_by_contact_field,
  split_by_groups,
  split_by_scheme,
  split_by_random
};
