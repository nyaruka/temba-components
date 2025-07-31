import { html } from 'lit-html';
import { UIConfig, COLORS } from '../types';
import { Node, PlayAudio } from '../../store/flow-definition';

const render = (_node: Node, _action: PlayAudio) => {
  // This will need to be implemented based on the actual render logic
  return html`<div>Play Audio</div>`;
};

export const play_audio: UIConfig = {
  name: 'Play Audio',
  color: COLORS.send,
  render
};
