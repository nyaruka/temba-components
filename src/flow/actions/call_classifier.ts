import { html } from 'lit-html';
import { ActionConfig, ACTION_GROUPS } from '../types';
import { Node, CallClassifier } from '../../store/flow-definition';

export const call_classifier: ActionConfig = {
  name: 'Call Classifier',
  group: ACTION_GROUPS.services,
  render: (_node: Node, _action: CallClassifier) => {
    // This will need to be implemented based on the actual render logic
    return html`<div>Call Classifier</div>`;
  }
};
