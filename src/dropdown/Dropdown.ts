import { css, html, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { getClasses } from '../utils';

export class Dropdown extends RapidElement {
  static get styles() {
    return css`
      .wrapper {
        position: relative;
      }

      .toggle {
        cursor: pointer;
      }

      .dropdown-wrapper {
        position: relative;
        overflow: auto;
      }

      .dropdown {
        position: absolute;
        opacity: 0;
        z-index: 2;
        pointer-events: none;
        padding: 0;
        border-radius: var(--curvature);
        background: #fff;
        transform: translateY(1em) scale(0.9);
        transition: all calc(0.8 * var(--transition-speed)) var(--bounce);
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
        transform: translateY(0.5em) scale(1);
      }

      .mask {
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        opacity: 0;
        transition: opacity var(--transition-speed) ease-in-out;
        pointer-events: none;
        z-index: 1;
      }

      .mask.open {
        opacity: 1;
        pointer-events: auto;
      }

      .right {
        right: 0;
      }
    `;
  }

  @property({ type: Boolean })
  open = false;

  @property({ type: Boolean })
  top = false;

  @property({ type: Boolean })
  bottom = false;

  @property({ type: Boolean })
  left = false;

  @property({ type: Boolean })
  right = false;

  @property({ type: Number })
  arrowSize = 6;

  @property({ type: Number })
  arrowOffset = this.arrowSize * 2;

  @property({ type: Number })
  offsetX = 0;

  @property({ type: Number })
  offsetY = 0;

  @property({ type: Boolean })
  mask = false;

  constructor() {
    super();
    this.ensureOnScreen = this.ensureOnScreen.bind(this);
  }

  public firstUpdated(props: any) {
    super.firstUpdated(props);

    const arrow = this.shadowRoot.querySelector('.arrow') as HTMLDivElement;
    arrow.style.borderWidth = this.arrowSize + 'px';
    arrow.style.top = '-' + this.arrowSize + 'px';

    if (this.arrowOffset < 0) {
      arrow.style.right = Math.abs(this.arrowOffset) + 'px';
    } else {
      arrow.style.left = this.arrowOffset + 'px';
    }

    const dropdown = this.shadowRoot.querySelector(
      '.dropdown'
    ) as HTMLDivElement;

    dropdown.addEventListener('blur', () => {
      // we nest this to deal with clicking the toggle to close
      // as we don't want it to toggle an immediate open, probably
      // a better way to deal with this
      window.setTimeout(() => {
        this.open = false;
        // blur our host element too
        (this.shadowRoot.host as HTMLDivElement).blur();
      }, 200);
    });
  }

  public updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);
    const dropdown = this.shadowRoot.querySelector(
      '.dropdown'
    ) as HTMLDivElement;

    if (changedProperties.has('offsetY') || changedProperties.has('offsetX')) {
      dropdown.style.marginTop = this.offsetY + 'px';
      if (dropdown.offsetLeft + dropdown.clientWidth > window.outerWidth) {
        dropdown.style.marginLeft =
          '-' + (dropdown.clientWidth - this.clientWidth - this.offsetX) + 'px';
      } else {
        if (this.right) {
          dropdown.style.marginRight = this.offsetX + 'px';
        } else {
          dropdown.style.marginLeft = this.offsetX + 'px';
        }
      }
    }

    if (changedProperties.has('open')) {
      // check right away if we are on the screen, and then again moments after render
      window.setTimeout(this.ensureOnScreen, 0);
      window.setTimeout(this.ensureOnScreen, 100);
    }
  }

  public ensureOnScreen() {
    const dropdown = this.shadowRoot.querySelector(
      '.dropdown'
    ) as HTMLDivElement;

    if (dropdown) {
      // dropdown will go off the screen, let's push it up
      const toggle = this.querySelector('div[slot="toggle"]');

      if (!toggle) {
        return;
      }

      if (dropdown.getBoundingClientRect().bottom > window.innerHeight - 100) {
        if (this.bottom) {
          dropdown.style.top = toggle.clientHeight + 'px';
        } else {
          dropdown.style.top = '';
          dropdown.style.bottom = toggle.clientHeight + 'px';
        }
      } else if (dropdown.getBoundingClientRect().top < 0) {
        if (this.bottom) {
          dropdown.style.top = toggle.clientHeight + 'px';
        } else {
          dropdown.style.top = toggle.clientHeight + 'px';
          dropdown.style.bottom = '';
        }
      }

      if (dropdown.getBoundingClientRect().right > window.innerWidth) {
        dropdown.style.left = '';
        dropdown.style.right = '0px';
      } else if (dropdown.getBoundingClientRect().left < 0) {
        dropdown.style.left = 0 + 'px';
        dropdown.style.right = '';
      }
    }
  }

  public handleToggleClicked(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.open) {
      this.open = true;

      const dropdown = this.shadowRoot.querySelector(
        '.dropdown'
      ) as HTMLDivElement;
      dropdown.focus();
    }
  }

  private handleDropdownMouseDown(event: MouseEvent): void {
    // block mouse down when clicking inside dropdown so we don't lose focus yet
    event.preventDefault();
    event.stopPropagation();
  }

  public render(): TemplateResult {
    return html`
      ${this.mask
        ? html`<div class="mask  ${this.open ? 'open' : ''}" />`
        : null}

      <div class="wrapper ${this.open ? 'open' : ''}">
        <slot
          name="toggle"
          class="toggle"
          @click=${this.handleToggleClicked}
        ></slot>
        <div
          class="${getClasses({
            dropdown: true,
            right: this.right,
            left: this.left,
            top: this.top,
            bottom: this.bottom
          })}"
          tabindex="0"
          @mousedown=${this.handleDropdownMouseDown}
        >
          <div class="arrow"></div>
          <div class="dropdown-wrapper">
            <slot name="dropdown" tabindex="1"></slot>
          </div>
        </div>
      </div>
    `;
  }
}
