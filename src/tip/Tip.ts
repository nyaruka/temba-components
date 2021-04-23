import { css, property } from 'lit-element';
import { html, TemplateResult } from 'lit-html';
import { styleMap } from 'lit-html/directives/style-map';
import { RapidElement } from '../RapidElement';
import { getClasses } from '../utils';
import { getCenter, getMiddle } from './helpers';

export class Tip extends RapidElement {
  static get styles() {
    return css`
      .tip {
        position: fixed;
        transition: opacity 100ms ease-in-out 5ms;
        opacity: 0;

        background: #fff;
        padding: 4px 8px;
        pointer-events: none;

        border-radius: var(--curvature-widget);
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.2),
          0 1px 2px 0 rgba(0, 0, 0, 0.06);
      }
      .show {
        opacity: 1;
      }

      .slot {
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
  visible: boolean = false;

  @property({ type: String })
  position: string = 'auto';

  @property({ type: Number, attribute: false })
  top: number;

  @property({ type: Number, attribute: false })
  left: number;

  @property({ type: Number, attribute: false })
  width: number;

  @property({ type: Boolean, attribute: false })
  poppedTop: boolean;

  arrow: string;

  arrowTop: number;
  arrowLeft: number;
  arrowDirection: string;

  public firstUpdated() {}

  public updated(changed: Map<string, any>) {
    if (changed.has('visible') && this.visible) {
      this.calculatePosition();
    }
  }

  private calculatePosition() {
    if (this.visible) {
      const tipBounds = this.getDiv('.tip').getBoundingClientRect();
      const anchorBounds = this.getDiv('.slot').getBoundingClientRect();

      // TODO: pick a direction automatically
      let tipSide = this.position;
      if (tipSide === 'auto') {
        tipSide = 'left';
      }

      this.arrowLeft = 0;
      this.arrowTop = 0;

      if (tipSide === 'left') {
        this.left = anchorBounds.left - tipBounds.width - 12;
        this.top = getMiddle(anchorBounds, tipBounds);

        // position our arrow
        this.arrowTop = tipBounds.height / 2;
        this.arrowLeft = tipBounds.width - 1;
        this.arrow = '▶';
      } else if (tipSide === 'right') {
        this.left = anchorBounds.right + 12;
        this.top = getMiddle(anchorBounds, tipBounds);

        this.arrowTop = tipBounds.height / 2;
        this.arrowLeft = -8;
        this.arrow = '◀';
      } else if (tipSide === 'top') {
        this.top = anchorBounds.top - tipBounds.height - 12;
        this.left = getCenter(anchorBounds, tipBounds);

        this.arrowTop = tipBounds.height + 2;
        this.arrowLeft = tipBounds.width / 2 - 4;
        this.arrow = '▼';
      } else if (tipSide === 'bottom') {
        this.top = anchorBounds.bottom + 10;
        this.left = getCenter(anchorBounds, tipBounds);

        this.arrowTop = -2;
        this.arrowLeft = tipBounds.width / 2 - 3;
        this.arrow = '▲';
      }
    }
  }

  private handleMouseEnter() {
    this.visible = true;
  }

  private handleMouseLeave() {
    this.visible = false;
  }

  public render(): TemplateResult {
    const tipStyle: any = {
      top: this.top ? `${this.top}px` : '0px',
      left: this.left ? `${this.left}px` : '0px',
    };

    const arrowStyle: any = {
      top: this.arrowTop ? `${this.arrowTop}px` : '0px',
      left: this.arrowLeft ? `${this.arrowLeft}px` : '0px',
    };

    if (this.width) {
      tipStyle.width = `${this.width}px`;
    }

    const classes = getClasses({
      tip: true,
      show: this.visible,
      top: this.poppedTop,
    });

    return html`
      <div
        class="slot"
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
