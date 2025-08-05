import { html } from 'lit-html';
import { ActionConfig, COLORS } from '../types';
import { Node, OpenTicket } from '../../store/flow-definition';

export const open_ticket: ActionConfig = {
  name: 'Open Ticket',
  color: COLORS.create,
  render: (_node: Node, _action: OpenTicket) => {
    // This will need to be implemented based on the actual render logic
    return html`<div>Open Ticket</div>`;
  }
};
