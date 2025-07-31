import { html } from 'lit-html';
import { UIConfig, COLORS } from '../types';
import { Node, OpenTicket } from '../../store/flow-definition';

const render = (_node: Node, _action: OpenTicket) => {
  // This will need to be implemented based on the actual render logic
  return html`<div>Open Ticket</div>`;
};

export const open_ticket: UIConfig = {
  name: 'Open Ticket',
  color: COLORS.execute,
  render
};
