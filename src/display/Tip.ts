import { css, html, PropertyValues, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { styleMap } from 'lit-html/directives/style-map.js';
import { RapidElement } from '../RapidElement';
import { getClasses, getMiddle, getCenter } from '../utils';

export class Tip extends RapidElement {
  static get styles() {
    return css`
      .tip {
        transition: opacity 120ms cubic-bezier(0.2, 0, 0, 1);
        margin: 0px;
        position: fixed;
        opacity: 0;
        background: #fff;
        padding: 4px 8px;
        pointer-events: none;
        border-radius: var(--curvature-widget);
        box-shadow:
          0 1px 10px 10px rgba(0, 0, 0, 0.035),
          0 1px 3px 0px rgba(0, 0, 0, 0.1),
          0 1px 2px 0 rgba(0, 0, 0, 0.06);
        font-size: 14px;
        z-index: 2147483647;
        color: #333;
      }

      .tip.hide-on-change {
        transition: none;
      }

      .show {
        opacity: 1;
      }

      .slot {
        display: flex;
        flex-direction: column;
      }

      .arrow {
        position: absolute;
        color: #fff;
        font-size: 10px;
        line-height: 0px;
      }

      .◀ {
        text-shadow: -1px 2px 2px rgba(0, 0, 0, 0.1);
      }

      .▶ {
        text-shadow: 1px 2px 2px rgba(0, 0, 0, 0.1);
      }

      .▼ {
        text-shadow: 0px 3px 3px rgba(0, 0, 0, 0.1);
      }

      .▲ {
        text-shadow: 0px -1px 1px rgba(0, 0, 0, 0.1);
      }
    `;
  }

  @property({ type: String })
  text: string;

  @property({ type: Boolean })
  visible = false;

  @property({ type: String })
  position = 'auto';

  @property({ type: Boolean })
  hideOnChange: boolean;

  top: number;
  left: number;

  @property({ type: Number, attribute: false })
  width: number;

  @property({ type: Boolean, attribute: false })
  poppedTop: boolean;

  @property({ type: Number })
  delay = 120;

  @property({ type: Number })
  hideDelay = 40;

  arrow: string;
  arrowTop: number;
  arrowLeft: number;
  arrowDirection: string;

  showTimer = 0;
  hideTimer = 0;

  public willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (changed.has('text') && this.hideOnChange) {
      this.visible = false;
    }
  }

  public updated(changed: Map<string, any>) {
    if ((changed.has('visible') || changed.has('text')) && this.visible) {
      this.calculatePosition();
    }
  }

  private calculatePosition() {
    if (this.visible) {
      const tipEl = this.getDiv('.tip') as HTMLElement;
      const arrowEl = this.getDiv('.arrow') as HTMLElement;
      const tipBounds = tipEl.getBoundingClientRect();
      const anchorBounds = this.getDiv('.slot').getBoundingClientRect();

      const viewportPadding = 8;
      const side = this.chooseSide(
        this.position,
        anchorBounds,
        tipBounds,
        viewportPadding
      );

      this.arrowLeft = 0;
      this.arrowTop = 0;

      if (side === 'left') {
        this.left = anchorBounds.left - tipBounds.width - 10;
        this.top = getMiddle(anchorBounds, tipBounds);

        // position our arrow
        this.arrowTop = tipBounds.height / 2;
        this.arrowLeft = tipBounds.width + 2;
        this.arrow = '▶';
      } else if (side === 'right') {
        this.left = anchorBounds.right + 12;
        this.top = getMiddle(anchorBounds, tipBounds);

        this.arrowTop = tipBounds.height / 2;
        this.arrowLeft = -8;
        this.arrow = '◀';
      } else if (side === 'top') {
        this.top = anchorBounds.top - tipBounds.height - 12;
        this.left = getCenter(anchorBounds, tipBounds);

        this.arrowTop = tipBounds.height + 2;
        this.arrowLeft = tipBounds.width / 2 - 4;
        this.arrow = '▼';
      } else if (side === 'bottom') {
        this.top = anchorBounds.bottom + 10;
        this.left = getCenter(anchorBounds, tipBounds);

        this.arrowTop = -2;
        this.arrowLeft = tipBounds.width / 2 - 3;
        this.arrow = '▲';
      }

      const minLeft = viewportPadding;
      const maxLeft = window.innerWidth - tipBounds.width - viewportPadding;
      const minTop = viewportPadding;
      const maxTop = window.innerHeight - tipBounds.height - viewportPadding;

      const unclampedLeft = this.left;
      const unclampedTop = this.top;
      this.left = this.clamp(this.left, minLeft, maxLeft);
      this.top = this.clamp(this.top, minTop, maxTop);

      const leftDelta = this.left - unclampedLeft;
      const topDelta = this.top - unclampedTop;

      if (side === 'top' || side === 'bottom') {
        this.arrowLeft -= leftDelta;
        this.arrowLeft = this.clamp(this.arrowLeft, 8, tipBounds.width - 14);
      } else {
        this.arrowTop -= topDelta;
        this.arrowTop = this.clamp(this.arrowTop, 8, tipBounds.height - 8);
      }

      // round to avoid sub-pixel rendering differences
      this.top = Math.round(this.top);
      this.left = Math.round(this.left);
      this.arrowTop = Math.round(this.arrowTop);
      this.arrowLeft = Math.round(this.arrowLeft);

      // directly update DOM to avoid scheduling another update
      tipEl.style.top = `${this.top}px`;
      tipEl.style.left = `${this.left}px`;
      arrowEl.style.top = `${this.arrowTop}px`;
      arrowEl.style.left = `${this.arrowLeft}px`;
      arrowEl.textContent = this.arrow;
      arrowEl.className = `arrow ${this.arrow}`;
    }
  }

  private clamp(value: number, min: number, max: number): number {
    if (max < min) {
      return min;
    }
    return Math.min(Math.max(value, min), max);
  }

  private chooseSide(
    preferred: string,
    anchorBounds: DOMRect,
    tipBounds: DOMRect,
    viewportPadding: number
  ): string {
    const gap = 12;
    const spaces = {
      left: anchorBounds.left - viewportPadding,
      right: window.innerWidth - anchorBounds.right - viewportPadding,
      top: anchorBounds.top - viewportPadding,
      bottom: window.innerHeight - anchorBounds.bottom - viewportPadding
    };

    const required = {
      left: tipBounds.width + gap,
      right: tipBounds.width + gap,
      top: tipBounds.height + gap,
      bottom: tipBounds.height + gap
    };

    const fits = (side: string) => spaces[side] >= required[side];
    const opposite: Record<string, string> = {
      left: 'right',
      right: 'left',
      top: 'bottom',
      bottom: 'top'
    };

    if (preferred !== 'auto') {
      if (fits(preferred)) {
        return preferred;
      }
      const fallback = opposite[preferred];
      if (fallback && fits(fallback)) {
        return fallback;
      }
      return preferred;
    }

    const order = ['bottom', 'right', 'left', 'top'];
    let bestSide = order[0];
    let bestSpace = -1;

    for (const side of order) {
      if (fits(side)) {
        return side;
      }
      if (spaces[side] > bestSpace) {
        bestSpace = spaces[side];
        bestSide = side;
      }
    }

    return bestSide;
  }

  private handleMouseEnter() {
    window.clearTimeout(this.hideTimer);
    window.clearTimeout(this.showTimer);
    this.showTimer = window.setTimeout(() => {
      this.visible = true;
    }, this.delay);
  }

  private handleMouseLeave() {
    window.clearTimeout(this.showTimer);
    window.clearTimeout(this.hideTimer);
    if (this.hideDelay > 0) {
      this.hideTimer = window.setTimeout(() => {
        this.visible = false;
      }, this.hideDelay);
      return;
    }
    this.visible = false;
  }

  public render(): TemplateResult {
    const tipStyle: any = {
      top: this.top ? `${this.top}px` : '0px',
      left: this.left ? `${this.left}px` : '0px'
    };

    const arrowStyle: any = {
      top: this.arrowTop ? `${this.arrowTop}px` : '0px',
      left: this.arrowLeft ? `${this.arrowLeft}px` : '0px'
    };

    if (this.width) {
      tipStyle.width = `${this.width}px`;
    }

    const classes = getClasses({
      tip: true,
      show: this.visible,
      top: this.poppedTop,
      'hide-on-change': this.hideOnChange
    });

    return html`
      <div
        class="slot"
        @click=${this.handleMouseLeave}
        @mouseenter=${this.handleMouseEnter}
        @mouseleave=${this.handleMouseLeave}
      >
        <slot></slot>
      </div>
      <div class="${classes}" style=${styleMap(tipStyle)}>
        ${this.text}
        <div class="arrow ${this.arrow}" style=${styleMap(arrowStyle)}>
          ${this.arrow}
        </div>
      </div>
    `;
  }
}
