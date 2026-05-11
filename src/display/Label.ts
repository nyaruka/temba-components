import { LitElement, TemplateResult, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { getClasses } from '../utils';
import { styleMap } from 'lit-html/directives/style-map.js';
import { designTokens } from '../styles/designTokens';
import { pillVariants } from '../styles/pillVariants';

export default class Label extends LitElement {
  static get styles() {
    return css`
      ${designTokens}

      :host {
        display: inline-block;
      }

      slot {
        white-space: nowrap;
        overflow-x: hidden;
        text-overflow: ellipsis;
        display: block;
      }

      .mask {
        padding: 3px 8px;
        border-radius: 12px;
        display: flex;
      }

      temba-icon {
        margin-right: 0.3em;
        padding-bottom: 0.1em;
      }

      .label.clickable .mask:hover {
        background: var(--color-background-hover, rgb(0, 0, 0, 0.05));
      }

      .label {
        font-size: 0.8em;
        font-weight: 400;
        border-radius: 12px;
        box-shadow: var(--widget-shadow, 0 0.04em 0.08em rgba(0, 0, 0, 0.15));
        background: var(--color-overlay-light);
        color: var(--color-overlay-light-text);
        --icon-color: var(--color-overlay-light-text);
        text-shadow: none;
      }

      /* DS pill mode — engaged when the consumer sets [type]. Overrides
         the legacy chip chrome (shadow) and shape (12px radius) with
         the design-system pill (flat, type-colored via .pill-{type},
         1px border, 999px radius). Background/foreground/icon-color
         are owned by pillVariants — we only set non-color chrome here
         so we don't outrank the variant. */
      .label[class*='pill-'] {
        font-size: 11.5px;
        font-weight: var(--w-regular);
        /* border color is owned by .pill-{type} in pillVariants — only
           set width/style here so we don't outrank the variant. */
        border-width: 1px;
        border-style: solid;
        border-radius: 999px;
        box-shadow: none;
      }
      .label[class*='pill-'] .mask {
        padding: 0 7px;
        height: 20px;
        align-items: center;
        gap: 4px;
        border-radius: 999px;
      }
      /* Hover tint pulled from the pill's own foreground (which is the
         dark variant shade), so flow stays bluish, group stays purplish,
         etc. — no grey wash. */
      .label[class*='pill-'].clickable .mask:hover {
        background: color-mix(in oklab, currentColor 10%, transparent);
      }
      .label[class*='pill-'] temba-icon {
        margin-right: 0;
        padding-bottom: 0;
      }

      /* Chip-style X button — matches the multi-select chip's
         .remove-item. currentColor-tinted bg so it picks up the
         pill variant's hue. Sits on the left, ahead of the icon. */
      .label[class*='pill-'] .remove {
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        padding: 0;
        margin: 0;
        border: 0;
        border-radius: 999px;
        background: color-mix(in oklab, currentColor 25%, transparent);
        color: inherit;
        opacity: 0.8;
        --icon-color: currentColor;
      }
      .label[class*='pill-'] .remove:hover {
        opacity: 1;
        background: color-mix(in oklab, currentColor 45%, transparent);
      }

      /* When a removable X is present, tighten the mask's left padding
         so the X sits snug against the pill edge (matches the
         multi-select chip's 4px left padding). Right padding stays so
         the trailing icon/name keep their breathing room. */
      .label[class*='pill-']:has(.remove) .mask {
        padding-left: 4px;
      }

      .danger {
        background: tomato;
        color: #fff;
        --icon-color: #fff;
      }

      .primary {
        background: var(--color-primary-dark);
        color: var(--color-text-light);
        --icon-color: var(--color-text-light);
      }

      .secondary {
        background: var(--color-secondary-dark);
        color: var(--color-text-light);
        --icon-color: var(--color-text-light);
      }

      .tertiary {
        background: var(--color-tertiary);
        color: var(--color-text-light);
        --icon-color: var(--color-text-light);
      }

      .dark {
        background: var(--color-overlay-dark);
        text-shadow: none;
      }

      .clickable {
        cursor: pointer;
      }

      .shadow {
        box-shadow: 1px 1px 2px 1px rgba(0, 0, 0, 0.1);
      }

      /* DS pill variants come last so .pill-{type} wins on source
         order against equal-specificity legacy rules above (.label,
         .danger, .primary, etc.). */
      ${pillVariants}
    `;
  }

  @property({ type: Boolean })
  clickable: boolean;

  @property({ type: Boolean })
  primary: boolean;

  @property({ type: Boolean })
  secondary: boolean;

  @property({ type: Boolean })
  tertiary: boolean;

  @property({ type: Boolean })
  danger: boolean;

  @property({ type: Boolean })
  dark: boolean;

  @property({ type: Boolean })
  shadow: boolean;

  @property({ type: String })
  icon: string;

  /**
   * Design-system pill variant — `flow`, `group`, `contact`, `field`,
   * `keyword`, `label`, or `neutral`. When set, switches the chrome to
   * a flat DS pill (rounded 999px, type-colored). Stays the legacy
   * shadowed label when unset, so existing consumers are unaffected.
   */
  @property({ type: String })
  type: string;

  /**
   * Render a chip-style X button on the left of the pill. Clicking it
   * fires a `temba-remove` event; the rest of the pill stays clickable
   * for navigation as usual.
   */
  @property({ type: Boolean })
  removable: boolean;

  @property()
  backgroundColor: string;

  @property()
  textColor: string;

  private handleRemove(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    this.dispatchEvent(
      new CustomEvent('temba-remove', { bubbles: true, composed: true })
    );
  }

  public render(): TemplateResult {
    const labelStyle = {};

    if (this.backgroundColor) {
      labelStyle['background'] = this.backgroundColor;
    }

    if (this.textColor) {
      labelStyle['color'] = this.textColor;
      labelStyle['--icon-color'] = this.textColor;
    }

    const variantClass = this.type ? `pill-${this.type}` : '';

    return html`
      <div
        class="label ${getClasses({
          clickable: this.clickable,
          primary: this.primary,
          secondary: this.secondary,
          tertiary: this.tertiary,
          shadow: this.shadow,
          danger: this.danger,
          dark: this.dark
        })} ${variantClass}"
        style=${styleMap(labelStyle)}
      >
        <div class="mask">
          ${this.removable
            ? html`<button
                class="remove"
                @click=${this.handleRemove}
                aria-label="Remove"
              >
                <temba-icon name="x" size="0.85"></temba-icon>
              </button>`
            : null}
          ${this.icon ? html`<temba-icon name=${this.icon} />` : null}
          <slot></slot>
        </div>
      </div>
    `;
  }
}
