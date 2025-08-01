import { html } from 'lit-html';
import { ActionConfig, COLORS } from '../types';
import { Node, TransferAirtime } from '../../store/flow-definition';

export const transfer_airtime: ActionConfig = {
  name: 'Transfer Airtime',
  color: COLORS.send,
  render: (_node: Node, _action: TransferAirtime) => {
    // This will need to be implemented based on the actual render logic
    return html`<div>Transfer Airtime</div>`;
  }
};
