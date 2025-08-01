import { html } from 'lit-html';
import { UIConfig, COLORS } from '../types';
import { Node, CallClassifier } from '../../store/flow-definition';

export const call_classifier: UIConfig = {
  name: 'Call Classifier',
  color: COLORS.call,
  render: (_node: Node, _action: CallClassifier) => {
    // This will need to be implemented based on the actual render logic
    return html`<div>Call Classifier</div>`;
  }
};
