import { html } from 'lit-html';
import { UIConfig, COLORS } from '../types';
import { Node, CallWebhook } from '../../store/flow-definition';

export const call_webhook: UIConfig = {
  name: 'Call Webhook',
  color: COLORS.call,
  render: (_node: Node, action: CallWebhook) => {
    return html`<div
      style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;"
    >
      ${action.url}
    </div>`;
  }
};
