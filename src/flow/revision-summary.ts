export interface RevisionChange {
  type: string;
  uuid?: string;
  node?: string;
  subtype?: string;
  field?: string;
  lang?: string;
}

interface Phrase {
  noun: string;
  plural: string;
  verb: string;
  order: number;
  noCount?: boolean;
}

const CATEGORY_ORDER = [
  'metadata',
  'structure',
  'content',
  'translations',
  'notes',
  'layout'
];

function categoryFor(change: RevisionChange): string | null {
  switch (change.type) {
    case 'metadata_changed':
    case 'base_language_changed':
      return 'metadata';
    case 'node_added':
    case 'node_removed':
    case 'action_added':
    case 'action_removed':
    case 'action_reordered':
    case 'router_updated':
    case 'connection_changed':
      return 'structure';
    case 'action_updated':
      return 'content';
    case 'translation_added':
    case 'translation_updated':
    case 'translation_removed':
      return 'translations';
    case 'sticky_added':
    case 'sticky_removed':
    case 'sticky_updated':
    case 'sticky_moved':
      return 'notes';
    case 'node_moved':
      return 'layout';
    default:
      return null;
  }
}

const ACTION_LABELS: Record<string, { noun: string; plural: string }> = {
  send_msg: { noun: 'message', plural: 'messages' },
  send_email: { noun: 'email', plural: 'emails' },
  send_broadcast: { noun: 'broadcast', plural: 'broadcasts' },
  set_contact_field: { noun: 'contact field', plural: 'contact fields' },
  set_contact_name: { noun: 'contact name', plural: 'contact name changes' },
  set_contact_language: {
    noun: 'contact language',
    plural: 'contact language changes'
  },
  set_contact_status: {
    noun: 'contact status',
    plural: 'contact status changes'
  },
  set_contact_channel: { noun: 'contact channel', plural: 'contact channels' },
  add_contact_groups: { noun: 'group', plural: 'groups' },
  remove_contact_groups: { noun: 'group', plural: 'groups' },
  add_contact_urn: { noun: 'URN', plural: 'URNs' },
  set_run_result: { noun: 'result', plural: 'results' },
  call_webhook: { noun: 'webhook', plural: 'webhooks' },
  call_classifier: { noun: 'classifier', plural: 'classifiers' },
  call_resthook: { noun: 'resthook', plural: 'resthooks' },
  call_llm: { noun: 'AI prompt', plural: 'AI prompts' },
  enter_flow: { noun: 'subflow', plural: 'subflows' },
  start_session: { noun: 'subflow', plural: 'subflows' },
  transfer_airtime: { noun: 'airtime transfer', plural: 'airtime transfers' },
  play_audio: { noun: 'audio', plural: 'audio clips' },
  say_msg: { noun: 'voice message', plural: 'voice messages' },
  open_ticket: { noun: 'ticket', plural: 'tickets' },
  add_input_labels: { noun: 'label', plural: 'labels' },
  remove_input_labels: { noun: 'label', plural: 'labels' },
  request_optin: { noun: 'opt-in', plural: 'opt-ins' },
  send_optin_msg: { noun: 'opt-in message', plural: 'opt-in messages' }
};

const METADATA_LABELS: Record<string, { noun: string }> = {
  name: { noun: 'name' },
  type: { noun: 'flow type' },
  expire_after_minutes: { noun: 'expiration' }
};

function actionLabel(subtype?: string): { noun: string; plural: string } {
  if (subtype && ACTION_LABELS[subtype]) {
    return ACTION_LABELS[subtype];
  }
  return { noun: 'action', plural: 'actions' };
}

function changeToPhrase(change: RevisionChange): Phrase | null {
  switch (change.type) {
    case 'metadata_changed': {
      const label = METADATA_LABELS[change.field || ''] || {
        noun: change.field || 'metadata'
      };
      return {
        noun: label.noun,
        plural: label.noun,
        verb: 'changed',
        order: 0,
        noCount: true
      };
    }
    case 'base_language_changed':
      return {
        noun: 'base language',
        plural: 'base language',
        verb: 'changed',
        order: 1,
        noCount: true
      };
    case 'node_added':
      return { noun: 'node', plural: 'nodes', verb: 'added', order: 2 };
    case 'node_removed':
      return { noun: 'node', plural: 'nodes', verb: 'removed', order: 3 };
    case 'action_added': {
      const label = actionLabel(change.subtype);
      return { ...label, verb: 'added', order: 4 };
    }
    case 'action_updated': {
      const label = actionLabel(change.subtype);
      return { ...label, verb: 'updated', order: 5 };
    }
    case 'action_removed': {
      const label = actionLabel(change.subtype);
      return { ...label, verb: 'removed', order: 6 };
    }
    case 'action_reordered':
      return {
        noun: 'actions',
        plural: 'actions',
        verb: 'reordered',
        order: 7,
        noCount: true
      };
    case 'router_updated':
      return { noun: 'split', plural: 'splits', verb: 'updated', order: 8 };
    case 'connection_changed':
      return {
        noun: 'connection',
        plural: 'connections',
        verb: 'changed',
        order: 9
      };
    case 'translation_added':
      return {
        noun: 'translation',
        plural: 'translations',
        verb: 'added',
        order: 10
      };
    case 'translation_updated':
      return {
        noun: 'translation',
        plural: 'translations',
        verb: 'updated',
        order: 11
      };
    case 'translation_removed':
      return {
        noun: 'translation',
        plural: 'translations',
        verb: 'removed',
        order: 12
      };
    case 'sticky_added':
      return { noun: 'sticky', plural: 'stickies', verb: 'added', order: 13 };
    case 'sticky_updated':
      return { noun: 'sticky', plural: 'stickies', verb: 'updated', order: 14 };
    case 'sticky_removed':
      return { noun: 'sticky', plural: 'stickies', verb: 'removed', order: 15 };
    case 'sticky_moved':
      return { noun: 'sticky', plural: 'stickies', verb: 'moved', order: 16 };
    case 'node_moved':
      return { noun: 'node', plural: 'nodes', verb: 'moved', order: 17 };
    default:
      return null;
  }
}

const MAX_PHRASES = 2;

function buildPhraseGroups(
  changes: RevisionChange[] | null | undefined
): Map<string, { phrase: Phrase; count: number }> {
  const groups = new Map<string, { phrase: Phrase; count: number }>();
  for (const change of changes ?? []) {
    const phrase = changeToPhrase(change);
    if (!phrase) continue;
    const key = `${phrase.order}:${phrase.noun}:${phrase.verb}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count++;
    } else {
      groups.set(key, { phrase, count: 1 });
    }
  }
  return groups;
}

export function isSignificantChange(
  changes: RevisionChange[] | null | undefined
): boolean {
  return buildPhraseGroups(changes).size > MAX_PHRASES;
}

export function summarizeChanges(
  changes: RevisionChange[] | null | undefined
): string {
  if (!changes || changes.length === 0) return '';

  const groups = buildPhraseGroups(changes);
  if (groups.size === 0) return '';

  const sorted = Array.from(groups.values()).sort(
    (a, b) => a.phrase.order - b.phrase.order
  );

  const parts = sorted.map(({ phrase, count }) =>
    phrase.noCount || count === 1
      ? `${phrase.verb} ${phrase.noun}`
      : `${phrase.verb} ${count} ${phrase.plural}`
  );

  if (parts.length <= MAX_PHRASES) {
    return capitalize(parts.join(' and '));
  }

  const presentCategories = new Set<string>();
  for (const change of changes) {
    const cat = categoryFor(change);
    if (cat) presentCategories.add(cat);
  }
  const categories = CATEGORY_ORDER.filter((c) => presentCategories.has(c));
  const visibleCategories = categories.slice(0, MAX_PHRASES);

  return `Significantly changed ${visibleCategories.join(' and ')}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
