import { css, html, TemplateResult } from 'lit';
import { RapidElement } from '../RapidElement';
import { splitSMS } from './sms';
import { property } from 'lit/decorators.js';

export const MAX_GSM_SINGLE = 160;
export const MAX_GSM_MULTI = 153;
export const MAX_UNICODE_SINGLE = 70;
export const MAX_UNICODE_MULTI = 67;

export const COMPLETION_HELP = 'Tab to complete, enter to select';

export const GSM: { [key: string]: number } = {
  // char: charCode
  0: 48,
  1: 49,
  2: 50,
  3: 51,
  4: 52,
  5: 53,
  6: 54,
  7: 55,
  8: 56,
  9: 57,
  '\n': 10,
  '\f': 12,
  '\r': 13,
  ' ': 32,
  '!': 33,
  '"': 34,
  '#': 35,
  $: 36,
  '%': 37,
  '&': 38,
  "'": 39,
  '(': 40,
  ')': 41,
  '*': 42,
  '+': 43,
  ',': 44,
  '-': 45,
  '.': 46,
  '/': 47,
  ':': 58,
  ';': 59,
  '<': 60,
  '=': 61,
  '>': 62,
  '?': 63,
  '@': 64,
  A: 65,
  B: 66,
  C: 67,
  D: 68,
  E: 69,
  F: 70,
  G: 71,
  H: 72,
  I: 73,
  J: 74,
  K: 75,
  L: 76,
  M: 77,
  N: 78,
  O: 79,
  P: 80,
  Q: 81,
  R: 82,
  S: 83,
  T: 84,
  U: 85,
  V: 86,
  W: 87,
  X: 88,
  Y: 89,
  Z: 90,
  '[': 91,
  '\\': 92,
  ']': 93,
  '^': 94,
  _: 95,
  a: 97,
  b: 98,
  c: 99,
  d: 100,
  e: 101,
  f: 102,
  g: 103,
  h: 104,
  i: 105,
  j: 106,
  k: 107,
  l: 108,
  m: 109,
  n: 110,
  o: 111,
  p: 112,
  q: 113,
  r: 114,
  s: 115,
  t: 116,
  u: 117,
  v: 118,
  w: 119,
  x: 120,
  y: 121,
  z: 122,
  '{': 123,
  '|': 124,
  '}': 125,
  '~': 126,
  '¡': 161,
  '£': 163,
  '¤': 164,
  '¥': 165,
  '§': 167,
  '¿': 191,
  Ä: 196,
  Å: 197,
  Æ: 198,
  Ç: 199,
  É: 201,
  Ñ: 209,
  Ö: 214,
  Ø: 216,
  Ü: 220,
  ß: 223,
  à: 224,
  ä: 228,
  å: 229,
  æ: 230,
  è: 232,
  é: 233,
  ì: 236,
  ñ: 241,
  ò: 242,
  ö: 246,
  ø: 248,
  ù: 249,
  ü: 252,
  Γ: 915,
  Δ: 916,
  Θ: 920,
  Λ: 923,
  Ξ: 926,
  Π: 928,
  Σ: 931,
  Φ: 934,
  Ψ: 936,
  Ω: 937,
  '€': 8364
};

export const isGSM = (char: string): boolean => {
  // eslint-disable-next-line no-prototype-builtins
  return GSM.hasOwnProperty(char);
};

export const getExtendedCharacters = (text: string): string[] => {
  const extended: { [ch: string]: boolean } = {};
  for (const ch of text) {
    if (!isGSM(ch)) {
      extended[ch] = true;
    }
  }
  return Object.keys(extended);
};

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
        box-shadow: var(--dropdown-shadow);
        transition: transform cubic-bezier(0.71, 0.18, 0.61, 1.33)
          var(--transition-speed);
        visibility: hidden;
        text-align: left;
        position: fixed;
        margin-left: -190px;
        margin-top: 20px;
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
        margin-top: var(--temba-charcount-counts-margin-top);
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
