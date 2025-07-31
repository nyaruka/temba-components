import { html } from 'lit-html';
import { UIConfig, COLORS } from '../types';
import { Node, WaitForLocation } from '../../store/flow-definition';

export const wait_for_location: UIConfig = {
  name: 'Wait for Location',
  color: COLORS.wait,
  render: (_node: Node, _action: WaitForLocation) => {
    // This will need to be implemented based on the actual render logic
    return html`<div>Wait for Location</div>`;
  }
};
