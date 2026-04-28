import { zustand } from '../store/AppState';

/**
 * Excludes flows that are incompatible with the current flow type.
 * Background flows cannot enter message flows.
 */
export function shouldExcludeFlow(flow: any): boolean {
  const definition = zustand.getState().flowDefinition;
  if (!definition) return false;

  // Background flows should not be able to enter message flows
  if (definition.type === 'messaging_background' && flow.type === 'message') {
    return true;
  }

  return false;
}

export type LLMRole = 'engine' | 'editing';

export interface LLMModel {
  uuid: string;
  name: string;
  type?: string;
  description?: string;
  roles?: LLMRole[];
}

// Backward-compatible: a model with no `roles` field (older backend) is
// treated as having every role, so the UI doesn't silently hide all models
// when the API hasn't rolled out the field yet.
export function hasLLMRole(
  model: { roles?: string[] } | null | undefined,
  role: LLMRole
): boolean {
  if (!model) return false;
  if (!model.roles) return true;
  return model.roles.includes(role);
}
