import { html } from 'lit-html';
import { ActionConfig, EDITOR_TYPES } from '../types';
import { Node, CallClassifier } from '../../store/flow-definition';

export const call_classifier: ActionConfig = {
  name: 'Call Classifier',
  editorType: EDITOR_TYPES.call,
  render: (_node: Node, _action: CallClassifier) => {
    // This will need to be implemented based on the actual render logic
    return html`<div>Call Classifier</div>`;
  }
};
