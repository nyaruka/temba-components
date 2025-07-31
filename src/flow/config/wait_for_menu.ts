import { html } from 'lit-html';
import { UIConfig, COLORS } from '../types';
import { Node, WaitForMenu } from '../../store/flow-definition';

const render = (_node: Node, _action: WaitForMenu) => {
  // This will need to be implemented based on the actual render logic
  return html`<div>Wait for Menu Selection</div>`;
};

export const wait_for_menu: UIConfig = {
  name: 'Wait for Menu Selection',
  color: COLORS.wait,
  render
};
