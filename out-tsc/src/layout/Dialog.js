import { __decorate } from "tslib";
import { property } from 'lit/decorators.js';
import { html, css } from 'lit';
import { CustomEventType } from '../interfaces';
import { styleMap } from 'lit-html/directives/style-map.js';
import { getClasses } from '../utils';
import { ResizeElement } from '../ResizeElement';
export var ButtonType;
(function (ButtonType) {
    ButtonType["PRIMARY"] = "primary";
    ButtonType["SECONDARY"] = "secondary";
    ButtonType["DESTRUCTIVE"] = "destructive";
})(ButtonType || (ButtonType = {}));
export class DialogButton {
}
export class Dialog extends ResizeElement {
    static get widths() {
        return {
            small: '400px',
            medium: '600px',
            large: '655px'
        };
    }
    static get styles() {
        return css `
      :host {
        position: absolute;
        z-index: 10000;
        font-family: var(--font-family);
        background: white;
      }

      .flex-grow {
        flex-grow: 1;
      }

      .flex {
        display: flex;
        flex-direction: column;
        width: 100%;
        position: relative;
        left: 0px;
        top: 0px;
        align-items: center;
        height: 100vh;
      }

      .mobile .flex {
        height: 100%;
        position: fixed;
      }

      .mobile .grow-top {
        flex-grow: 0;
      }

      .mobile .grow-bottom {
        flex-grow: 0;
      }

      .grow-top {
        flex-grow: 1;
      }

      .grow-bottom {
        flex-grow: 3;
      }

      .bottom-padding {
        padding: 3rem;
      }

      .dialog-mask {
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        opacity: 0;
        position: fixed;
        top: 0px;
        left: 0px;
        transition: opacity linear calc(var(--transition-speed) / 2ms);
        pointer-events: none;
      }

      .mobile.dialog-mask .dialog-container {
        border-radius: 0px;
      }

      .dialog-mask .dialog-container {
        position: relative;
        transition: transform var(--transition-speed) var(--bounce),
          opacity ease-in-out calc(var(--transition-speed) - 50ms);
        border-radius: var(--curvature);
        box-shadow: 0px 0px 2px 4px rgba(0, 0, 0, 0.06);
        overflow: hidden;
        transform: scale(0.9) translatey(2em);
        background: white;
        margin: auto;
        display: flex;
        flex-direction: column;
      }

      .dialog-body {
        background: #fff;
        overflow-y: auto;
        flex-grow: 1;
      }

      .dialog-mask.dialog-open {
        opacity: 1;
        pointer-events: auto;
      }

      .dialog-mask.dialog-open .dialog-container {
        top: inherit;
      }

      .dialog-mask.dialog-animation-end .dialog-container {
        transform: scale(1) !important;
      }

      .dialog-mask.dialog-ready .dialog-container {
        transform: none;
      }

      .dialog-mask.dialog-loading .dialog-container {
        margin-top: -10000px;
      }

      .header-text {
        display: flex;
        flex-direction: row;
        align-items: center;
        font-size: 20px;
        padding: 12px 20px;
        color: var(--header-text);
        background: var(--header-bg);
      }

      .header-text .title {
        flex-grow: 1;
      }

      .header-text .status {
        font-size: 0.6em;
        font-weight: bold;
      }

      .dialog-footer {
        background: var(--color-primary-light);
        padding: 10px;
        display: flex;
        flex-flow: row;
        align-items: center;
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
    constructor() {
        super();
        this.size = 'medium';
        this.primaryButtonName = 'Ok';
        this.cancelButtonName = 'Cancel';
        this.width = null;
        this.submittingName = 'Saving';
        this.buttons = [];
        this.scrollOffset = 0;
    }
    updateButtons() {
        this.buttons = [];
        if (this.cancelButtonName) {
            this.buttons.push({
                name: this.cancelButtonName,
                type: ButtonType.SECONDARY,
                closes: true
            });
        }
        if (this.primaryButtonName) {
            this.buttons.push({
                name: this.primaryButtonName,
                type: ButtonType.PRIMARY
            });
        }
        this.requestUpdate();
    }
    updated(changes) {
        super.updated(changes);
        if (changes.has('cancelButtonName') || changes.has('primaryButtonName')) {
            this.updateButtons();
        }
        if (changes.has('open')) {
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
                body.style.overflowY = 'hidden';
            }
            else {
                body.style.position = '';
                body.style.overflowY = '';
                body.style.width = '';
                body.style.marginRight = '';
                body.style.paddingRight = '0px';
                window.scrollTo(0, parseInt(this.scrollOffset || '0') * -1);
            }
            // make sure our buttons aren't in progress on show
            if (this.open && !changes.get('open')) {
                this.shadowRoot
                    .querySelectorAll('temba-button')
                    .forEach((button) => {
                    if (button)
                        button.submitting = false;
                });
                if (!this.noFocus) {
                    this.focusFirstInput();
                }
            }
            else {
                window.setTimeout(() => {
                    this.ready = false;
                }, 400);
            }
        }
    }
    focusFirstInput() {
        window.setTimeout(() => {
            let input = this.querySelector('temba-textinput, temba-completion, input[type="text"], textarea');
            if (input) {
                input = input.textInputElement || input.inputElement || input;
                if (!input.readOnly) {
                    input.focus();
                    input.click();
                }
            }
        }, 100);
    }
    handleClick(evt) {
        const button = evt.currentTarget;
        if (!button.disabled) {
            let detail = {};
            if (button.index >= 0 && button.index < this.buttons.length) {
                detail = this.buttons[button.index];
            }
            this.fireCustomEvent(CustomEventType.ButtonClicked, { button, detail });
            if (button.name === this.cancelButtonName || (detail && detail.closes)) {
                this.open = false;
            }
        }
    }
    getDocumentHeight() {
        const body = document.body;
        const html = document.documentElement;
        return Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
    }
    clickCancel() {
        const cancel = this.getCancelButton();
        if (cancel) {
            cancel.click();
        }
    }
    getCancelButton() {
        return this.shadowRoot.querySelector(`temba-button[name='${this.cancelButtonName}']`);
    }
    getPrimaryButton() {
        return this.shadowRoot.querySelector(`temba-button[primary]`);
    }
    handleKeyUp(event) {
        if (event.key === 'Escape') {
            this.clickCancel();
        }
    }
    handleClickMask(event) {
        if (this.hideOnClick) {
            const id = event.target.id;
            if (id === 'dialog-mask' || id === 'dialog-bg') {
                this.fireCustomEvent(CustomEventType.DialogHidden);
                this.clickCancel();
            }
        }
    }
    show() {
        this.open = true;
    }
    hide() {
        this.open = false;
    }
    render() {
        const dialogStyle = {
            width: this.width,
            minWidth: '250px',
            maxWidth: '600px'
        };
        if (!this.width) {
            dialogStyle['width'] = Dialog.widths[this.size];
        }
        if (this.isMobile()) {
            dialogStyle['width'] = '100%';
            dialogStyle['height'] = '100%';
            delete dialogStyle['maxWidth'];
        }
        const header = this.header
            ? html `
          <div class="dialog-header">
            <div class="header-text">
              <div class="title">${this.header}</div>
            </div>
          </div>
        `
            : null;
        return html `
      <div
        id="dialog-mask"
        @click=${this.handleClickMask}
        class="dialog-mask ${getClasses({
            'dialog-open': this.open,
            'dialog-loading': this.loading,
            'dialog-animation-end': this.animationEnd,
            'dialog-ready': this.ready,
            mobile: this.isMobile()
        })}"
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
          <div class="grow-top" style="${this.isMobile() ? 'flex-grow:0' : ''}"></div>
          <div
            @keyup=${this.handleKeyUp}
            style=${styleMap(dialogStyle)}
            class="dialog-container"
          >
            ${header}
            <div class="dialog-body" @keypress=${this.handleKeyUp}>
              ${this.body ? this.body : html `<slot></slot>`}
              <temba-loading units="6" size="8"></temba-loading>
            </div>

            <div class="dialog-footer">
              <div class="flex-grow">
                <slot name="gutter"></slot>
              </div>
              ${this.buttons.map((button, index) => html `
                  <temba-button
                    name=${button.name}
                    ?destructive=${button.type == 'primary' && this.destructive}
                    ?primary=${button.type == 'primary' && !this.destructive}
                    ?secondary=${button.type == 'secondary'}
                    ?submitting=${this.submitting}
                    ?disabled=${this.disabled && !button.closes}
                    index=${index}
                    @click=${this.handleClick}
                  ></temba-button>
                `)}
              </div>
            </div>
            <div class="grow-bottom"></div>
          </div>
        </div>
      </div>
    `;
    }
}
__decorate([
    property({ type: Boolean })
], Dialog.prototype, "open", void 0);
__decorate([
    property()
], Dialog.prototype, "header", void 0);
__decorate([
    property()
], Dialog.prototype, "body", void 0);
__decorate([
    property({ type: Boolean })
], Dialog.prototype, "submitting", void 0);
__decorate([
    property({ type: Boolean })
], Dialog.prototype, "destructive", void 0);
__decorate([
    property({ type: Boolean })
], Dialog.prototype, "disabled", void 0);
__decorate([
    property({ type: Boolean })
], Dialog.prototype, "loading", void 0);
__decorate([
    property({ type: Boolean })
], Dialog.prototype, "hideOnClick", void 0);
__decorate([
    property({ type: Boolean })
], Dialog.prototype, "noFocus", void 0);
__decorate([
    property()
], Dialog.prototype, "size", void 0);
__decorate([
    property({ type: String })
], Dialog.prototype, "primaryButtonName", void 0);
__decorate([
    property({ type: String })
], Dialog.prototype, "cancelButtonName", void 0);
__decorate([
    property({ type: String })
], Dialog.prototype, "width", void 0);
__decorate([
    property()
], Dialog.prototype, "submittingName", void 0);
__decorate([
    property()
], Dialog.prototype, "animationEnd", void 0);
__decorate([
    property()
], Dialog.prototype, "ready", void 0);
__decorate([
    property({ type: Array })
], Dialog.prototype, "buttons", void 0);
__decorate([
    property({ attribute: false })
], Dialog.prototype, "onButtonClicked", void 0);
//# sourceMappingURL=Dialog.js.map