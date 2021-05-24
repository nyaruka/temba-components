import { property } from 'lit-element/lib/decorators';
import { TemplateResult, html, css } from 'lit-element';
import { Button } from '../button/Button';
import { RapidElement } from '../RapidElement';
import { CustomEventType } from '../interfaces';
import { styleMap } from 'lit-html/directives/style-map';
import { getClasses } from '../utils';

export class Dialog extends RapidElement {
  static get widths(): { [size: string]: string } {
    return {
      small: '400px',
      medium: '600px',
      large: '655px',
    };
  }

  static get styles() {
    return css`
      :host {
        position: absolute;
        z-index: 10000;
        font-family: var(--font-family);
        --transition-speed: 250ms;
      }

      .flex {
        display: flex;
        flex-direction: column;
        width: 100%;
        position: relative;
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
        transition: opacity linear calc(var(--transitions-speed) / 2ms);
        pointer-events: none;
      }

      .dialog-container {
        margin-top: -10000px;
        position: relative;
        transition: transform cubic-bezier(0.71, 0.18, 0.61, 1.33)
            var(--transition-speed),
          opacity ease-in-out calc(var(--transition-speed) - 50ms);
        border-radius: var(--curvature);
        box-shadow: 0px 0px 2px 4px rgba(0, 0, 0, 0.06);
        overflow: hidden;
        transform: scale(0.7);
      }

      .dialog-body {
        background: #fff;
        max-height: 55vh;
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
        margin-top: 10vh;
        transform: scale(1) !important;
      }

      .dialog-mask.dialog-ready .dialog-container {
        margin-top: 10vh;
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
        transition: opacity calc(var(--transition-speed) * 5ms) ease-in
          calc(var(--transition-speed * 2));
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

  @property({ type: Boolean })
  hideOnClick: boolean;

  @property()
  size = 'medium';

  @property({ type: String })
  primaryButtonName = 'Ok';

  @property({ type: String })
  cancelButtonName = 'Cancel';

  @property()
  submittingName = 'Saving';

  @property()
  animationEnd: boolean;

  @property()
  ready: boolean;

  @property({ attribute: false })
  onButtonClicked: (button: Button) => void;

  scrollOffset: any = 0;

  public constructor() {
    super();
  }

  public updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('open')) {
      const body = document.querySelector('body');

      if (this.open) {
        this.animationEnd = true;
        window.setTimeout(() => {
          this.ready = true;
          this.animationEnd = false;
        }, 400);

        this.scrollOffset = -document.documentElement.scrollTop;
        body.style.position = 'fixed';
        body.style.overflowY = 'scroll';
        body.style.top = this.scrollOffset + 'px';
        body.style.width = '100%';
      } else {
        body.style.position = '';
        body.style.overflowY = '';
        body.style.width = '';
        window.scrollTo(0, parseInt(this.scrollOffset || '0') * -1);
      }

      // make sure our buttons aren't in progress on show
      if (this.open) {
        this.shadowRoot
          .querySelectorAll('temba-button')
          .forEach((button: Button) => (button.disabled = false));
        const inputs = this.querySelectorAll('textarea,input');
        if (inputs.length > 0) {
          window.setTimeout(() => {
            const input = inputs[0] as any;
            input.click();
            input.focus();
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
      if (button.name === this.cancelButtonName) {
        this.open = false;
      }
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

  private clickCancel() {
    const cancel = this.getCancelButton();
    if (cancel) {
      cancel.click();
    }
  }

  public getCancelButton(): Button {
    return this.shadowRoot.querySelector(
      `temba-button[name='${this.cancelButtonName}']`
    );
  }

  private handleKeyUp(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.clickCancel();
    }
  }

  private handleClickMask(event: MouseEvent) {
    if (this.hideOnClick) {
      const id = (event.target as HTMLElement).id;
      if (id === 'dialog-mask' || id === 'dialog-bg') {
        this.fireCustomEvent(CustomEventType.DialogHidden);
        this.clickCancel();
      }
    }
  }

  public render(): TemplateResult {
    const height = this.getDocumentHeight();

    const maskStyle = { height: `${height + 100}px` };
    const dialogStyle = { width: Dialog.widths[this.size] };

    const header = this.header
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
          'dialog-open': this.open,
          'dialog-loading': this.loading,
          'dialog-animation-end': this.animationEnd,
          'dialog-ready': this.ready,
        })}"
        style=${styleMap(maskStyle)}
      >
        <div style="position: absolute; width: 100%;">
          <temba-loading
            id="page-loader"
            units="6"
            size="12"
            color="#ccc"
          ></temba-loading>
        </div>

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
