import { css, html, TemplateResult } from 'lit';
import { property } from 'lit/decorators';
import { RapidElement } from '../RapidElement';

export class Dropdown extends RapidElement {
  static get styles() {
    return css`
      .toggle {
        cursor: pointer;
      }

      .dropdown {
        position: absolute;
        opacity: 0;
        z-index: 10;
        pointer-events: none;
        padding: 0;
        border-radius: var(--curvature);
        background: #fff;
        transform: translateY(2em);
        transition: all calc(0.6 * var(--transition-speed)) linear;
        user-select: none;
        margin-top: 0px;
        margin-left: 0px;
        box-shadow: var(--dropdown-shadow);
      }

      .dropdown:focus {
        outline: none;
      }

      .arrow {
        content: '';
        width: 0px;
        height: 0;
        top: -6px;
        z-index: 10;
        position: absolute;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-bottom: 6px solid white;
      }

      .open .dropdown {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0);
      }
    `;
  }

  @property({ type: Boolean })
  open = false;

  @property({ type: Number })
  arrowSize = 6;

  @property({ type: Number })
  arrowOffset = this.arrowSize * 2;

  @property({ type: Number })
  offsetX = -10;

  @property({ type: Number })
  offsetY = 0;

  public firstUpdated(props: any) {
    super.firstUpdated(props);

    const dropdown = this.shadowRoot.querySelector(
      '.dropdown'
    ) as HTMLDivElement;
    const arrow = this.shadowRoot.querySelector('.arrow') as HTMLDivElement;

    arrow.style.borderWidth = this.arrowSize + 'px';
    arrow.style.top = '-' + this.arrowSize + 'px';

    if (this.arrowOffset < 0) {
      arrow.style.right = Math.abs(this.arrowOffset) + 'px';
    } else {
      arrow.style.left = this.arrowOffset + 'px';
    }

    dropdown.style.marginTop = this.offsetY + 'px';

    if (dropdown.offsetLeft + dropdown.clientWidth > window.outerWidth) {
      dropdown.style.marginLeft =
        '-' + (dropdown.clientWidth - this.clientWidth - this.offsetX) + 'px';
    } else {
      dropdown.style.marginLeft = this.offsetX + 'px';
    }

    dropdown.addEventListener('blur', () => {
      // we nest this to deal with clicking the toggle to close
      // as we don't want it to toggle an immediate open, probably
      // a better way to deal with this
      window.setTimeout(() => {
        this.open = false;
      }, 200);
    });
  }

  public updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);
    if (changedProperties.has('open')) {
      if (this.open) {
        this.classList.add('open');
      } else {
        this.classList.remove('open');
      }
    }
  }

  public handleOpen(): void {
    if (!this.open) {
      this.open = true;

      const dropdown = this.shadowRoot.querySelector(
        '.dropdown'
      ) as HTMLDivElement;
      dropdown.focus();
    }
  }

  public render(): TemplateResult {
    return html`
      <div class=${this.open ? 'open' : ''}>
        <slot name="toggle" class="toggle" @click="${this.handleOpen}"></slot>
        <div class="dropdown" tabindex="0">
          <div class="arrow"></div>
          <slot name="dropdown"></slot>
        </div>
      </div>
    `;
  }
}
