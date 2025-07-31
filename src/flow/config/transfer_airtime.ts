import { html } from 'lit-html';
import { UIConfig, COLORS } from '../types';
import { Node, TransferAirtime } from '../../store/flow-definition';

const render = (_node: Node, _action: TransferAirtime) => {
  // This will need to be implemented based on the actual render logic
  return html`<div>Send Airtime</div>`;
};

export const transfer_airtime: UIConfig = {
  name: 'Send Airtime',
  color: COLORS.call,
  render
};
