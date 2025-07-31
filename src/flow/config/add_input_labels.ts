import { html } from 'lit-html';
import { UIConfig, COLORS } from '../types';
import { Node, AddInputLabels } from '../../store/flow-definition';

const render = (_node: Node, _action: AddInputLabels) => {
  // This will need to be implemented based on the actual render logic
  return html`<div>Add Input Labels</div>`;
};

export const add_input_labels: UIConfig = {
  name: 'Add Labels',
  color: COLORS.update,
  render
};
