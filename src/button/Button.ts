import {
  LitElement,
  TemplateResult,
  html,
  css,
  customElement,
  property,
} from "lit-element";
import { getClasses } from "../utils";

@customElement("temba-button")
export default class Button extends LitElement {
  static get styles() {
    return css`
      :host {
        display: inline-block;
        font-family: var(--font-family);
        font-weight: 300;
      }

      .button-container {
        background: blue;
        color: #fff;
        cursor: pointer;
        display: block;
        border-radius: var(--curvature);
        outline: none;
        transition: background ease-in 100ms;
        user-select: none;
        text-align: center;
        font-weight: 400;
      }

      .button-secondary:hover .button-mask {
        border: 1px solid var(--color-button-secondary);
      }

      .button-mask:hover {
        background: rgba(0, 0, 0, 0.1);
      }

      .button-container:focus {
        outline: none;
        margin: 0;
      }

      .button-container:focus .button-mask {
        background: rgb(0, 0, 0, 0.1);
        box-shadow: 0 0 0px 1px var(--color-focus);
      }

      .button-container.button-secondary:focus .button-mask {
        background: transparent;
        box-shadow: 0 0 0px 1px var(--color-focus);
      }

      .button-mask {
        padding: var(--button-y) var(--button-x);
        border-radius: var(--curvature);
        border: 1px solid transparent;
        transition: all ease-in 250ms;
      }

      .button-container.button-disabled {
        background: var(--color-button-disabled);
        color: rgba(255, 255, 255, 0.45);
        cursor: default;
      }

      .button-container.button-disabled .button-mask {
        box-shadow: 0 0 0px 1px var(--color-button-disabled);
      }

      .button-container.button-disabled:hover .button-mask {
        box-shadow: 0 0 0px 1px var(--color-button-disabled);
      }

      .button-container.button-active .button-mask {
        box-shadow: inset 0 0 4px 2px rgb(0, 0, 0, 0.1);
      }

      .button-secondary.button-active {
        background: transparent;
        color: var(--color-text);
      }

      .button-secondary.active .button-mask {
        /* box-shadow: inset 0 0 4px 2px rgb(0,0,0, .1); */
        border: none;
      }

      .button-container.button-secondary.button-active:focus .button-mask {
        background: transparent;
        box-shadow: none;
      }

      .button-primary {
        background: var(--color-button-primary);
        color: var(--color-button-primary-text);
      }

      .button-attention {
        background: var(--color-button-attention);
        color: var(--color-button-primary-text);
      }

      .button-secondary {
        background: transparent;
        color: var(--color-text);
        font-weight: 300;
      }

      .button-destructive {
        background: var(--color-button-destructive);
        color: var(--color-button-destructive-text);
      }

      .button-mask.disabled {
        background: rgba(0, 0, 0, 0.1);
      }

      .button-secondary .button-mask:hover {
        background: transparent;
      }

      temba-loading {
        margin-bottom: -3px;
      }
    `;
  }

  @property({ type: Boolean })
  primary: boolean;

  @property({ type: Boolean })
  secondary: boolean;

  @property({ type: Boolean })
  attention: boolean;

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
    if (this.href) {
      this.ownerDocument.location.href = this.href;
      evt.preventDefault();
      evt.stopPropagation();
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    this.active = false;
    if (event.key === "Enter") {
      this.click();
    }
  }

  private handleMouseDown(event: MouseEvent): void {
    if (!this.disabled) {
      this.active = true;
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    this.active = false;
  }

  public render(): TemplateResult {
    return html`
      <div
        class="button-container 
          ${getClasses({
          "button-primary":
            this.primary ||
            (!this.primary && !this.secondary && !this.attention),
          "button-secondary": this.secondary,
          "button-disabled": this.disabled || this.submitting,
          "button-active": this.active,
          "button-attention": this.attention,
          "button-destructive": this.destructive,
        })}"
        tabindex="0"
        @mousedown=${this.handleMouseDown}
        @mouseup=${this.handleMouseUp}
        @mouseleave=${this.handleMouseUp}
        @keyup=${this.handleKeyUp}
        @click=${this.handleClick}
      >
        <div class="button-mask">
          <div class="button-name">
            ${this.submitting
              ? html`<temba-loading
                  units="3"
                  size="8"
                  color="#eee"
                ></temba-loading>`
              : this.name}
          </div>
        </div>
      </div>
    `;
  }
}
