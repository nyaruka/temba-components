export interface RevisionChanges {
  tags: string[];
}

const TAG_LABELS: Record<string, { label: string; order: number }> = {
  metadata: { label: 'metadata', order: 0 },
  nodes: { label: 'nodes', order: 1 },
  routing: { label: 'routing', order: 2 },
  actions: { label: 'actions', order: 3 },
  stickies: { label: 'stickies', order: 5 },
  layout: { label: 'layout', order: 6 }
};

function tagToLabel(tag: string): { label: string; order: number } | null {
  if (TAG_LABELS[tag]) return TAG_LABELS[tag];
  if (tag.startsWith('localization:')) {
    return { label: 'translations', order: 4 };
  }
  return null;
}

export function labelsFor(
  changes: RevisionChanges | null | undefined
): Set<string> {
  const result = new Set<string>();
  for (const tag of changes?.tags || []) {
    const entry = tagToLabel(tag);
    if (entry) result.add(entry.label);
  }
  return result;
}

export function summarizeChanges(
  changes: RevisionChanges | null | undefined
): string {
  if (!changes) return '';
  const tags = changes.tags || [];
  if (tags.length === 0) return '';

  const orders = new Map<string, number>();
  for (const tag of tags) {
    const entry = tagToLabel(tag);
    if (entry && !orders.has(entry.label)) {
      orders.set(entry.label, entry.order);
    }
  }
  if (orders.size === 0) return '';

  const labels = Array.from(orders.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([label]) => label);

  return `Changed ${joinNaturally(labels)}`;
}

function joinNaturally(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}
