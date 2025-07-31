import { html } from 'lit-html';
import { UIConfig, COLORS } from '../types';
import { Node, StartSession } from '../../store/flow-definition';

const render = (_node: Node, _action: StartSession) => {
  // This will need to be implemented based on the actual render logic
  return html`<div>Start Session</div>`;
};

export const start_session: UIConfig = {
  name: 'Start Somebody Else',
  color: COLORS.broadcast,
  render
};
