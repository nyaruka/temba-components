import { NodeConfig, ACTION_GROUPS } from '../types';

export const split_by_llm_categorize: NodeConfig = {
  type: 'split_by_intent',
  name: 'Call classifier',
  group: ACTION_GROUPS.services
};
