import { html } from 'lit-html';
import { UIConfig, COLORS } from '../types';
import { Node, WaitForImage } from '../../store/flow-definition';

export const wait_for_image: UIConfig = {
  name: 'Wait for Image',
  color: COLORS.wait,
  render: (_node: Node, _action: WaitForImage) => {
    // This will need to be implemented based on the actual render logic
    return html`<div>Wait for Image</div>`;
  }
};
