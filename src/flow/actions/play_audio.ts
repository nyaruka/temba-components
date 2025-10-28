import { html } from 'lit-html';
import { ActionConfig, EDITOR_TYPES } from '../types';
import { Node, PlayAudio } from '../../store/flow-definition';

export const play_audio: ActionConfig = {
  name: 'Play Audio',
  editorType: EDITOR_TYPES.send,
  render: (_node: Node, _action: PlayAudio) => {
    // This will need to be implemented based on the actual render logic
    return html`<div>Play Audio</div>`;
  }
};
