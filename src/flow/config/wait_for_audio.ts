import { html } from 'lit-html';
import { UIConfig, COLORS } from '../types';
import { Node, WaitForAudio } from '../../store/flow-definition';

export const wait_for_audio: UIConfig = {
  name: 'Wait for Audio',
  color: COLORS.wait,
  render: (_node: Node, _action: WaitForAudio) => {
    // This will need to be implemented based on the actual render logic
    return html`<div>Wait for Audio</div>`;
  }
};
