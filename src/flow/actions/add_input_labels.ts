import { html } from 'lit-html';
import { ActionConfig, COLORS } from '../types';
import { Node, AddInputLabels } from '../../store/flow-definition';
import { renderNamedObjects } from '../utils';

export const add_input_labels: ActionConfig = {
  name: 'Add Input Labels',
  color: COLORS.update,
  render: (_node: Node, action: AddInputLabels) => {
    return html`<div>${renderNamedObjects(action.labels, 'label')}</div>`;
  }
};
