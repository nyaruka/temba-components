import { css, html, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { CustomEventType } from '../interfaces';
import { getClasses, postJSON } from '../utils';
import { Card } from './Card';

/** Saved card layout state — order and collapsed lists may reference cards
 * beyond the ones the current page renders. */
export interface CardSettings {
  order?: string[];
  collapsed?: string[];
  width?: number;
}

/**
 * Responsive layout for a main view with supporting panels. When wide, the
 * main slot fills the space and panels render as collapsible, drag-sortable
 * cards in a right-hand column. Below the breakpoint the same panels are
 * re-projected into a tab pane (main content first) — the slotted elements
 * never disconnect, so their state (sockets, fetched data) survives switches.
 *
 * Panels are declared as slotted temba-cards with an id; the main view goes
 * in slot="main".
 *
 * The layout can persist card order and collapsed state itself: seed it
 * with `settings` and point `settings-endpoint` at a POST endpoint that
 * merges top-level keys (rapidpro's user settings view). Saves are
 * debounced and posted as `{[settingsKey]: {order, collapsed}}`. The saved
 * lists are the union across pages — a page rendering only a subset of the
 * cards merges its relative order into the full saved order rather than
 * clobbering the position of cards it doesn't show.
 */
export class CardLayout extends RapidElement {
  static get styles() {
    return css`
      :host {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        min-height: 0;
        /* anchors the tab-view resize handle on the right inset */
        position: relative;
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
        /* anchors the card-view resize handle in the gap to our right */
        position: relative;
      }

      /* drag handle for resizing the main view — in card view it rides the
         gap between the main view and the card column, in tab view (.edge)
         it rides the layout's right inset */
      .resize-handle {
        position: absolute;
        top: 0;
        bottom: 0;
        right: calc(var(--layout-spacing, 8px) * -1 - 1px);
        width: calc(var(--layout-spacing, 8px) + 2px);
        cursor: col-resize;
        z-index: 1;
        display: flex;
        justify-content: center;
      }

      .resize-handle.edge {
        right: 0;
      }

      .resize-handle .grip {
        width: 3px;
        border-radius: 2px;
        background: transparent;
      }

      .resize-handle:hover .grip,
      .resize-handle.active .grip {
        background: rgba(0, 0, 0, 0.08);
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
           padding aligns the cards with the main view — including below,
           so the last card scrolls to rest level with the bottom of the
           main view — and doubles as room for card shadows. */
        flex: 1 0 var(--card-column-width, 360px);
        min-height: 0;
        /* without min-width:0 the column's automatic minimum is its
           content's intrinsic width, so one long unbreakable line in
           a card (e.g. a flow pill's name) widens the whole column
           instead of ellipsizing — the flex basis still keeps it
           from shrinking below the configured column width */
        min-width: 0;
        overflow-y: auto;
        padding: var(--layout-spacing, 8px);
      }

      temba-tabs {
        margin-top: var(--layout-spacing, 8px);
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

  // user-chosen main-view width in px (0 = automatic). Dragging the resize
  // handle sets it, and it participates in the flip: the cards always keep
  // their footprint, so a wider chat flips to tabs sooner
  @property({ type: Number, attribute: false })
  mainWidth = 0;

  // a drag on the resize handle is in progress
  @property({ type: Boolean })
  resizing = false;

  // last observed layout width — the tab view uses it to decide whether a
  // resize could reach card mode at all before offering the handle
  @property({ type: Number, attribute: false })
  hostWidth = 0;

  /** The narrowest layout that can show card mode at any main-view width. */
  private getMinFlipWidth(): number {
    return this.breakpoint > 0
      ? this.breakpoint
      : this.mainMinWidth + CardLayout.COLUMN_FOOTPRINT;
  }

  private getFlipWidth(): number {
    const min = this.getMinFlipWidth();
    // a user-sized main view raises the bar — the cards keep their
    // footprint rather than being squeezed beside it
    return this.mainWidth > 0
      ? Math.max(min, this.mainWidth + CardLayout.COLUMN_FOOTPRINT)
      : min;
  }

  @property({ type: Array })
  order: string[] = [];

  // saved order + collapsed state to seed from (JSON attribute)
  @property({ type: Object })
  settings: CardSettings = null;

  // where to POST settings changes; persistence is off when unset
  @property({ type: String, attribute: 'settings-endpoint' })
  settingsEndpoint = '';

  // top-level key the settings are posted (and saved) under
  @property({ type: String, attribute: 'settings-key' })
  settingsKey = 'contact_cards';

  // debounce window for settings saves (ms) — tests shrink it
  saveDelay = 500;

  // the full saved lists — unlike `order`, these keep ids for cards other
  // pages show, so a save from this page can't clobber their state
  private savedOrder: string[] = [];
  private savedCollapsed: string[] = [];

  // cards whose collapsed state has been seeded from settings — seed once
  // so a later mutation can't undo the user's toggles
  private seeded = new Set<string>();

  private saveTimeout: ReturnType<typeof setTimeout> = null;

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
  private mutations: MutationObserver;

  private handleDetailsChanged = () => {
    // tab entries render card metadata (count/activity) by value — refresh
    // them when a projected panel reports new details
    if (this.narrow) {
      this.requestUpdate();
    }
  };

  private handleToggle = (event: Event) => {
    // only collapse toggles from our own cards should trigger a save
    if ((event.target as Element).parentElement === this) {
      this.scheduleSave();
    }
  };

  public connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener(
      CustomEventType.DetailsChanged,
      this.handleDetailsChanged
    );
    this.addEventListener('toggle', this.handleToggle);

    // the wide render reprojects via its slotchange, but the narrow render
    // has no default slot — watch for cards added/removed in either mode
    this.mutations = new MutationObserver(() => {
      this.applyProjection();
      this.applyOrder();
      this.applyCollapsed();
      this.requestUpdate();
    });
    this.mutations.observe(this, { childList: true });

    this.resizer = new ResizeObserver(() => {
      // defer out of the observer callback — flipping modes re-renders and
      // resizes us, which would otherwise trip the browser's RO loop guard
      requestAnimationFrame(() => this.updateModes());
    });
    this.resizer.observe(this);
  }

  private updateModes() {
    const width = this.offsetWidth;
    if (width > 0) {
      this.hostWidth = width;
      this.narrow = width < this.getFlipWidth();
      this.compactTabs = width < CardLayout.COMPACT_TABS_WIDTH;
    }
  }

  public disconnectedCallback(): void {
    this.removeEventListener(
      CustomEventType.DetailsChanged,
      this.handleDetailsChanged
    );
    this.removeEventListener('toggle', this.handleToggle);
    this.resizer?.disconnect();
    this.mutations?.disconnect();
    this.releaseResize();

    // flush a pending save so navigating away doesn't drop it
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
      this.saveSettings();
    }
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

  private dragStartX = 0;
  private dragStartWidth = 0;

  // dragging past the widest fit pins the chat there; the pointer must
  // then travel this fraction of the card column before the layout flips
  // to tabs — and come the complementary fraction back across it before
  // the cards pop back out
  static FLIP_DRAG_RATIO = 0.75;

  private handleResizeStart = (event: MouseEvent) => {
    event.preventDefault();
    // in tab view the main pane fills the layout, so the drag starts from
    // the full width — the cards return only once the pointer has come
    // most of the way back across the column they will occupy
    const main = this.shadowRoot.querySelector('.main') as HTMLElement;
    this.dragStartX = event.clientX;
    this.dragStartWidth = main ? main.offsetWidth : this.offsetWidth;
    this.resizing = true;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', this.handleResizeMove);
    window.addEventListener('mouseup', this.handleResizeEnd);
  };

  private handleResizeMove = (event: MouseEvent) => {
    const width = this.offsetWidth;
    // the widest chat that still leaves the cards their footprint
    const max = width - CardLayout.COLUMN_FOOTPRINT;
    // where the pointer says the chat edge should be — it can run past
    // the widest fit without the chat following
    const dragged = Math.min(
      Math.max(
        this.dragStartWidth + event.clientX - this.dragStartX,
        this.mainMinWidth
      ),
      width
    );

    const flipZone = CardLayout.COLUMN_FOOTPRINT * CardLayout.FLIP_DRAG_RATIO;
    const returnZone = CardLayout.COLUMN_FOOTPRINT - flipZone;
    if (this.narrow) {
      // in tabs the cards return only once the pointer has dragged far
      // enough back; until then the width keeps tracking the pointer so
      // a release leaves tab mode in place
      this.mainWidth =
        dragged < max + returnZone ? Math.min(dragged, max) : dragged;
    } else {
      // in cards the chat stops growing at the widest fit — the flip to
      // tabs waits until the pointer has crossed most of the card column
      this.mainWidth =
        dragged > max + flipZone ? dragged : Math.min(dragged, max);
    }
  };

  private handleResizeEnd = () => {
    this.releaseResize();
    this.fireCustomEvent(CustomEventType.Resized, { width: this.mainWidth });
    this.scheduleSave();
  };

  private releaseResize() {
    if (!this.resizing) {
      return;
    }
    this.resizing = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    window.removeEventListener('mousemove', this.handleResizeMove);
    window.removeEventListener('mouseup', this.handleResizeEnd);
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

  /** Seed collapsed state from the saved settings — once per card, so
   * later slot churn can't undo a toggle the user has since made. */
  private applyCollapsed() {
    if (!this.settings) {
      return;
    }
    const collapsed = this.settings.collapsed || [];
    this.getCards().forEach((card) => {
      if (!this.seeded.has(card.id)) {
        this.seeded.add(card.id);
        if (collapsed.includes(card.id)) {
          card.collapsed = true;
        }
      }
    });
  }

  private handleSlotChange() {
    this.applyProjection();
    this.applyOrder();
    this.applyCollapsed();
    // tab entries render from the slotted cards
    this.requestUpdate();
  }

  private handleOrderChanged(event: CustomEvent) {
    // keep our order prop in sync so a mode switch and back doesn't undo
    // a drag; the event continues up to the host
    this.order = event.detail.ids;
    this.scheduleSave();
  }

  private scheduleSave() {
    if (!this.settingsEndpoint) {
      return;
    }
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      this.saveSettings();
    }, this.saveDelay);
  }

  /** Slot this page's cards into the full saved order without disturbing
   * the position of cards this page doesn't show. */
  private mergeOrder(existing: string[], present: string[]): string[] {
    const queue = present.slice();
    const result = existing.map((id) =>
      present.includes(id) ? queue.shift() : id
    );
    return result.concat(queue);
  }

  private saveSettings() {
    if (!this.settingsEndpoint) {
      return;
    }

    const present = this.getIds();
    const collapsed = this.getCards()
      .filter((card) => card.collapsed)
      .map((card) => card.id);

    this.savedOrder = this.mergeOrder(this.savedOrder, present);
    this.savedCollapsed = this.savedCollapsed
      .filter((id) => !present.includes(id))
      .concat(collapsed);

    const settings: CardSettings = {
      order: this.savedOrder,
      collapsed: this.savedCollapsed
    };
    if (this.mainWidth > 0) {
      settings.width = Math.round(this.mainWidth);
    }

    postJSON(this.settingsEndpoint, {
      [this.settingsKey]: settings
    }).catch(() => {
      // a failed save isn't worth interrupting the user over — the next
      // change will retry with the same merged state
    });
  }

  protected willUpdate(changes: Map<PropertyKey, unknown>): void {
    super.willUpdate(changes);
    // seed here so setting `order` rides the same update cycle
    if (changes.has('settings') && this.settings) {
      this.savedOrder = this.settings.order || [];
      this.savedCollapsed = this.settings.collapsed || [];
      if (this.savedOrder.length > 0) {
        this.order = this.savedOrder;
      }
      if (this.settings.width > 0) {
        this.mainWidth = this.settings.width;
      }
      this.applyCollapsed();
    }
    if (changes.has('mainWidth')) {
      // an undersized saved width (e.g. saved on a page with a lower
      // floor) gets the same floor as a drag
      if (this.mainWidth > 0) {
        this.mainWidth = Math.max(this.mainWidth, this.mainMinWidth);
        this.style.setProperty('--main-width', `${this.mainWidth}px`);
      } else {
        this.style.removeProperty('--main-width');
      }
      // the flip point tracks the user width — resizing wide enough to
      // crowd out the cards flips to tabs, and back again
      this.updateModes();
    }
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

  private renderResizeHandle(edge = false): TemplateResult {
    return html`
      <div
        class=${getClasses({
          'resize-handle': true,
          edge,
          active: this.resizing
        })}
        @mousedown=${this.handleResizeStart}
      >
        <div class="grip"></div>
      </div>
    `;
  }

  public render(): TemplateResult {
    if (this.narrow) {
      // resizing out of tab mode only works when the layout is wide enough
      // to reach card mode at some main-view width — otherwise no handle
      const resizable = this.hostWidth >= this.getMinFlipWidth();
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
        ${resizable ? this.renderResizeHandle(true) : null}
      `;
    }

    return html`
      <div class="body">
        <div class="main">
          <slot name="main"></slot>
          ${this.renderResizeHandle()}
        </div>
        <div class="column">
          <temba-card-stack @temba-order-changed=${this.handleOrderChanged}>
            <slot @slotchange=${this.handleSlotChange}></slot>
          </temba-card-stack>
        </div>
      </div>
    `;
  }
}
