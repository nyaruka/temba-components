import { css, html, TemplateResult } from 'lit';
import { RapidElement } from '../RapidElement';
import { splitSMS } from '../sms';
import { getExtendedCharacters } from './helpers';
import { property } from 'lit/decorators';

export class CharCount extends RapidElement {
  static get styles() {
    return css`
      :host {
        overflow: auto;
      }

      :host::after {
        content: '';
        clear: both;
        display: table;
      }

      .counter {
        float: right;
        text-align: right;
        position: relative;
      }

      .extended {
        font-size: 14px;
        display: flex;
        margin-top: 4px;
      }

      .extended-char {
        border: 1px solid #e6e6e6;
        border-radius: var(--curvature-widget);
        padding: 4px;
        text-align: center;
        line-height: 20px;
        margin-right: 4px;
      }

      .summary {
        width: 180px;
        padding: 8px 12px;
        font-size: 12px;
        background: white;
        border-radius: var(--curvature-widget);
        overflow: hidden;
        opacity: 0.3;
        transform: scale(0.7);
        box-shadow: var(--shadow);
        transition: transform cubic-bezier(0.71, 0.18, 0.61, 1.33)
          var(--transition-speed);
        visibility: hidden;
        margin-top: 5px;
        right: 0px;
        text-align: left;
        position: absolute;
        z-index: 1000;
      }

      .fine-print {
        margin-top: 8px;
        margin-left: -12px;
        margin-right: -12px;
        margin-bottom: -8px;
        padding: 8px 12px;
        color: #999;
        background: #f5f5f5;
        font-size: 10px;
      }

      .extended-warning {
        margin-top: 8px;
      }

      .note {
        font-weight: 600;
        display: inline-block;
        margin-right: 2px;
      }

      .counts {
        cursor: pointer;
        transition: all cubic-bezier(0.71, 0.18, 0.61, 1.33) 200ms;
        transform: scale(0.9);
        display: inline-block;
        padding: 2px 6px;
        border-radius: var(--curvature);
        margin-top: 4px;
      }

      .segments {
        font-size: 85%;
        display: inline-block;
      }

      .attention .counts {
        transform: scale(0.95);
        background: var(--color-overlay-light);
        color: var(--color-overlay-light-text);
      }

      .attention .segments {
        font-weight: 600;
      }

      .counter:hover .summary {
        opacity: 1;
        transform: scale(1);
        visibility: visible;
      }
    `;
  }

  @property({ type: String })
  text: string;

  @property({ type: Number })
  count: number;

  @property({ type: Number, attribute: false })
  segments: number;

  @property({ type: Object, attribute: false })
  extended: string[] = [];

  public updated(changes: Map<string, any>) {
    super.updated(changes);
    if (changes.has('text')) {
      this.updateSegments();
    }
  }

  private updateSegments() {
    const sms = splitSMS(this.text);
    this.count = sms.length;
    this.segments = sms.parts.length;
    this.extended = getExtendedCharacters(this.text);
    this.count = this.text.length;
  }

  public render(): TemplateResult {
    const hasExpressions = this.text && this.text.indexOf('@') > -1;

    let segments = html`.`;
    if (this.segments > 1) {
      segments = html`and will use ${hasExpressions ? html`at least` : null}
        <b>${this.segments} messages</b> to send over SMS.`;
    } else {
      segments = html`and will use ${hasExpressions ? html`at least` : null} one
      message to send over SMS.`;
    }

    let extended = null;
    if (this.extended.length > 0 && (this.segments > 1 || hasExpressions)) {
      extended = this.extended.map(
        (ch: string) => html`<div class="extended-char">${ch}</div>`
      );
      extended = html`
        <div class="extended-warning">
          Some characters require more space over SMS. To save on fees, consider
          replacing them.
          <div class="extended">${extended}</div>
        </div>
      `;
    }

    const summary =
      this.count > 1
        ? html` <div class="summary">
            This message is <b>${this.count} characters</b>
            ${segments} ${extended}
            ${hasExpressions
              ? html`
                  <div class="fine-print">
                    <div class="note">NOTE</div>
                    Using variables may result in more messages when sending
                    over SMS than this estimate.
                  </div>
                `
              : null}
          </div>`
        : null;

    return html`<div class="counter${
      extended ? ' attention' : ''
    }"><div class="counts">${this.count}${
      this.segments > 1 || hasExpressions
        ? html`<div class="segments">
            &nbsp;/&nbsp;${this.segments}${hasExpressions ? html`+` : null}
            <div></div>
          </div>`
        : null
    }</div> ${summary}</div></div>`;
  }
}
