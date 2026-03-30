import { getStore } from '../store/Store';

/**
 * Excludes flows that are incompatible with the current flow type.
 * Background flows cannot enter message flows.
 */
export function shouldExcludeFlow(flow: any): boolean {
  const definition = getStore().getState().flowDefinition;
  if (!definition) return false;

  // Background flows should not be able to enter message flows
  if (definition.type === 'messaging_background' && flow.type === 'message') {
    return true;
  }

  return false;
}
