import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { RapidElement } from '../RapidElement';
import { property } from 'lit/decorators.js';

export class ProgressBar extends RapidElement {
  static styles = css`
    .wrapper {
      display: flex;
      box-sizing: content-box;
      background: #f1f1f1;
      border-radius: var(--curvature);
      box-shadow: inset 1px 1px 1px rgba(0, 0, 0, 0.05);
      overflow: hidden;
      min-height: 1.5rem;
    }

    .message {
      padding: 0 0.5rem;
      color: rgba(0, 0, 0, 0.4);
      white-space: nowrap;
    }

    .meter {
      flex-grow: 1;
      display: flex;
      box-sizing: content-box;
      position: relative;
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
      padding: 4px;
      min-height: 6px;
    }
    .meter > span {
      display: block;
      height: 100%;
      border-radius: calc(var(--curvature) * 0.8);
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
      animation: move 8s linear infinite;
      border-top-right-radius: var(--curvature);
      border-bottom-right-radius: var(--curvature);
      border-top-left-radius: var(--curvature);
      border-bottom-left-radius: var(--curvature);
      overflow: hidden;
    }

    .animate > span:after {
      display: none;
    }

    .meter.static > span:after {
      display: none;
      animation: none;
    }

    .meter.static > span {
      background-image: none;
    }

    @keyframes move {
      0% {
        background-position: 0 0;
      }
      100% {
        background-position: 50px 50px;
      }
    }

    .meter .complete {
      transition: flex-basis 2s;
    }

    .meter .incomplete {
      flex-grow: 1;
    }

    .etc {
      display: flex;
      flex-direction: row;
      background: rgba(0, 0, 0, 0.07);
      font-weight: bold;
      white-space: nowrap;
      color: rgba(0, 0, 0, 0.5);
      align-self: center;
      padding: 0px 6px;
      align-self: stretch;
      align-items: center;
    }

    .etc > div {
      font-size: 0.7em;
    }

    .wrapper *::last-child {
      border-top-right-radius: var(--curvature);
      border-bottom-right-radius: var(--curvature);
      overflow: hidden;
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

  @property({ type: Boolean })
  showPercentage = false;

  @property({ type: String })
  message: string;

  @property({ type: Boolean })
  animated = true;

  public updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    if (changes.has('eta') && this.eta) {
      this.estimatedCompletionDate = new Date(this.eta);
      this.showEstimatedCompletion = this.estimatedCompletionDate > new Date();
    }

    if (changes.has('current')) {
      const pct = Math.floor(Math.min((this.current / this.total) * 100, 100));
      if (Number.isNaN(pct)) {
        this.showPercentage = false;
      } else {
        this.pct = pct;
        this.showPercentage = true;
      }

      this.done = this.pct >= 100;
    }
  }

  public render(): TemplateResult {
    const meterClasses = [
      'meter',
      this.done ? 'done' : '',
      this.animated ? '' : 'static'
    ]
      .filter(Boolean)
      .join(' ');

    return html`<div class="wrapper ${this.done ? 'complete' : ''}">
      <div class="${meterClasses}">
        ${this.message
          ? html`<div class="message">${this.message}</div>`
          : null}
        <span class="complete" style="flex-basis: ${this.pct}%"></span>
        <div class="incomplete"></div>
      </div>

      ${this.showPercentage || this.showEstimatedCompletion
        ? html`<div class="etc">
            <div>
              ${this.estimatedCompletionDate &&
              this.showEstimatedCompletion &&
              !this.done
                ? html`<temba-date
                    value="${this.estimatedCompletionDate.toISOString()}"
                    display="countdown"
                  ></temba-date>`
                : html`${this.pct}%`}
            </div>
          </div>`
        : null}

      <slot></slot>
    </div>`;
  }
}
