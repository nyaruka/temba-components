import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { RapidElement } from '../RapidElement';
import { property } from 'lit/decorators.js';

export class ProgressBar extends RapidElement {
  static styles = css`
    .meter {
      display: flex;
      box-sizing: content-box;
      height: 8px;
      position: relative;
      background: #f1f1f1;
      border-radius: var(--curvature);
      padding: 4px;
      box-shadow: inset 1px 1px 1px rgba(0, 0, 0, 0.05);
    }
    .meter > span {
      display: block;
      height: 100%;
      border-top-right-radius: var(--curvature);
      border-bottom-right-radius: var(--curvature);
      border-top-left-radius: var(--curvature);
      border-bottom-left-radius: var(--curvature);
      background-color: var(--color-primary-dark);
      background-image: linear-gradient(
        center bottom,
        rgb(43, 194, 83) 37%,
        rgb(84, 240, 83) 69%
      );

      position: relative;
      overflow: hidden;
    }
    .meter > span:after,
    .animate > span > span {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      background-image: linear-gradient(
        -45deg,
        rgba(255, 255, 255, 0.2) 25%,
        transparent 25%,
        transparent 50%,
        rgba(255, 255, 255, 0.2) 50%,
        rgba(255, 255, 255, 0.2) 75%,
        transparent 75%,
        transparent
      );
      z-index: 1;
      background-size: 50px 50px;
      animation: move 16s linear infinite;
      border-top-right-radius: var(--curvature);
      border-bottom-right-radius: var(--curvature);
      border-top-left-radius: var(--curvature);
      border-bottom-left-radius: var(--curvature);
      overflow: hidden;
    }

    .animate > span:after {
      display: none;
    }

    @keyframes move {
      0% {
        background-position: 0 0;
      }
      100% {
        background-position: 50px 50px;
      }
    }

    .complete {
      transition: width 2s;
    }

    .incomplete {
      flex-grow: 1;
    }

    .etc {
      font-size: 0.7em;
      padding: 4px;
      padding-top: 1px;
      padding-left: 8px;
      padding-right: 8px;
      margin-top: -4px;
      margin-bottom: -4px;
      margin-right: -4px;
      margin-left: 0.5em;
      background: rgba(0, 0, 0, 0.07);
      font-weight: bold;
      white-space: nowrap;
    }

    .meter.done > span:after,
    .done .animate > span > span {
      display: none;
    }

    .meter.done > span {
      background: rgb(var(--success-rgb));
    }
  `;

  @property({ type: Number })
  total = 100;

  @property({ type: Number })
  current = 0;

  @property({ type: Number })
  pct = 0;

  @property({ type: Boolean })
  done = false;

  @property({ type: String })
  eta: string;

  @property({ type: String, attribute: false })
  estimatedCompletionDate: Date;

  @property({ type: Boolean })
  showEstimatedCompletion = false;

  public updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    if (changes.has('eta') && this.eta) {
      this.estimatedCompletionDate = new Date(this.eta);
      this.showEstimatedCompletion = this.estimatedCompletionDate > new Date();
    }

    if (changes.has('current')) {
      this.pct = Math.floor(Math.min((this.current / this.total) * 100, 100));
      this.done = this.pct >= 100;
    }
  }

  public render(): TemplateResult {
    return html`<div class="meter ${this.done ? 'done' : ''}">
      <span class="complete" style="width: ${this.pct}%"></span>
      <div class="incomplete"></div>
      ${this.pct >= 0 || this.estimatedCompletionDate
        ? html` <div class="etc">
            ${this.estimatedCompletionDate
              ? html`<temba-date
                  value="${this.estimatedCompletionDate.toISOString()}"
                  display="countdown"
                ></temba-date>`
              : html`${this.pct}%`}
          </div>`
        : null}
    </div>`;
  }
}
