import { Category } from '../store/flow-definition';

const SYSTEM_CATEGORIES_ALLOWED_FOR_TRANSLATION = new Set([
  'Other',
  'No Response'
]);

// These nodes only expose fixed system categories that are not user-editable.
const FIXED_SYSTEM_CATEGORY_NODE_TYPES = new Set([
  'split_by_airtime',
  'split_by_llm',
  'split_by_resthook',
  'split_by_subflow',
  'split_by_ticket',
  'split_by_webhook',
  'wait_for_audio',
  'wait_for_dial'
]);

// Node-specific system categories that should not be translated.
const NON_TRANSLATABLE_SYSTEM_CATEGORIES_BY_NODE_TYPE: Record<
  string,
  Set<string>
> = {
  split_by_llm_categorize: new Set(['Failure']),
  wait_for_response: new Set(['Timeout'])
};

export function getTranslatableCategoriesForNode(
  nodeType: string | undefined,
  categories: Category[] | undefined
): Category[] {
  if (!nodeType || !categories?.length) {
    return [];
  }

  if (FIXED_SYSTEM_CATEGORY_NODE_TYPES.has(nodeType)) {
    return categories.filter((category) =>
      SYSTEM_CATEGORIES_ALLOWED_FOR_TRANSLATION.has(category.name)
    );
  }

  const blocked = NON_TRANSLATABLE_SYSTEM_CATEGORIES_BY_NODE_TYPE[nodeType];
  if (!blocked) {
    return [...categories];
  }

  return categories.filter(
    (category) =>
      !blocked.has(category.name) ||
      SYSTEM_CATEGORIES_ALLOWED_FOR_TRANSLATION.has(category.name)
  );
}

export function hasTranslatableCategoriesForNode(
  nodeType: string | undefined,
  categories: Category[] | undefined
): boolean {
  return getTranslatableCategoriesForNode(nodeType, categories).length > 0;
}
