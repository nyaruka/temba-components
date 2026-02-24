import { html } from 'lit-html';
import { ActionConfig, ACTION_GROUPS, FormData, FlowTypes } from '../types';
import { Node, PlayAudio } from '../../store/flow-definition';

export const play_audio: ActionConfig = {
  name: 'Play Recording',
  group: ACTION_GROUPS.send,
  flowTypes: [FlowTypes.VOICE],
  render: (_node: Node, action: PlayAudio) => {
    return html`
      <div style="display: flex; align-items: center; gap: 0.3em;">
        <temba-icon name="recording" size="1"></temba-icon>
        <div
          style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;"
          title="${action.audio_url || ''}"
        >
          ${action.audio_url || ''}
        </div>
      </div>
    `;
  },
  form: {
    audio_url: {
      type: 'text',
      label: 'Recording URL',
      required: true,
      evaluated: true
    }
  },
  layout: ['audio_url'],
  toFormData: (action: PlayAudio) => {
    return {
      uuid: action.uuid,
      audio_url: action.audio_url || ''
    };
  },
  fromFormData: (data: FormData) => {
    return {
      uuid: data.uuid,
      type: 'play_audio',
      audio_url: (data.audio_url || '').trim()
    } as PlayAudio;
  },
  localizable: ['audio_url'],
  toLocalizationFormData: (
    action: PlayAudio,
    localization: Record<string, any>
  ) => {
    const formData: FormData = {
      uuid: action.uuid
    };

    if (localization.audio_url && Array.isArray(localization.audio_url)) {
      formData.audio_url = localization.audio_url[0] || '';
    } else {
      formData.audio_url = '';
    }

    return formData;
  },
  fromLocalizationFormData: (formData: FormData, action: PlayAudio) => {
    const localization: Record<string, any> = {};

    if (formData.audio_url && formData.audio_url.trim() !== '') {
      if (formData.audio_url !== action.audio_url) {
        localization.audio_url = [formData.audio_url];
      }
    }

    return localization;
  }
};
