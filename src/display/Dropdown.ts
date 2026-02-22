import { css, html, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { getClasses } from '../utils';
import { CustomEventType } from '../interfaces';

import { styleMap } from 'lit-html/directives/style-map.js';

export class Dropdown extends RapidElement {
  static get styles() {
    return css`
      :host {
      }

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

      .dropdown:focus {
      }

      .dropdown.dormant {
        height: 0;
        overflow: hidden;
      }

      .dropdown {
        position: fixed;
        z-index: 2;
        padding: 0;
        opacity: 0;
        border-radius: calc(var(--curvature) * 1.5);
        background: #fff;
        transition: opacity calc(0.8 * var(--transition-speed)) var(--bounce),
          transform calc(0.8 * var(--transition-speed)) var(--bounce);
        user-select: none;
        margin-top: 0px;
        margin-left: 0px;
        transform: translateY(0) scale(1);
        box-shadow: var(--dropdown-shadow);
      }

      .dropdown:focus {
        outline: none;
      }

      .arrow {
        content: '';
        width: 0px;
        height: 0;
        z-index: 10;
        position: absolute;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-bottom: 6px solid white;
      }

      .open .dropdown {
        opacity: 1;
        transform: translateY(0.5em) scale(1);
      }

      .mask {
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        opacity: 0.5;
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
  dormant = true;

  @property({ type: Number })
  arrowSize = 8;

  @property({ type: Number })
  margin = 10;

  @property({ type: Boolean })
  mask = false;

  @property({ type: Object, attribute: false })
  dropdownStyle = {};

  @property({ type: Object, attribute: false })
  arrowStyle = {};

  constructor() {
    super();
    this.calculatePosition = this.calculatePosition.bind(this);
  }

  private activeFocus: any;
  private blurHandler: any;

  private resetBlurHandler() {
    const dropdown = this.shadowRoot.querySelector(
      '.dropdown'
    ) as HTMLDivElement;

    if (this.activeFocus) {
      this.activeFocus.removeEventListener('blur', this.blurHandler);
    }

    this.activeFocus = dropdown;
    this.blurHandler = this.handleBlur.bind(this);
    this.activeFocus.addEventListener('blur', this.blurHandler);
  }

  private handleBlur(event: FocusEvent) {
    const newTarget = event.relatedTarget as any;

    if (this.contains(newTarget)) {
      newTarget.addEventListener('blur', this.blurHandler);
      this.activeFocus = newTarget;
    } else {
      this.closeDropdown();
    }
  }

  private openDropdown() {
    this.open = true;
    this.dormant = false;
    this.resetBlurHandler();

    const dropdown = this.shadowRoot.querySelector(
      '.dropdown'
    ) as HTMLDivElement;
    dropdown.focus();
    dropdown.click();

    this.fireCustomEvent(CustomEventType.Opened);
  }

  private closeDropdown() {
    this.activeFocus.removeEventListener('blur', this.blurHandler);
    this.open = false;

    window.setTimeout(() => {
      this.dormant = true;
    }, 250);

    this.blur();
  }

  public updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    if (changedProperties.has('open')) {
      this.dropdownStyle = {};
    }

    if (changedProperties.has('dropdownStyle')) {
      if (Object.keys(this.dropdownStyle).length === 0) {
        this.calculatePosition();
      }
    }
  }

  public calculatePosition() {
    const dropdown = this.shadowRoot.querySelector(
      '.dropdown'
    ) as HTMLDivElement;
    const toggle = this.querySelector('*[slot="toggle"]');

    const arrow = this.shadowRoot.querySelector('.arrow') as HTMLDivElement;

    let bumpedUp = false;
    let bumpedLeft = false;

    if (dropdown && toggle) {
      const dropdownBounds = dropdown.getBoundingClientRect();
      const toggleBounds = toggle.getBoundingClientRect();
      const arrowBounds = arrow.getBoundingClientRect();

      if (!toggle) {
        return;
      }

      const dropdownStyle = {
        border: '1px solid rgba(0,0,0,0.1)',
        marginTop: '0.5em'
      };

      // if off the the right, bump it left
      if (dropdownBounds.right > window.innerWidth) {
        dropdownStyle['left'] =
          toggleBounds.right - dropdownBounds.width + 'px';
        delete dropdownStyle['right'];
        bumpedLeft = true;
      }

      // if off to the bottom, bump it up
      if (dropdownBounds.bottom > window.innerHeight) {
        dropdownStyle['top'] = toggleBounds.top - dropdownBounds.height + 'px';
        dropdownStyle['margin-top'] = '-0.5em';
        bumpedUp = true;
      }

      // if our arrow is aligned with the left of the dropdown, scootch
      // the dropdown left a pinch so our arrow still overlaps properly
      let arrowLeft = toggleBounds.width / 2 - arrowBounds.width / 2;
      if (arrowLeft <= 0) {
        dropdownStyle['marginLeft'] = '-10px';
        arrowLeft = 10;
      }

      const arrowStyle = {
        left: arrowLeft + 'px',
        borderWidth: this.arrowSize + 'px',
        top: '-' + this.arrowSize + 'px'
      };

      if (bumpedUp) {
        // rotate our arrow 180 degrees
        arrowStyle['transform'] = 'rotate(180deg)';

        // and place it at the bottom of the dropdown
        arrowStyle['top'] = 'auto';
        arrowStyle['bottom'] = '-' + this.arrowSize + 'px';
      }

      if (bumpedLeft) {
        arrowStyle['right'] =
          toggleBounds.width / 2 - arrowBounds.width / 2 + 'px';
        delete arrowStyle['left'];
      }

      this.arrowStyle = arrowStyle;
      this.dropdownStyle = dropdownStyle;
    }
    this.requestUpdate();
  }

  public handleToggleClicked(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.open && this.dormant) {
      this.openDropdown();
    }
  }

  public render(): TemplateResult {
    return html`
      ${this.mask
        ? html`<div class="mask  ${this.open ? 'open' : ''}" />`
        : null}

      <div
        class="wrapper ${getClasses({
          open: this.open
        })}"
      >
        <slot
          name="toggle"
          class="toggle"
          @click=${this.handleToggleClicked}
        ></slot>
        <div
          class="${getClasses({
            dropdown: true,
            dormant: this.dormant
          })}"
          style=${styleMap(this.dropdownStyle)}
          tabindex="0"
        >
          <div class="arrow" style=${styleMap(this.arrowStyle)}></div>
          <div class="dropdown-wrapper">
            <slot name="dropdown" tabindex="1"></slot>
          </div>
        </div>
      </div>
    `;
  }
}
