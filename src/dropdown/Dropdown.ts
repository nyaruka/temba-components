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
        transform: translateY(-1em);
        transition: all calc(0.4 * var(--transition-speed)) linear;
        user-select: none;
        margin-top: 0px;
        margin-left: 0px;
        box-shadow: rgb(0 0 0 / 20%) 0px 0px 40px, rgb(0 0 0 / 20%) 0px 0px 12px;
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
  arrowOffset = 12;

  @property({ type: Number })
  dropdownOffset = -10;

  public firstUpdated(props: any) {
    super.firstUpdated(props);

    const dropdown = this.shadowRoot.querySelector(
      '.dropdown'
    ) as HTMLDivElement;
    const arrow = this.shadowRoot.querySelector('.arrow') as HTMLDivElement;

    if (this.arrowOffset < 0) {
      arrow.style.right = Math.abs(this.arrowOffset) + 'px';
    } else {
      arrow.style.left = this.arrowOffset + 'px';
    }

    if (dropdown.offsetLeft + dropdown.clientWidth > window.outerWidth) {
      dropdown.style.marginLeft =
        '-' +
        (dropdown.clientWidth - this.clientWidth + this.dropdownOffset) +
        'px';
    } else {
      dropdown.style.marginLeft = this.dropdownOffset + 'px';
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
