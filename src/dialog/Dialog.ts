import { customElement, property } from "lit-element/lib/decorators";
import { TemplateResult, html, css } from "lit-element";
import Button from "../button/Button";
import RapidElement from "../RapidElement";
import Shadowless from "../shadowless/Shadowless";
import { CustomEventType } from "../interfaces";
import { styleMap } from "lit-html/directives/style-map.js";
import { getClasses } from "../utils";

@customElement("temba-dialog")
export default class Dialog extends RapidElement {
  static get widths(): { [size: string]: string } {
    return {
      small: "400px",
      medium: "600px",
      large: "655px",
    };
  }

  static get styles() {
    return css`
      :host {
        position: absolute;
        z-index: 10000;
        font-family: var(--font-family);
      }

      .flex {
        display: flex;
        flex-direction: column;
        height: 100vh;
        width: 100%;
        position: absolute;
        left: 0px;
        top: 0px;
        align-items: center;
      }

      .flex-grow {
        flex-grow: 1;
      }

      .bottom-padding {
        padding: 3rem;
      }

      .dialog-mask {
        width: 100%;
        background: rgba(0, 0, 0, 0.5);
        opacity: 0;
        position: fixed;
        top: 0px;
        left: 0px;
        transition: opacity linear 100ms;
        pointer-events: none;
      }

      .dialog-container {
        margin-top: -10000px;
        position: relative;
        transition: transform cubic-bezier(0.71, 0.18, 0.61, 1.33) 250ms,
          opacity ease-in-out 200ms;
        border-radius: var(--curvature);
        box-shadow: 0px 0px 2px 4px rgba(0, 0, 0, 0.06);
        overflow: hidden;
        transform: scale(0.7);
      }

      .dialog-body {
        background: #fff;
        max-height: 460px;
        overflow-y: auto;
      }

      .dialog-mask.dialog-open {
        opacity: 1;
        pointer-events: auto;
      }

      .dialog-mask.dialog-open .dialog-container {
        top: inherit;
      }

      .dialog-mask.dialog-animation-end .dialog-container {
        margin-top: 0;
        transform: scale(1) !important;
      }

      .dialog-mask.dialog-ready .dialog-container {
        margin-top: 0;
        transform: none;
      }

      .dialog-mask.dialog-loading .dialog-container {
        margin-top: -10000px;
      }

      .header-text {
        font-size: 20px;
        padding: 12px 20px;
        font-weight: 300;
        color: var(--color-text-light);
        background: var(--color-primary-dark);
      }

      .dialog-footer {
        background: var(--color-primary-light);
        padding: 10px;
        display: flex;
        flex-flow: row-reverse;
      }

      temba-button {
        margin-left: 10px;
      }

      .dialog-body temba-loading {
        position: absolute;
        right: 12px;
        margin-top: -30px;
        padding-bottom: 9px;
        display: none;
      }

      #page-loader {
        text-align: center;
        display: block;
        position: relative;
        opacity: 0;
        margin: auto;
        margin-top: 30px;
        width: 154px;
        transition: opacity 1000ms ease-in 500ms;
        visibility: hidden;
      }

      .dialog-mask.dialog-loading #page-loader {
        opacity: 1;
        visibility: visible;
      }

      #submit-loader {
        flex-grow: 1;
        text-align: right;
      }
    `;
  }

  @property({ type: Boolean })
  open: boolean;

  @property()
  header: string;

  @property()
  body: string;

  @property({ type: Boolean })
  submitting: boolean;

  @property({ type: Boolean })
  destructive: boolean;

  @property({ type: Boolean })
  loading: boolean;

  @property()
  size: string = "medium";

  @property({ type: String })
  primaryButtonName: string = "Ok";

  @property({ type: String })
  cancelButtonName: string = "Cancel";

  @property()
  submittingName: string = "Saving";

  @property()
  animationEnd: boolean;

  @property()
  ready: boolean;

  @property({ attribute: false })
  onButtonClicked: (button: Button) => void;

  public constructor() {
    super();
  }

  public updated(changedProperties: Map<string, any>) {
    if (changedProperties.has("open")) {
      if (this.open) {
        this.animationEnd = true;
        window.setTimeout(() => {
          this.ready = true;
          this.animationEnd = false;
        }, 400);
      }

      // make sure our buttons aren't in progress on show
      if (this.open) {
        this.shadowRoot
          .querySelectorAll("temba-button")
          .forEach((button: Button) => (button.disabled = false));
        const inputs = this.querySelectorAll("textarea,input");
        if (inputs.length > 0) {
          window.setTimeout(() => {
            (inputs[0] as any).click();
          }, 100);
        }
      } else {
        window.setTimeout(() => {
          this.ready = false;
        }, 400);
      }
    }
  }

  public handleClick(evt: MouseEvent) {
    const button = evt.currentTarget as Button;
    if (!button.disabled) {
      this.fireCustomEvent(CustomEventType.ButtonClicked, { button });
    }
  }

  private getDocumentHeight(): number {
    const body = document.body;
    const html = document.documentElement;
    return Math.max(
      body.scrollHeight,
      body.offsetHeight,
      html.clientHeight,
      html.scrollHeight,
      html.offsetHeight
    );
  }

  private handleKeyUp(event: KeyboardEvent) {
    if (event.key === "Escape") {
      // find our cancel button and click it
      this.shadowRoot
        .querySelectorAll("temba-button")
        .forEach((button: Button) => {
          if (button.name === this.cancelButtonName) {
            button.click();
          }
        });
    }
  }

  private handleClickMask(event: MouseEvent) {
    if ((event.target as HTMLElement).id === "dialog-mask") {
      this.fireCustomEvent(CustomEventType.DialogHidden);
    }
  }

  public render(): TemplateResult {
    const height = this.getDocumentHeight();

    const maskStyle = { height: `${height + 100}px` };
    const dialogStyle = { width: Dialog.widths[this.size] };

    let header = this.header
      ? html`
          <div class="dialog-header">
            <div class="header-text">${this.header}</div>
          </div>
        `
      : null;

    return html`
      <div
        id="dialog-mask"
        @click=${this.handleClickMask}
        class="dialog-mask ${getClasses({
          "dialog-open": this.open,
          "dialog-loading": this.loading,
          "dialog-animation-end": this.animationEnd,
          "dialog-ready": this.ready,
        })}"
        style=${styleMap(maskStyle)}
      >
        <temba-loading
          id="page-loader"
          units="6"
          size="12"
          color="#ccc"
        ></temba-loading>

        <div class="flex">
          <div class="flex-grow"></div>
          <div
            @keyup=${this.handleKeyUp}
            style=${styleMap(dialogStyle)}
            class="dialog-container"
          >
            ${header}
            <div class="dialog-body" @keypress=${this.handleKeyUp}>
              ${this.body ? this.body : html` <slot></slot> `}
              <temba-loading units="6" size="8"></temba-loading>
            </div>

            <div class="dialog-footer">
                ${
                  this.primaryButtonName
                    ? html`
                        <temba-button
                          @click=${this.handleClick}
                          .name=${this.primaryButtonName}
                          ?destructive=${this.destructive}
                          ?primary=${!this.destructive}
                          ?submitting=${this.submitting}
                          >}</temba-button
                        >
                      `
                    : null
                }
                <temba-button
                  @click=${this.handleClick}
                  name=${this.cancelButtonName}
                  secondary
                ></temba-button>
              </div>
            </div>
            <div class="flex-grow bottom-padding"></div>
            <div class="bottom-padding"></div>
          </div>
        </div>
      </div>
    `;
  }
}
