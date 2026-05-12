import { css } from 'lit';

/**
 * TextIt Design System pill color variants — single source of truth.
 *
 * Provides the color triple (background / foreground / border) keyed
 * off `.pill-{type}` plus the JS-side taxonomy (`PILL_TYPES`,
 * `PILL_TYPE_ICONS`, `iconToPillType`) consumed by Select.ts and
 * flow/utils.ts.
 *
 * Variant theming:
 *   - .pill-contact / .pill-group: full ramp derived from --accent
 *     via `color-mix(in oklab, …)`. Override --accent to re-theme.
 *   - .pill-flow, .pill-channel: bg/border derived from --flow /
 *     --channel via color-mix; text + icon use the anchor directly.
 *   - .pill-field: bg/border are fixed at the Tailwind yellow ramp
 *     (yellow-100 / yellow-300) because yellow has too little
 *     contrast against white to color-mix into a recognizable swatch.
 *     Text uses yellow-900 for readability; the icon uses --field
 *     directly, which is the only knob a host page can re-theme.
 *   - .pill-neutral / .pill-label / .pill-keyword: greys; not
 *     anchor-driven.
 *
 * Shape (height, padding, radius, icon spacing) is the consumer's
 * concern, since pill use-cases differ: Select chips have a remove
 * button on the right, ContactDetails pills are clickable links, etc.
 *
 * To add a new variant: extend `PILL_TYPES`, optionally add an entry
 * to `PILL_TYPE_ICONS` / `ICON_TO_PILL_TYPE`, append a `.pill-{type}`
 * block below, and reference an anchor in `designTokens.ts`.
 */

/** Recognized pill variants. Anything outside this set falls back to
 * `pill-neutral` (or is rejected by callers as not a pill at all). */
export const PILL_TYPES: ReadonlySet<string> = new Set([
  'neutral',
  'flow',
  'group',
  'contact',
  'field',
  'label',
  'keyword',
  'channel'
]);

/** Default icon name for each pill variant. Used when a consumer
 * specifies `type` but not `icon` — keeps Omnibox-style options and
 * Django-form-rendered options visually consistent without making the
 * data layer set both fields. */
export const PILL_TYPE_ICONS: Readonly<Record<string, string>> = {
  group: 'group',
  contact: 'contact',
  field: 'fields',
  flow: 'flow',
  label: 'label'
};

/** Inverse mapping: icon name (alias or resolved SVG id) → pill type.
 * Both forms are valid since flow-action items pass through either. */
const ICON_TO_PILL_TYPE: Readonly<Record<string, string>> = {
  flow: 'flow',
  group: 'group',
  contact: 'contact',
  contacts: 'contact',
  field: 'field',
  fields: 'field',
  label: 'label',
  // resolved Icon enum SVG ids
  'users-01': 'group',
  'atom-01': 'group',
  'user-01': 'contact',
  'tag-01': 'label'
};

export const iconToPillType = (icon?: string): string | undefined => {
  if (!icon) return undefined;
  if (ICON_TO_PILL_TYPE[icon]) return ICON_TO_PILL_TYPE[icon];
  // Legacy alias prefix (e.g. 'group_smart' → 'group').
  if (icon.startsWith('group')) return 'group';
  return undefined;
};

export const pillVariants = css`
  .pill-neutral {
    background: var(--sunken);
    color: var(--text-1);
    border-color: var(--border);
    --icon-color: var(--text-2);
  }
  .pill-flow {
    background: color-mix(in oklab, var(--flow) 12%, white);
    color: var(--flow);
    border-color: color-mix(in oklab, var(--flow) 25%, white);
    --icon-color: var(--flow);
  }
  /* Recipient color — shared by contacts and groups. */
  .pill-contact,
  .pill-group {
    background: var(--accent-100);
    color: var(--accent-700);
    border-color: var(--accent-200);
    --icon-color: var(--accent-700);
  }
  .pill-channel {
    background: color-mix(in oklab, var(--channel) 12%, white);
    color: var(--channel);
    border-color: color-mix(in oklab, var(--channel) 25%, white);
    --icon-color: var(--channel);
  }
  .pill-field {
    /* Yellow has very low contrast against white, so the color-mix
       approach used by other variants washes out at any readable mix
       percentage. We use the Tailwind yellow ramp directly for bg
       (yellow-100) / border (yellow-300) / text (yellow-900). The
       icon hue stays anchored to --field so a host page can still
       re-theme the variant by overriding that one token. */
    background: #fef9c3;
    color: #854d0e;
    border-color: #fde68a;
    --icon-color: var(--field);
  }
  .pill-keyword {
    background: var(--sunken);
    color: var(--text-1);
    border-color: var(--border);
    --icon-color: var(--text-2);
    font-family: var(--font-mono);
    font-size: 11.5px;
  }
  .pill-label {
    background: var(--sunken);
    color: var(--text-2);
    border-color: var(--border);
    --icon-color: var(--text-2);
  }
`;
