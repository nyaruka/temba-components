import { html } from 'lit-html';
import { UIConfig, COLORS } from '../types';
import { Node, CallLLM } from '../../store/flow-definition';

const render = (_node: Node, _action: CallLLM) => {
  // This will need to be implemented based on the actual render logic
  return html`<div>Call AI</div>`;
};

export const call_llm: UIConfig = {
  name: 'Call AI',
  color: COLORS.call,
  render
};
