import { LitElement, TemplateResult, html, css } from 'lit';
import { getClasses } from '../utils';

import { property } from 'lit/decorators';

export class Button extends LitElement {
  static get styles() {
    return css`
      :host {
        display: inline-block;
        font-family: var(--font-family);
        font-weight: 400;
      }

      .v-2.button-container {
        background: var(--button-bg);
        background-image: var(--button-bg-img);
        color: var(--button-text);
        box-shadow: var(--button-shadow);
        transition: all 100ms ease-in;
      }

      .button-container {
        color: #fff;
        cursor: pointer;
        display: block;
        border-radius: var(--curvature);
        outline: none;
        transition: background ease-in 200ms;
        user-select: none;
        -webkit-user-select: none;
        text-align: center;
      }

      .button-name {
        white-space: nowrap;
      }

      .secondary-button:hover .button-mask {
        border: 1px solid var(--color-button-secondary);
      }

      .button-mask:hover {
        background: rgba(0, 0, 0, 0.05);
      }

      .button-container:focus {
        outline: none;
        margin: 0;
      }

      .button-container:focus {
        box-shadow: var(--widget-box-shadow-focused);
      }

      .button-container.secondary-button:focus .button-mask {
        background: transparent;
      }

      .button-mask {
        padding: var(--button-y) var(--button-x);
        border-radius: var(--curvature);
        border: 1px solid transparent;
        transition: all ease-in 200ms;
        background: var(--button-mask);
      }

      .button-container.disabled-button {
        background: rgba(0, 0, 0, 0.05);
        color: rgba(255, 255, 255, 0.45);
        cursor: default;
      }

      .button-container.disabled-button .button-mask {
        box-shadow: 0 0 0px 1px var(--color-button-disabled);
      }

      .button-container.disabled-button:hover .button-mask {
        box-shadow: 0 0 0px 1px var(--color-button-disabled);
        background: rgba(0, 0, 0, 0.05);
      }

      .button-container.active-button .button-mask {
      }

      .secondary-button.active-button {
        background: transparent;
        color: var(--color-text);
      }

      .secondary-button.active-button .button-mask {
        border: none;
      }

      .button-container.secondary-button.active-button:focus .button-mask {
        background: transparent;
        box-shadow: none;
      }

      .primary-button {
        background: var(--color-button-primary);
        color: var(--color-button-primary-text);
      }

      .light-button {
        background: var(--color-button-light);
        color: var(--color-button-light-text);
      }

      .attention-button {
        background: var(--color-button-attention);
        color: var(--color-button-primary-text);
      }

      .secondary-button {
        background: transparent;
        color: var(--color-text);
        font-weight: 300;
      }

      .destructive-button {
        background: var(--color-button-destructive);
        color: var(--color-button-destructive-text);
      }

      .button-mask.disabled-button {
        background: rgba(0, 0, 0, 0.1);
      }

      .secondary-button .button-mask:hover {
        background: transparent;
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

  @property()
  name: string;

  @property({ type: Boolean })
  disabled: boolean;

  @property({ type: Boolean })
  submitting: boolean;

  @property({ type: Boolean })
  active: boolean;

  @property({ type: String })
  href: string;

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
        })}"
        tabindex="0"
        @mousedown=${this.handleMouseDown}
        @mouseup=${this.handleMouseUp}
        @mouseleave=${this.handleMouseUp}
        @keyup=${this.handleKeyUp}
        @click=${this.handleClick}
      >
        <div class="button-mask">
          <div class="button-name">${buttonName}</div>
        </div>
      </div>
    `;
  }
}
