import { css } from 'lit';

/**
 * TextIt Design System pill color variants — single source of truth.
 *
 * Provides only the color triple (background / foreground / border)
 * keyed off `.pill-{type}`. Shape (height, padding, radius, icon
 * spacing) is the consumer's concern, since pill use-cases differ:
 * Select chips have a remove button on the right, ContactDetails
 * pills are clickable links, etc.
 *
 * To add a new variant: append a class here and (if useful) extend
 * `PILL_TYPES` / `PILL_TYPE_ICONS` in form/select/Select.ts.
 */
export const pillVariants = css`
  .pill-neutral {
    background: var(--sunken);
    color: var(--text-1);
    border-color: var(--border);
    --icon-color: var(--text-2);
  }
  .pill-flow {
    background: #ecf7f1;
    color: #166534;
    border-color: #d2ebdc;
    --icon-color: #166534;
  }
  /* Recipient color — shared by contacts and groups.
     Border is one ramp step darker than the bg, matching the
     bg-to-border relationship of the flow pill. */
  .pill-contact,
  .pill-group {
    background: var(--accent-100);
    color: var(--accent-700);
    border-color: var(--accent-200);
    --icon-color: var(--accent-700);
  }
  /* Channel → lavender. */
  .pill-channel {
    background: #f4eefb;
    color: #6b21a8;
    border-color: #e5d6f4;
    --icon-color: #6b21a8;
  }
  .pill-field {
    background: #fef6e1;
    color: #854d0e;
    border-color: #f5e1ac;
    --icon-color: #854d0e;
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
