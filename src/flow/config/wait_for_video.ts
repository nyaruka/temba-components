import { html } from 'lit-html';
import { UIConfig, COLORS } from '../types';
import { Node, WaitForVideo } from '../../store/flow-definition';

export const wait_for_video: UIConfig = {
  name: 'Wait for Video',
  color: COLORS.wait,
  render: (_node: Node, _action: WaitForVideo) => {
    // This will need to be implemented based on the actual render logic
    return html`<div>Wait for Video</div>`;
  }
};
