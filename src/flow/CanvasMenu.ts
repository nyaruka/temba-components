import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { CustomEventType } from '../interfaces';

/**
 * Event detail for canvas menu selection
 */
export interface CanvasMenuSelection {
  action: 'sticky' | 'action' | 'split';
  position: { x: number; y: number };
}

/**
 * CanvasMenu - A popup menu for adding items to the flow canvas
 * Displayed when double-clicking on empty canvas space
 */
export class CanvasMenu extends RapidElement {
  static get styles() {
    return css`
      :host {
        position: fixed;
        z-index: 10000;
        display: block;
        pointer-events: none;
      }

      .menu {
        position: fixed;
        background: white;
        border-radius: var(--curvature);
        box-shadow: var(--dropdown-shadow);
        padding: 0.5em 0;
        width: 265px;
        pointer-events: auto;
      }

      .menu-item {
        padding: 0.75em 1.5em;
        cursor: pointer;
        display: flex;
        align-items: flex-start;
        gap: 0.75em;
        transition: background-color 0.15s ease;
      }

      .menu-item:hover {
        background-color: rgba(0, 0, 0, 0.05);
      }

      .menu-item temba-icon {
        --icon-color: var(--color-text);
        margin-top: 0.15em;
      }

      .menu-item-content {
        display: flex;
        flex-direction: column;
        gap: 0.15em;
      }

      .menu-item-title {
        font-weight: 500;
        font-size: 1rem;
        color: var(--color-text-dark);
      }

      .menu-item-description {
        font-size: 0.85rem;
        color: var(--color-text);
      }

      .divider {
        height: 1px;
        background: rgba(0, 0, 0, 0.1);
        margin: 0.5em 0;
      }
    `;
  }

  @property({ type: Number })
  public x = 0;

  @property({ type: Number })
  public y = 0;

  @property({ type: Boolean })
  public open = false;

  @state()
  private clickPosition = { x: 0, y: 0 };

  protected firstUpdated(
    _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.firstUpdated(_changedProperties);

    // Close menu when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      if (this.open && !this.contains(e.target as Node)) {
        this.close();
      }
    };

    document.addEventListener('click', handleClickOutside);

    // Store cleanup function
    (this as any)._clickOutsideHandler = handleClickOutside;
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if ((this as any)._clickOutsideHandler) {
      document.removeEventListener('click', (this as any)._clickOutsideHandler);
    }
  }

  public show(x: number, y: number, clickPosition: { x: number; y: number }) {
    this.x = x;
    this.y = y;
    this.clickPosition = clickPosition;
    this.open = true;

    // Adjust position after menu renders to ensure it fits on screen
    requestAnimationFrame(() => {
      this.adjustPosition();
    });
  }

  private adjustPosition(): void {
    const menuElement = this.shadowRoot?.querySelector('.menu') as HTMLElement;
    if (!menuElement) return;

    const menuRect = menuElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 10; // margin from viewport edges

    let adjustedX = this.x;
    let adjustedY = this.y;

    // Check if menu goes off the right edge
    if (this.x + menuRect.width + margin > viewportWidth) {
      adjustedX = viewportWidth - menuRect.width - margin;
    }

    // Check if menu goes off the bottom edge
    if (this.y + menuRect.height + margin > viewportHeight) {
      adjustedY = viewportHeight - menuRect.height - margin;
    }

    // Update position if needed
    if (adjustedX !== this.x || adjustedY !== this.y) {
      this.x = adjustedX;
      this.y = adjustedY;
    }
  }

  public close() {
    this.open = false;
  }

  private handleMenuItemClick(action: 'sticky' | 'action' | 'split') {
    this.fireCustomEvent(CustomEventType.Selection, {
      action,
      position: this.clickPosition
    } as CanvasMenuSelection);
    this.close();
  }

  public render(): TemplateResult {
    if (!this.open) {
      return html``;
    }

    return html`
      <div class="menu" style="left: ${this.x}px; top: ${this.y}px;">
        <div
          class="menu-item"
          @click=${() => this.handleMenuItemClick('action')}
        >
          <temba-icon name="action" size="1.25"></temba-icon>
          <div class="menu-item-content">
            <div class="menu-item-title">Add Action</div>
            <div class="menu-item-description">
              Send messages, update contacts
            </div>
          </div>
        </div>

        <div
          class="menu-item"
          @click=${() => this.handleMenuItemClick('split')}
        >
          <temba-icon name="split" size="1.25"></temba-icon>
          <div class="menu-item-content">
            <div class="menu-item-title">Add Split</div>
            <div class="menu-item-description">Branch based on conditions</div>
          </div>
        </div>

        <div class="divider"></div>

        <div
          class="menu-item"
          @click=${() => this.handleMenuItemClick('sticky')}
        >
          <temba-icon name="note" size="1.25"></temba-icon>
          <div class="menu-item-content">
            <div class="menu-item-title">Add Sticky Note</div>
            <div class="menu-item-description">Add a note to the canvas</div>
          </div>
        </div>
      </div>
    `;
  }
}
