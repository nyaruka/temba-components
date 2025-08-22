import { COLORS, NodeConfig } from '../types';
import { Node } from '../../store/flow-definition';

export const wait_for_response: NodeConfig = {
  type: 'wait_for_response',
  name: 'Wait for Response',
  color: COLORS.wait,
  form: {
    result_name: {
      type: 'text',
      label: 'Result Name',
      helpText: 'The name to save the response as',
      placeholder: 'response'
    }
  },
  layout: ['timeout', 'result_name'],
  toFormData: (node: Node) => {
    return {
      uuid: node.uuid,
      result_name: node.router?.result_name || 'response'
    };
  },
  fromFormData: (formData: any, originalNode: Node): Node => {
    const router: any = {
      ...originalNode.router,
      result_name: formData.result_name || 'response'
    };

    return {
      ...originalNode,
      router
    };
  }
};
