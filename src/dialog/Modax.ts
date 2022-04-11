import { TemplateResult, html, css } from 'lit';
import { property } from 'lit/decorators';
import { unsafeHTML } from 'lit-html/directives/unsafe-html';

import { RapidElement } from '../RapidElement';
import { getUrl, serialize, postUrl, WebResponse } from '../utils';
import { CustomEventType } from '../interfaces';
import { Dialog } from './Dialog';

export class Modax extends RapidElement {
  static get styles() {
    return css`
      :host {
      }

      fieldset {
        border: none;
        margin: 0;
        padding: 0;
      }

      .control-group {
        margin-bottom: var(--control-margin-bottom);
      }

      .form-actions {
        display: none;
      }

      .modax-body {
        padding: 20px;
        display: block;
        position: relative;
        background: var(--body-bg);
      }

      .modax-body.submitting:before {
        display: inline-block;
        content: '';
        height: 100%;
        width: 100%;
        margin-left: -20px;
        margin-top: -20px;
        background: rgba(200, 200, 200, 0.1);
        position: absolute;
        z-index: 10000;
      }

      temba-dialog {
        --transition-speed: var(--transition-speed);
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
  header = '';

  @property({ type: String })
  endpoint: string;

  @property({ type: Boolean, reflect: true })
  open = false;

  @property({ type: Boolean })
  fetching = false;

  @property({ type: Boolean })
  submitting: boolean;

  @property({ type: String })
  primaryName: string;

  @property({ type: String })
  cancelName: string;

  @property({ type: String })
  onLoaded: string;

  @property({ type: Boolean })
  noSubmit: boolean;

  @property({ type: Object })
  headers: any = {};

  @property({ type: String })
  body: any = this.getLoading();

  @property({ type: Boolean })
  disabled = false;

  @property({ type: Boolean })
  suspendSubmit = false;
  // private cancelToken: CancelTokenSource;

  // http promise to monitor for completeness
  public httpComplete: Promise<void | WebResponse>;

  private handleSlotClicked(): void {
    this.open = true;
  }

  public updated(changes: Map<string, any>) {
    super.updated(changes);

    if (changes.has('open')) {
      if (this.open) {
        this.fetchForm();
      } else {
        // open can get reflected into undefined, make sure we've been open before
        if (changes.get('open') !== undefined) {
          // hide our body after our hiding animation is done
          window.setTimeout(() => {
            this.body = this.getLoading();
            this.submitting = false;
          }, 500);
        }
      }
    }

    if (changes.has('body') && this.open && this.body && !this.fetching) {
      const dialog = this.shadowRoot.querySelector('temba-dialog') as Dialog;
      dialog.focusFirstInput();
    }
  }

  private getLoading() {
    return html`<temba-loading units="6" size="8"></temba-loading>`;
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
          this.cancelName = 'Ok';
        }

        this.submitting = false;
      }, 0);
    }
  }

  private setBody(body: string): boolean {
    // remove any existing on our previous body
    const scriptBlock = this.shadowRoot.querySelector('.scripts') as any;
    for (const child of scriptBlock.children) {
      child.remove();
    }

    // parse out any scripts in the body
    const div = this.ownerDocument.createElement('div');
    div.innerHTML = body;
    const scripts = div.getElementsByTagName('script');

    // IE bleeds through, avoid bootstrap form spans that breaks layout
    const spans = div.getElementsByClassName('span12') as any;
    for (const span of spans) {
      span.className = '';
    }

    const toAdd: any = [];
    // now add them in
    for (let i = scripts.length - 1; i >= 0; i--) {
      // for (let i = 0; i < scripts.length; i++) {
      const script = this.ownerDocument.createElement('script');
      const code = scripts[i].innerText;

      if (scripts[i].src) {
        script.src = scripts[i].src;
        script.type = 'text/javascript';
        script.async = true;

        // TODO: track and fire event once all scripts are loaded
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        script.onload = function () {};
        toAdd.push(script);
      } else if (code) {
        script.appendChild(this.ownerDocument.createTextNode(code));
        toAdd.push(script);
        // remove it from our current body text
      }
      scripts[i].remove();
    }

    const scriptOnly = !!div.querySelector('.success-script');

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

  public getHeaders(): any {
    const headers = this.headers;
    headers['X-PJAX'] = 1;
    return headers;
  }

  private fetchForm() {
    // const CancelToken = axios.CancelToken;
    // this.cancelToken = CancelToken.source();
    this.fetching = true;
    this.body = this.getLoading();
    this.httpComplete = getUrl(this.endpoint, null, this.getHeaders()).then(
      (response: WebResponse) => {
        this.setBody(response.body);
        this.updatePrimaryButton();
        this.fetching = false;
        window.setTimeout(() => {
          this.fireCustomEvent(CustomEventType.Loaded, {
            body: this.getBody(),
          });
        }, 0);
      }
    );
  }

  public submit(): void {
    this.submitting = true;
    const form = this.shadowRoot.querySelector('form');
    const postData = form ? serialize(form) : {};

    this.httpComplete = postUrl(
      this.endpoint,
      postData,
      this.getHeaders(),
      'application/x-www-form-urlencoded'
    )
      .then((response: WebResponse) => {
        window.setTimeout(() => {
          let redirect = response.headers.get('temba-success');
          if (
            !redirect &&
            response.url &&
            response.url.indexOf(this.endpoint) === -1
          ) {
            redirect = response.url;
          }

          if (redirect) {
            if (redirect === 'hide') {
              window.setTimeout(() => {
                this.open = false;
                this.fireCustomEvent(CustomEventType.Submitted);
              }, 0);
            } else {
              this.fireCustomEvent(CustomEventType.Redirected, {
                url: redirect,
              });
              this.open = false;
            }
          } else {
            // if we set the body, update our submit button
            if (this.setBody(response.body)) {
              this.updatePrimaryButton();
            }
          }
        }, 1000);
      })
      .catch(error => {
        console.error(error);
      });
  }

  private handleDialogClick(evt: CustomEvent) {
    const button = evt.detail.button;
    if (!button.disabled && !button.submitting) {
      if (button.name === this.primaryName) {
        if (!this.suspendSubmit) {
          this.submit();
        }
      }
    }

    if (button.name === (this.cancelName || 'Cancel')) {
      this.open = false;
      this.fetching = false;
      this.cancelName = undefined;
    }
  }

  private handleDialogHidden() {
    // this.cancelToken.cancel();
    this.open = false;
    this.fetching = false;
  }

  private isDestructive(): boolean {
    return this.endpoint && this.endpoint.indexOf('delete') > -1;
  }

  public getBody() {
    return this.shadowRoot.querySelector('.modax-body');
  }

  public render(): TemplateResult {
    return html`
      <temba-dialog
        header=${this.header}
        .primaryButtonName=${this.noSubmit ? null : this.primaryName}
        .cancelButtonName=${this.cancelName || 'Cancel'}
        ?open=${this.open}
        ?loading=${this.fetching}
        ?submitting=${this.submitting}
        ?destructive=${this.isDestructive()}
        ?noFocus=${true}
        ?disabled=${this.disabled}
        @temba-button-clicked=${this.handleDialogClick.bind(this)}
        @temba-dialog-hidden=${this.handleDialogHidden.bind(this)}
      >
        <div class="modax-body${this.submitting ? ' submitting' : ''}">
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
