import { customElement, property } from "lit-element/lib/decorators";
import { TemplateResult, html, css } from "lit-element";
import RapidElement from "../RapidElement";
import { getUrl, serialize, postUrl } from "../utils";
import axios, { AxiosResponse, CancelTokenSource } from "axios";
import { unsafeHTML } from "lit-html/directives/unsafe-html";
import TextInput from "../textinput/TextInput";
import { throws } from "assert";
import { CustomEventType } from "../interfaces";

@customElement("temba-modax")
export default class Modax extends RapidElement {
  static get styles() {
    return css`
      fieldset {
        border: none;
        margin: 0;
        padding: 0;
      }

      .control-group {
        margin-bottom: 12px;
        display: block;
      }

      .form-actions {
        display: none;
      }

      .modax-body {
        padding: 20px;
      }

      temba-loading {
        margin: 0 auto;
        display: block;
        width: 150px;
      }

      ul.errorlist {
        margin-top: 0px;
        list-style-type: none;
        padding-left: 0;
        padding-bottom: 7px;
      }

      ul.errorlist li {
        color: var(--color-error);
        background: rgba(255, 181, 181, 0.17);
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1),
          0 1px 2px 0 rgba(0, 0, 0, 0.06);
        color: tomato;
        padding: 10px;
        margin-bottom: 10px;
        border-radius: 6px;
        font-weight: 300;
      }
    `;
  }

  @property({ type: String })
  header: string = "";

  @property({ type: String })
  endpoint: string;

  @property({ type: Boolean, reflect: true })
  open: boolean;

  @property({ type: Boolean })
  fetching: boolean;

  @property({ type: Boolean })
  submitting: boolean;

  @property({ type: String })
  primaryName: string;

  @property({ type: String })
  cancelName: string;

  @property({ type: String })
  onLoaded: string;

  @property({ type: String })
  onSubmitted: string;

  @property({ type: Boolean })
  noSubmit: boolean;

  @property({ type: String })
  body: any = this.getLoading();

  private cancelToken: CancelTokenSource;

  private handleSlotClicked(): void {
    this.open = true;
  }

  private focusFirstInput(): void {
    window.setTimeout(() => {
      let input = this.shadowRoot.querySelector(
        "temba-textinput, temba-completion"
      ) as any;

      if (input) {
        input = input.textInputElement
          ? input.textInputElement.inputElement
          : input.inputElement;

        if (input) {
          if (!input.readOnly) {
            input.click();
          }
        }
      }
    }, 100);
  }

  public updated(changes: Map<string, any>) {
    super.updated(changes);

    if (changes.has("open")) {
      if (this.open) {
        this.fetchForm();
      } else {
        // hide our body after our hiding animation is done
        window.setTimeout(() => {
          this.body = this.getLoading();
          this.submitting = false;
        }, 500);
      }
    }

    if (changes.has("body") && this.open && this.body) {
      this.focusFirstInput();
    }
  }

  private getLoading() {
    return html` <temba-loading units="6" size="8"></temba-loading> `;
  }

  private updatePrimaryButton(): void {
    if (!this.noSubmit) {
      window.setTimeout(() => {
        const submitButton = this.shadowRoot.querySelector(
          "input[type='submit']"
        ) as any;

        if (submitButton) {
          this.primaryName = submitButton.value;
        } else {
          this.primaryName = null;
          this.cancelName = "Ok";
        }

        this.submitting = false;
      }, 0);
    }
  }

  private setBody(body: string): boolean {
    // remove any existing on our previous body
    const scriptBlock = this.shadowRoot.querySelector(".scripts");
    for (const child of scriptBlock.children) {
      child.remove();
    }

    // parse out any scripts in the body
    const div = this.ownerDocument.createElement("div");
    div.innerHTML = body;
    const scripts = div.getElementsByTagName("script");

    // IE bleeds through, avoid bootstrap form spans that breaks layout
    const spans = div.getElementsByClassName("span12");
    for (const span of spans) {
      span.className = "";
    }

    const toAdd: any = [];
    // now add them in
    for (let i = scripts.length - 1; i >= 0; i--) {
      // for (let i = 0; i < scripts.length; i++) {
      const script = this.ownerDocument.createElement("script");
      var code = scripts[i].innerText;
      if (scripts[i].src) {
        script.src = scripts[i].src;
        script.type = "text/javascript";
        script.async = true;

        // TODO: track and fire event once all scripts are loaded
        script.onload = function () {};
        toAdd.push(script);
      } else if (code) {
        script.appendChild(this.ownerDocument.createTextNode(code));
        toAdd.push(script);
        // remove it from our current body text
      }
      scripts[i].remove();
    }

    const scriptOnly = !!div.querySelector(".success-script");

    if (!scriptOnly) {
      this.body = unsafeHTML(div.innerHTML);
    }

    window.setTimeout(() => {
      for (const script of toAdd) {
        scriptBlock.appendChild(script);
      }
    }, 0);

    return !scriptOnly;
  }

  private fetchForm() {
    const CancelToken = axios.CancelToken;
    this.cancelToken = CancelToken.source();
    this.fetching = true;
    this.body = this.getLoading();
    getUrl(this.endpoint, this.cancelToken.token, true).then(
      (response: AxiosResponse) => {
        this.setBody(response.data);
        this.updatePrimaryButton();
        this.fetching = false;
        if (this.onLoaded) {
          window.setTimeout(() => {
            const fn = eval(this.onLoaded);
            fn(
              new CustomEvent("loaded", {
                detail: { body: this.shadowRoot.querySelector(".modax-body") },
                bubbles: true,
                composed: true,
              })
            );
          }, 0);
        }
      }
    );
  }

  private handleDialogClick(evt: CustomEvent) {
    const button = evt.detail.button;
    if (!button.disabled && !button.submitting) {
      if (button.name === this.primaryName) {
        this.submitting = true;
        const form = this.shadowRoot.querySelector("form");
        const postData = serialize(form);

        postUrl(this.endpoint, postData, true).then(
          (response: AxiosResponse) => {
            window.setTimeout(() => {
              let redirect = response.headers["temba-success"];

              if (
                !redirect &&
                response.request.responseURL &&
                response.request.responseURL !== this.endpoint
              ) {
                redirect = response.request.responseURL;
              }

              if (redirect) {
                if (redirect === "hide") {
                  this.open = false;

                  if (this.onSubmitted) {
                    window.setTimeout(() => {
                      const fn = eval(this.onSubmitted);
                      fn(
                        new CustomEvent("submitted", {
                          bubbles: true,
                          composed: true,
                        })
                      );
                    }, 0);
                  }
                } else {
                  this.ownerDocument.location = redirect;
                }
              } else {
                // if we set the body, update our submit button
                if (this.setBody(response.data)) {
                  this.updatePrimaryButton();
                }
              }
            }, 2000);
          }
        );
      }
    }

    if (button.name === (this.cancelName || "Cancel")) {
      this.open = false;
      this.fetching = false;
      this.cancelToken.cancel();
    }
  }

  private handleDialogHidden() {
    this.cancelToken.cancel();
    this.open = false;
    this.fetching = false;
  }

  private isDestructive(): boolean {
    return this.endpoint && this.endpoint.indexOf("delete") > -1;
  }

  public render(): TemplateResult {
    return html`
      <temba-dialog
        header=${this.header}
        .primaryButtonName=${this.noSubmit ? null : this.primaryName}
        .cancelButtonName=${this.cancelName || "Cancel"}
        ?open=${this.open}
        ?loading=${this.fetching}
        ?submitting=${this.submitting}
        ?destructive=${this.isDestructive()}
        @temba-button-clicked=${this.handleDialogClick.bind(this)}
        @temba-dialog-hidden=${this.handleDialogHidden.bind(this)}
      >
        <div class="modax-body">
          ${this.body}
        </div>
        <div class="scripts"></div>
      </temba-dialog>
      <div class="slot-wrapper" @click=${this.handleSlotClicked}>
        <slot></slot>
      </div>
    `;
  }
}
