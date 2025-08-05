import { html } from 'lit-html';
import { ActionConfig, COLORS } from '../types';
import { Node, StartSession } from '../../store/flow-definition';

export const start_session: ActionConfig = {
  name: 'Start Session',
  color: COLORS.execute,
  render: (_node: Node, _action: StartSession) => {
    // This will need to be implemented based on the actual render logic
    return html`<div>Start Session</div>`;
  }
};
