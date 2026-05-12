import { LitElement, TemplateResult, html, css } from 'lit';
import { getClasses } from '../utils';

import { property } from 'lit/decorators.js';

export class Button extends LitElement {
  static get styles() {
    return css`
      :host {
        display: inline-flex;
        align-self: stretch;
        font-family: var(--font);
      }

      /* DS .btn-sm — sizing, type, transition, shape */
      .button-container {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        flex-grow: 1;
        height: 28px;
        padding: 0 10px;
        border: 1px solid transparent;
        border-radius: var(--r-sm);
        font-size: 12.5px;
        font-weight: var(--w-regular);
        letter-spacing: -0.005em;
        line-height: 1;
        white-space: nowrap;
        cursor: pointer;
        user-select: none;
        -webkit-user-select: none;
        outline: none;
        box-sizing: border-box;
        transition:
          background 120ms,
          border-color 120ms,
          color 120ms,
          box-shadow 120ms;
      }

      .button-mask {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        line-height: 1;
      }

      .button-name {
        white-space: nowrap;
      }

      /* even smaller variant (compact lists, list-row actions, etc.) */
      .small {
        height: 24px;
        padding: 0 8px;
        font-size: 12px;
      }

      /* DS .btn-primary — solid accent with subtle inset highlight */
      .primary-button {
        background: var(--accent-600);
        color: #fff;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.18),
          0 1px 1px rgba(15, 22, 36, 0.1);
      }
      .primary-button:hover {
        background: var(--accent-700);
      }

      /* DS .btn-secondary — surface bg + strong border */
      .secondary-button {
        background: var(--surface);
        border-color: var(--border-strong);
        color: var(--text-1);
      }
      .secondary-button:hover {
        background: var(--sunken);
      }

      /* affirmative + attention share DS .btn-primary chrome but tint
         green; treat them as solid CTAs. */
      .attention-button,
      .affirmative {
        background: var(--success, #16a34a);
        color: #fff;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.18),
          0 1px 1px rgba(15, 22, 36, 0.1);
      }
      .attention-button:hover,
      .affirmative:hover {
        background: color-mix(in srgb, var(--success, #16a34a) 88%, black);
      }

      /* DS .btn-danger */
      .destructive-button {
        background: var(--danger, #d03f3f);
        color: #fff;
      }
      .destructive-button:hover {
        background: color-mix(in srgb, var(--danger, #d03f3f) 88%, black);
      }

      /* DS .btn-ghost — text-only, hover fills with sunken */
      .light-button,
      .lined-button {
        background: var(--surface);
        border-color: var(--border-strong);
        color: var(--text-1);
      }
      .light-button:hover,
      .lined-button:hover {
        background: var(--sunken);
      }

      /* icon-only button — square footprint, ghost chrome */
      .icon-button {
        width: 28px;
        padding: 0;
        background: transparent;
        border-color: transparent;
        color: var(--text-2);
      }
      .icon-button:hover {
        background: var(--sunken);
        color: var(--text-1);
      }
      .icon-button.small {
        width: 24px;
      }

      /* active = pressed-down look — slightly inset */
      .button-container.active-button {
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.12);
      }
      .secondary-button.active-button {
        background: var(--sunken);
      }

      /* disabled */
      .button-container.disabled-button {
        opacity: 0.45;
        cursor: not-allowed;
        pointer-events: none;
      }

      /* focus ring — keyboard nav only */
      .button-container:focus-visible {
        box-shadow: var(--widget-box-shadow-focused);
      }

      .submit-animation {
        padding: 1px 4px;
      }

      .submit-animation temba-loading {
        margin-bottom: -3px;
        line-height: normal;
      }
    `;
  }

  @property({ type: Boolean })
  primary: boolean;

  @property({ type: Boolean })
  secondary: boolean;

  @property({ type: Boolean })
  attention: boolean;

  @property({ type: Number })
  v = 1;

  @property({ type: Boolean })
  destructive: boolean;

  @property({ type: Boolean })
  light: boolean;

  @property()
  name: string;

  @property({ type: Boolean })
  disabled: boolean;

  @property({ type: Boolean })
  submitting: boolean;

  @property({ type: Boolean })
  active: boolean;

  @property({ type: Boolean })
  small: boolean;

  @property({ type: Boolean })
  lined: boolean;

  @property({ type: String })
  href: string;

  @property({ type: Number })
  index?: number;

  @property({ type: String })
  icon?: string;

  private handleClick(evt: MouseEvent) {
    if (this.disabled) {
      evt.preventDefault();
      evt.stopPropagation();
    }

    if (this.href && !this.disabled) {
      this.ownerDocument.location.href = this.href;
      evt.preventDefault();
      evt.stopPropagation();
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    this.active = false;
    if (event.key === 'Enter') {
      this.click();
    }
  }

  private handleMouseDown(): void {
    if (!this.disabled && !this.submitting) {
      this.active = true;
      this.classList.add('active');
    }
  }

  private handleMouseUp(): void {
    this.active = false;
    this.classList.remove('active');
  }

  public render(): TemplateResult {
    const buttonName = this.submitting
      ? html`<div class="submit-animation">
          <temba-loading units="3" size="8" color="#eee"></temba-loading>
        </div>`
      : this.name;

    return html`
      <div
        class="button-container 
          v-${this.v}
          ${getClasses({
          'primary-button':
            this.primary ||
            (!this.primary &&
              !this.secondary &&
              !this.attention &&
              this.v == 1),
          'secondary-button': this.secondary,
          'disabled-button': this.disabled,
          'active-button': this.active,
          'attention-button': this.attention,
          'destructive-button': this.destructive,
          'light-button': this.light,
          'lined-button': this.lined,
          'icon-button': !!this.icon,
          small: this.small
        })}"
        tabindex="0"
        @mousedown=${this.handleMouseDown}
        @mouseup=${this.handleMouseUp}
        @mouseleave=${this.handleMouseUp}
        @keyup=${this.handleKeyUp}
        @click=${this.handleClick}
      >
        <div class="button-mask">
          ${this.icon
            ? html`<temba-icon name="${this.icon}"></temba-icon>`
            : null}
          <div class="button-name"><slot name="name">${buttonName}</slot></div>
        </div>
      </div>
    `;
  }
}
