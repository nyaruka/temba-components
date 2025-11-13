import { html } from 'lit-html';
import { ActionConfig, ACTION_GROUPS, FlowTypes } from '../types';
import { Node, PlayAudio } from '../../store/flow-definition';

export const play_audio: ActionConfig = {
  name: 'Play Audio',
  group: ACTION_GROUPS.send,
  flowTypes: [FlowTypes.VOICE],
  render: (_node: Node, _action: PlayAudio) => {
    // This will need to be implemented based on the actual render logic
    return html`<div>Play Audio</div>`;
  }
};
