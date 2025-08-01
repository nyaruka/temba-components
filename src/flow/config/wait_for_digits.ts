import { html } from 'lit-html';
import { UIConfig, COLORS } from '../types';
import { Node, WaitForDigits } from '../../store/flow-definition';

export const wait_for_digits: UIConfig = {
  name: 'Wait for Digits',
  color: COLORS.wait,
  render: (_node: Node, _action: WaitForDigits) => {
    // This will need to be implemented based on the actual render logic
    return html`<div>Wait for Digits</div>`;
  }
};
