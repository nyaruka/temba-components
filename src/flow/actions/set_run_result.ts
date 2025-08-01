import { html } from 'lit-html';
import { ActionConfig, COLORS } from '../types';
import { Node, SetRunResult } from '../../store/flow-definition';

export const set_run_result: ActionConfig = {
  name: 'Save Flow Result',
  color: COLORS.save,
  render: (_node: Node, action: SetRunResult) => {
    return html`<div>Save ${action.value} as <b>${action.name}</b></div>`;
  }
};
