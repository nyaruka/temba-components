import { html } from 'lit-html';
import { UIConfig, COLORS } from '../types';
import { Node, EnterFlow } from '../../store/flow-definition';

export const enter_flow: UIConfig = {
  name: 'Enter a Flow',
  color: COLORS.execute,
  render: (node: Node, action: EnterFlow) => {
    return html`<div
      style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;"
    >
      Enter <b>${action.flow.name}</b>
    </div>`;
  }
};
