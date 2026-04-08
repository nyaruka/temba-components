import { html } from 'lit-html';
import { ActionConfig, ACTION_GROUPS, FormData, FlowTypes } from '../types';
import { Node, SayMsg } from '../../store/flow-definition';
import { renderAudioPlayer } from './audio-player';
import { renderClamped, renderHighlightedText } from '../utils';

export const say_msg: ActionConfig = {
  name: 'Say Message',
  group: ACTION_GROUPS.send,
  flowTypes: [FlowTypes.VOICE],
  render: (_node: Node, action: SayMsg) => {
    return html`
      ${renderClamped(
        renderHighlightedText(action.text || '', true),
        action.text || ''
      )}
      ${action.audio_url
        ? html`<div style="margin-top: 0.5em;">
            ${renderAudioPlayer(action.audio_url)}
          </div>`
        : null}
    `;
  },
  form: {
    text: {
      type: 'textarea',
      label: 'Message',
      required: true,
      evaluated: true,
      placeholder: 'Enter message to speak...',
      maxLength: 10000,
      minHeight: 80
    },
    audio_url: {
      type: 'media',
      label: 'Recording',
      required: false,
      accept: 'audio/*',
      optionalLink: 'Add a recording'
    }
  },
  layout: ['text', 'audio_url'],
  toFormData: (action: SayMsg) => {
    return {
      uuid: action.uuid,
      text: action.text || '',
      audio_url: action.audio_url || ''
    };
  },
  fromFormData: (data: FormData) => {
    const result: any = {
      uuid: data.uuid,
      type: 'say_msg',
      text: data.text || ''
    };
    if (data.audio_url && data.audio_url.trim() !== '') {
      result.audio_url = data.audio_url.trim();
    }
    return result as SayMsg;
  },
  sanitize: (formData: FormData): void => {
    if (formData.text && typeof formData.text === 'string') {
      formData.text = formData.text.trim();
    }
  },
  localizable: ['text', 'audio_url'],
  toLocalizationFormData: (
    action: SayMsg,
    localization: Record<string, any>
  ) => {
    const formData: FormData = {
      uuid: action.uuid
    };

    if (localization.text && Array.isArray(localization.text)) {
      formData.text = localization.text[0] || '';
    } else {
      formData.text = '';
    }

    if (localization.audio_url && Array.isArray(localization.audio_url)) {
      formData.audio_url = localization.audio_url[0] || '';
    } else {
      formData.audio_url = '';
    }

    return formData;
  },
  fromLocalizationFormData: (formData: FormData, action: SayMsg) => {
    const localization: Record<string, any> = {};

    if (formData.text && formData.text.trim() !== '') {
      if (formData.text !== action.text) {
        localization.text = [formData.text];
      }
    }

    if (formData.audio_url && formData.audio_url.trim() !== '') {
      if (formData.audio_url !== action.audio_url) {
        localization.audio_url = [formData.audio_url];
      }
    }

    return localization;
  }
};
