import { css, html, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { Card } from './Card';

/**
 * Responsive layout for a main view with supporting panels. When wide, the
 * main slot fills the space and panels render as collapsible, drag-sortable
 * cards in a right-hand column. Below the breakpoint the same panels are
 * re-projected into a tab pane (main content first) — the slotted elements
 * never disconnect, so their state (sockets, fetched data) survives switches.
 *
 * Panels are declared as slotted temba-cards with an id; the main view goes
 * in slot="main".
 */
export class CardLayout extends RapidElement {
  static get styles() {
    return css`
      :host {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        min-height: 0;
      }

      /* in tab view there is no card column running to the edge — the
         layout itself keeps the content off the right edge */
      :host([narrow]) {
        padding-right: var(--layout-spacing, 8px);
      }

      /* One spacing unit everywhere: left of the main view (host padding,
         supplied by the page), above it, between it and the cards, and
         between the cards and the scrollbar. */
      .body {
        flex-grow: 1;
        min-height: 0;
        display: flex;
      }

      .main {
        /* the main view keeps a comfortable reading width — extra space
           goes to the card column, not the main view */
        flex: 0 1 var(--main-width, 650px);
        min-width: 0;
        display: flex;
        flex-direction: column;
        padding-top: var(--layout-spacing, 8px);
        padding-bottom: var(--layout-spacing, 8px);
      }

      slot[name='main']::slotted(*) {
        flex-grow: 1;
        min-width: 0;
        min-height: 0;
        display: flex;
        flex-direction: column;
        /* the layout owns spacing — strip any host margin the slotted
           main view carries for standalone use */
        margin: 0;
      }

      /* in tab view the main pane gets the same gap below the tab strip
         and above the bottom edge that the cards have */
      :host([narrow]) slot[name='main']::slotted(*) {
        margin-top: var(--layout-spacing, 8px);
        margin-bottom: var(--layout-spacing, 8px);
      }

      .column {
        /* the column soaks up whatever the main view doesn't take. Its
           scrollport runs the full height (the host supplies no vertical
           padding) so the scrollbar bleeds top to bottom, while the inner
           padding aligns the first card with the main view and doubles as
           room for card shadows. */
        flex: 1 0 var(--card-column-width, 360px);
        min-height: 0;
        overflow-y: auto;
        padding: var(--layout-spacing, 8px);
        padding-bottom: 0;
      }

      temba-tabs {
        margin-top: var(--layout-spacing, 8px);
      }

      temba-tabs {
        flex-grow: 1;
        min-height: 0;
      }
    `;
  }

  // explicit width below which the tab view is used — when unset (0), the
  // flip point is computed from what the layout actually needs: the card
  // column's footprint plus a comfortable minimum for the main view
  @property({ type: Number })
  breakpoint = 0;

  // minimum comfortable main-view width before flipping to tabs — lean
  // toward card mode: the main view may get snug before we give up on it
  @property({ type: Number, attribute: 'main-min-width' })
  mainMinWidth = 420;

  // column basis (360) plus its horizontal spacing (2 x 8px) — keep in
  // sync with the .column CSS defaults
  static COLUMN_FOOTPRINT = 376;

  private getFlipWidth(): number {
    return this.breakpoint > 0
      ? this.breakpoint
      : this.mainMinWidth + CardLayout.COLUMN_FOOTPRINT;
  }

  @property({ type: Array })
  order: string[] = [];

  @property({ type: String, attribute: 'main-name' })
  mainName = 'Chat';

  @property({ type: String, attribute: 'main-icon' })
  mainIcon = 'message';

  @property({ type: Boolean, reflect: true })
  narrow = false;

  // in tab view, drop tab labels (icons only, selected keeps its name)
  // once the pane is too tight to show them all
  @property({ type: Boolean })
  compactTabs = false;

  static COMPACT_TABS_WIDTH = 560;

  private resizer: ResizeObserver;

  public connectedCallback(): void {
    super.connectedCallback();
    this.resizer = new ResizeObserver(() => {
      // defer out of the observer callback — flipping modes re-renders and
      // resizes us, which would otherwise trip the browser's RO loop guard
      requestAnimationFrame(() => {
        const width = this.offsetWidth;
        if (width > 0) {
          this.narrow = width < this.getFlipWidth();
          this.compactTabs = width < CardLayout.COMPACT_TABS_WIDTH;
        }
      });
    });
    this.resizer.observe(this);
  }

  public disconnectedCallback(): void {
    this.resizer.disconnect();
    super.disconnectedCallback();
  }

  public getCards(): Card[] {
    return Array.from(
      this.querySelectorAll(':scope > temba-card[id]')
    ) as Card[];
  }

  public getIds(): string[] {
    return this.getCards().map((card) => card.id);
  }

  /**
   * Route each card to the right place for the current mode: the default
   * slot (forwarded into the card stack) when wide, or its own named slot
   * inside a chromeless tab when narrow.
   */
  private applyProjection() {
    this.getCards().forEach((card) => {
      if (this.narrow) {
        card.setAttribute('slot', `panel-${card.id}`);
        card.setAttribute('plain', '');
      } else {
        card.removeAttribute('slot');
        card.removeAttribute('plain');
      }
    });
  }

  private applyOrder() {
    if (!this.order || this.order.length === 0) {
      return;
    }

    const cards = this.getCards();
    const listed = this.order
      .map((id) => cards.find((card) => card.id === id))
      .filter(Boolean) as Card[];
    const unlisted = cards.filter((card) => !listed.includes(card));
    const desired = [...listed, ...unlisted];

    if (desired.every((card, idx) => card === cards[idx])) {
      return;
    }

    desired.forEach((card) => this.appendChild(card));
    this.requestUpdate();
  }

  private handleSlotChange() {
    this.applyProjection();
    this.applyOrder();
    // tab entries render from the slotted cards
    this.requestUpdate();
  }

  private handleOrderChanged(event: CustomEvent) {
    // keep our order prop in sync so a mode switch and back doesn't undo
    // a drag; the event continues up to the host
    this.order = event.detail.ids;
  }

  protected updated(changes: Map<PropertyKey, unknown>): void {
    super.updated(changes);
    if (changes.has('narrow')) {
      this.applyProjection();
    }
    if (changes.has('order')) {
      this.applyOrder();
    }
  }

  public render(): TemplateResult {
    if (this.narrow) {
      return html`
        <temba-tabs .focusedName=${this.compactTabs}>
          <temba-tab name=${this.mainName} icon=${this.mainIcon}>
            <slot name="main"></slot>
          </temba-tab>
          ${this.getCards().map(
            (card) => html`
              <temba-tab
                name=${card.label}
                icon=${card.icon}
                count=${card.count}
                ?activity=${card.activity}
              >
                <slot name="panel-${card.id}"></slot>
              </temba-tab>
            `
          )}
        </temba-tabs>
      `;
    }

    return html`
      <div class="body">
        <div class="main"><slot name="main"></slot></div>
        <div class="column">
          <temba-card-stack @temba-order-changed=${this.handleOrderChanged}>
            <slot @slotchange=${this.handleSlotChange}></slot>
          </temba-card-stack>
        </div>
      </div>
    `;
  }
}
