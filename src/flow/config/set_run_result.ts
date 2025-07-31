import { html } from 'lit-html';
import { UIConfig, COLORS } from '../types';
import { Node, SetRunResult } from '../../store/flow-definition';

export const set_run_result: UIConfig = {
  name: 'Save Flow Result',
  color: COLORS.save,
  render: (_node: Node, action: SetRunResult) => {
    return html`<div>Save ${action.value} as <b>${action.name}</b></div>`;
  }
};
