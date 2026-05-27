import { css } from 'lit';

/**
 * TextIt Design System tokens — single source of truth.
 *
 * Embedded in component shadow DOMs (via FieldElement :host) so the
 * tokens apply regardless of host-page stylesheet. Host pages may still
 * override these by re-declaring the variable on the component element
 * itself (e.g. `temba-select { --accent: ... }`), which beats `:host`.
 *
 * Mirrored in static/css/temba-components.css for hosts that want the
 * tokens at :root scope; keep both in sync if the design system evolves.
 */
export const designTokens = css`
  :host {
    /* accent ramp — the primary color sits at 400 and the ramp is
       derived from it in both directions via sRGB mixing.
       The anchor reads from --primary-rgb so host pages can re-theme
       the entire ramp by setting e.g. --primary-rgb: 112, 0, 132.
       Fallback matches the design-system.css default so component-
       only test harnesses pick up the same brand colour. */
    --accent: rgb(var(--primary-rgb, 73, 127, 206));
    --accent-50: color-mix(in srgb, var(--accent) 6%, white);
    --accent-100: color-mix(in srgb, var(--accent) 16%, white);
    --accent-200: color-mix(in srgb, var(--accent) 32%, white);
    --accent-300: color-mix(in srgb, var(--accent) 60%, white);
    --accent-400: var(--accent);
    --accent-500: color-mix(in srgb, var(--accent) 90%, black);
    --accent-600: color-mix(in srgb, var(--accent) 80%, black);
    --accent-700: color-mix(in srgb, var(--accent) 65%, black);
    --accent-800: color-mix(in srgb, var(--accent) 50%, black);
    --accent-900: color-mix(in srgb, var(--accent) 35%, black);

    /* neutrals */
    --bg: #f6f7f9;
    --surface: #ffffff;
    --surface-note: #fff9c2;
    --sunken: #f1f3f5;
    --border: #e6e8ec;
    --border-strong: #d2d6dc;
    --border-note: #ebdf6f;
    --text-1: #1a1f26;
    --text-2: #4d5664;
    --text-3: #7b8593;
    --text-4: #a2abb8;

    /* status — full set */
    --success: #16a34a;
    --success-bg: #e8f6ee;
    --success-border: #bfe5cd;
    --info: #2563eb;
    --info-bg: #e8f0fe;
    --info-border: #c7d7f8;
    --warning: #b45309;
    --warning-bg: #fdf3e2;
    --warning-border: #f2d9a9;
    --danger: #d03f3f;
    --danger-bg: #fcebeb;
    --danger-border: #f4c8c8;
    --neutral: #6b7280;
    --neutral-bg: #eef0f3;
    --neutral-border: #d8dce2;

    /* Pill anchor hues — pillVariants derives bg/fg/border via
       color-mix(in srgb, ...) so host pages can re-theme by
       overriding just the anchor. These are intentionally fixed and
       do NOT track --primary-rgb so that pill identity (group/flow/
       field/channel) stays stable across brand themes. */
    --recipient: #2a6fb5;
    --flow: #16a34a;
    --channel: #6b21a8;
    --topic: #d97706;
    --campaign: #0891b2;
    /* Field stays slightly darker than the bright yellow-500 anchor
       used for flow/channel — yellow-500 has too little contrast
       against white to read as a foreground / icon hue on its own.
       Yellow-700 doubles as the pill's icon color via .pill-field. */
    --field: #a16207;

    /* type */
    --font: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    --font-mono:
      'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    --w-regular: 400;
    --w-medium: 500;
    --w-semibold: 600;
    --w-bold: 600;

    /* shape */
    --r: 8px;
    --r-xs: 2px;
    --r-sm: 4px;
    --r-lg: 12px;

    /* density */
    --row-h: 36px;
    --input-h: 34px;
    --pad: 10px;
    --gap: 14px;

    /* shadows */
    --shadow-1:
      0 1px 1px rgba(15, 22, 36, 0.04), 0 1px 2px rgba(15, 22, 36, 0.04);
    --shadow-2:
      0 1px 1px rgba(15, 22, 36, 0.04), 0 4px 12px rgba(15, 22, 36, 0.06);
    --shadow-3:
      0 6px 20px rgba(15, 22, 36, 0.1), 0 2px 6px rgba(15, 22, 36, 0.06);

    /* legacy aliases — point at the DS tokens above so existing
       components pick up the new design language without code changes */
    --font-family: var(--font);
    --curvature: var(--r-sm);
    --curvature-widget: var(--r-sm);
    /* Focus styling.
       --focus is the single hue, kept separate from --accent so
       changing the focus color doesn't shift chip / recipient hues.
       --focus-muted and --focus-halo are derived once here, so
       everywhere that needs to draw a focus outline or ring can
       consume the same values without re-doing the formula.
       --color-focus / --widget-box-shadow-focused alias the muted
       versions and are what most widgets reference — these get
       overridden to error-red by FieldElement's .has-error rule.
       Surfaces that should stay blue even during a parent field's
       error state (e.g. the dropdown popup) reference --focus-muted
       / --focus-halo directly to skip that override. */
    --focus: rgb(var(--focus-rgb, 91, 156, 229));
    --focus-50: color-mix(in srgb, var(--focus) 12%, white);
    --focus-100: color-mix(in srgb, var(--focus) 24%, white);
    --focus-200: color-mix(in srgb, var(--focus) 40%, white);
    --focus-300: color-mix(in srgb, var(--focus) 60%, white);
    --focus-600: color-mix(in srgb, var(--focus) 60%, black);
    --focus-700: color-mix(in srgb, var(--focus) 45%, black);
    --focus-muted: color-mix(in srgb, var(--focus) 60%, white);
    --focus-halo: 0 0 0 3px color-mix(in srgb, var(--focus) 30%, transparent);
    --color-focus: var(--focus-muted);
    --widget-box-shadow-focused: var(--focus-halo);

    --color-widget-bg: var(--surface);
    --color-widget-bg-focused: var(--surface);
    --color-widget-border: var(--border-strong);
    --color-options-bg: var(--surface);
    --color-selection: var(--accent-50);
    --color-success: var(--success);
    --widget-box-shadow: none;
    --shadow: var(--shadow-1);
    --shadow-widget: var(--shadow-1);
    --color-text: var(--text-1);
    --color-widget-text: var(--text-1);
    --color-borders: var(--border);
    --color-placeholder: var(--text-3);
    --color-primary-light: var(--sunken);
    --color-label: var(--text-1);
    --color-text-help: var(--text-3);

    --temba-textinput-padding: 7px var(--pad);
    --temba-textinput-font-size: 13.5px;
    --temba-textinput-min-height: var(--input-h);
    --temba-select-selected-padding: 0 var(--pad);
    --temba-select-selected-line-height: 1.4;
    --temba-select-selected-font-size: 13.5px;
    --temba-select-min-height: var(--input-h);
  }
`;
