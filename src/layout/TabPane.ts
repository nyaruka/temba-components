import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { CustomEventType } from '../interfaces';
import { RapidElement } from '../RapidElement';
import { getClasses } from '../utils';
import { Tab } from './Tab';

export class TabPane extends RapidElement {
  static get styles() {
    return css`
      :host {
        display: flex;
        flex-direction: column;
        min-height: 0;
        min-width: 0;
        flex-grow: 1;
      }

      .options {
        display: flex;
        align-items: stretch;
        gap: 4px;
        border-bottom: 1px solid var(--border);
      }

      .option {
        user-select: none;
        display: flex;
        align-items: center;
        cursor: pointer;
        padding: 8px 14px 10px;
        margin-bottom: -1px;
        background: transparent;
        color: var(--text-2);
        --icon-color: var(--text-2);
        font-size: 13px;
        font-weight: var(--w-medium);
        border-bottom: 2px solid transparent;
        white-space: nowrap;
        transition:
          color 100ms linear,
          border-color 100ms linear;
      }

      .option:hover {
        color: var(--text-1);
        --icon-color: var(--text-1);
      }

      .option.selected,
      .option.selected:hover {
        cursor: default;
        color: var(--accent-700);
        --icon-color: var(--accent-700);
        border-bottom-color: var(--accent-600);
      }

      .unselect .option.selected {
        cursor: pointer;
      }

      .option.hidden {
        display: none;
      }

      .option.ghost {
        opacity: 0.4;
      }

      .option .name {
        margin-left: 0.4em;
        max-width: 200px;
        overflow: hidden;
        transition:
          max-width 500ms ease-in-out,
          margin 500ms ease-in-out;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      .option .badge {
        margin-left: 0.4em;
        margin-right: -6px;
        display: inline-flex;
        align-items: center;
      }

      .option.merged {
        padding: 0;
      }

      .option.merged .segment {
        display: flex;
        align-items: center;
        padding: 8px 14px 10px;
      }

      .option.merged .segment + .segment {
        border-left: 1px solid var(--border);
      }

      @media (max-width: 900px) {
        .collapses .option .name {
          max-width: 0px;
          margin: 0;
        }
      }

      @media (max-width: 600px) {
        .collapses .option .badge {
          display: none;
        }
      }

      .focusedname .option .name {
        max-width: 0px;
        margin: 0;
        transition:
          max-width 200ms linear,
          margin 200ms linear;
      }

      .focusedname .option.selected .name {
        margin-left: 0.4em;
        max-width: 200px;
      }

      .focusedname .option .name {
        transition: all 0s linear !important;
      }

      .focusedname .option.selected .name {
        transition: all 200ms linear !important;
      }

      .option.dirty {
        font-weight: var(--w-semibold);
      }

      .option.alert {
        color: var(--danger);
        --icon-color: var(--danger);
      }

      .pane {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        min-height: 0;
        overflow: hidden;
        background: var(--tab-pane-bg, transparent);
      }

      .pane.split {
        flex-direction: row;
      }

      .resizer {
        flex: 0 0 20px;
        display: flex;
        justify-content: center;
        cursor: col-resize;
        z-index: 1;
        /* match the vertical inset of the pane cards */
        padding: 0.75rem 0 0;
      }

      .resizer .bar {
        width: 5px;
        border-radius: 2.5px;
        background: var(--border);
        transition: background 100ms linear;
      }

      .resizer:hover .bar,
      .resizer.dragging .bar {
        background: var(--accent-600);
      }

      .pane.split slot[name='pane-bottom']::slotted(*) {
        order: 99;
      }

      .drop-placeholder {
        box-sizing: border-box;
        margin: 0.75rem 0 0;
        border-radius: var(--r-sm, 4px);
        background: var(--sunken, #f3f4f6);
        outline: 2px dashed var(--border-strong, #d1d5db);
        outline-offset: -2px;
      }

      .count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 16px;
        padding: 0 2px;
        color: inherit;
        opacity: 0.6;
        font-size: 11px;
        font-weight: var(--w-medium);
        font-variant-numeric: tabular-nums;
      }

      .option.selected .count,
      .option.alert .count {
        min-width: 16px;
        padding: 0 4px;
        border-radius: 999px;
        opacity: 1;
      }

      .option.selected .count {
        background: var(--accent-100);
        color: var(--accent-700);
        font-weight: var(--w-semibold);
      }

      .option.alert .count {
        background: var(--danger-bg);
        color: var(--danger);
      }

      .dot {
        height: 0.5em;
        width: 0.5em;
        margin-left: 0.2em;
        background: var(--accent-600);
        border-radius: 99px;
      }

      .option.selected .dot {
        display: none;
      }

      .check {
        margin-left: 0.4em;
      }
    `;
  }

  @property({ type: Boolean })
  collapses = false;

  // do we allow unselecting the current tab
  @property({ type: Boolean })
  unselect = false;

  // Only shows the name if the tab is focused
  @property({ type: Boolean })
  focusedName = false;

  // whether unpinned tabs can be dragged to reorder them
  @property({ type: Boolean })
  orderable = false;

  @property({ type: Number })
  index = -1;

  @property({ type: String })
  refresh = '';

  @property({ type: Array, attribute: false })
  options: Tab[] = [];

  // tabs currently merged into a split view, always empty or at least two,
  // the first tab anchors the view and the rest are pulled in as panes
  @property({ type: Array, attribute: false })
  splitTabs: Tab[] = [];

  // user preferred order for unpinned tabs, as tab keys
  @property({ type: Array, attribute: false })
  ordering: string[] = [];

  @property({ type: Boolean, attribute: false })
  dragging = false;

  @property({ type: Boolean, attribute: false })
  orderDragging = false;

  private resizeObserver: ResizeObserver;
  private dragTab: Tab;
  private dragStartX: number;
  private dragStartWidth: number;
  private dragMaxWidth: number;
  private orderTab: Tab;
  private orderStartX: number;
  private orderStartY: number;
  private suppressClick = false;
  @property({ type: Boolean, attribute: false })
  paneDragging = false;

  private paneDragTab: Tab;
  private paneDragStartX: number;
  private paneDragStartY: number;
  private paneGhostOffsetX: number;
  private paneGhostOffsetY: number;
  private splitGrowTimeout: number;

  // the spacing between split panes, resizers live inside these gutters, the
  // gap before the first pulled pane has no resizer so it's half as wide to
  // read the same visually
  private static GUTTER = 20;
  private static FIRST_GUTTER = 10;

  // how long the width must be stable before we pull more panes into the
  // split view, so late-loading layout (menus, fonts) can't make panes
  // flash in and pop back out
  private static GROW_DELAY = 200;

  constructor() {
    super();
    this.handleResizerMove = this.handleResizerMove.bind(this);
    this.handleResizerUp = this.handleResizerUp.bind(this);
    this.handleOrderMove = this.handleOrderMove.bind(this);
    this.handleOrderUp = this.handleOrderUp.bind(this);
    this.handlePaneDragMove = this.handlePaneDragMove.bind(this);
    this.handlePaneDragUp = this.handlePaneDragUp.bind(this);
  }

  private handleTabClick(event: MouseEvent): void {
    if (this.suppressClick) {
      this.suppressClick = false;
      return;
    }

    const newIndex = parseInt(
      (event.currentTarget as HTMLDivElement).dataset.index
    );

    if (this.unselect && this.index === newIndex) {
      this.index = -1;
    } else {
      this.index = newIndex;
    }

    event.preventDefault();
    event.stopPropagation();
    this.requestUpdate('index');
  }

  public handleSlotChange() {
    const tabs: Tab[] = [];
    for (const t of this.children) {
      if (t.tagName === 'TEMBA-TAB') {
        const tab = t as Tab;
        tabs.push(tab);
      }
    }
    this.options = tabs;
    if (this.index < 0 || this.index >= tabs.length) {
      this.index = 0;
    }
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this.ordering = this.getStoredOrder();
  }

  public firstUpdated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.firstUpdated(changes);
    this.shadowRoot.addEventListener(
      'slotchange',
      this.handleSlotChange.bind(this)
    );
    this.resizeObserver = new ResizeObserver(() => {
      // defer so we don't change layout inside the observer callback
      window.requestAnimationFrame(() => this.updateSplitting());
    });
    this.resizeObserver.observe(this);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    window.removeEventListener('mousemove', this.handleResizerMove);
    window.removeEventListener('mouseup', this.handleResizerUp);
    window.removeEventListener('mousemove', this.handleOrderMove);
    window.removeEventListener('mouseup', this.handleOrderUp);
    window.removeEventListener('mousemove', this.handlePaneDragMove);
    window.removeEventListener('mouseup', this.handlePaneDragUp);
    window.clearTimeout(this.splitGrowTimeout);
  }

  public updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    if (changedProperties.has('options')) {
      this.options.forEach((tab, index) => {
        tab.selected = index == this.index;
      });
    }

    if (changedProperties.has('index')) {
      if (this.options.length >= 0) {
        if (this.index !== changedProperties.get('index')) {
          this.options.forEach((tab, index) => {
            tab.selected = index == this.index;
          });
          this.fireEvent(CustomEventType.ContextChanged);
        }
      }
    }

    // if our current tab is hidden, select the first visible one
    if (this.index > this.options.length) {
      const tab = this.options[this.index];
      if (tab && tab.hidden) {
        for (let i = 0; i < this.options.length; i++) {
          const other = this.options[i];
          if (other && !other.hidden) {
            this.index = i;
            return;
          }
        }
      }
    }

    this.updateSplitting();
  }

  // whether the split view is currently showing, which requires the selected
  // tab to be one of the merged tabs
  public isSplitActive(): boolean {
    return (
      this.splitTabs.length > 1 &&
      this.splitTabs.includes(this.options[this.index])
    );
  }

  // tabs in the order they should be displayed, pinned tabs keep their
  // natural position at the front and the rest follow the user's ordering
  public getDisplayOrder(): Tab[] {
    // stored ordering only applies where the user can reorder tabs
    if (!this.orderable) {
      return [...this.options];
    }
    const pinned = this.options.filter((tab) => tab.pinned);
    const rest = this.options.filter((tab) => !tab.pinned);
    rest.sort((a, b) => {
      const aRank = this.getOrderRank(a);
      const bRank = this.getOrderRank(b);
      return aRank - bRank;
    });
    return [...pinned, ...rest];
  }

  private getOrderRank(tab: Tab): number {
    const rank = this.ordering.indexOf(this.getTabKey(tab));
    // tabs the user hasn't ordered sort after, in their natural order
    return rank >= 0 ? rank : this.ordering.length + this.options.indexOf(tab);
  }

  // determine which tabs merge into a split view at our current width, any
  // tab with a split width is pulled in, in display order, as long as it fits
  private updateSplitting(immediate = false): void {
    if (this.dragging || this.orderDragging) {
      return;
    }
    const width = this.offsetWidth;
    const display = this.getDisplayOrder().filter((tab) => !tab.hidden);
    const group: Tab[] = [];

    const primary = display[0];
    if (primary && primary.maxWidth > 0) {
      let required = primary.maxWidth;
      for (const tab of display.slice(1)) {
        if (!(tab.splitWidth > 0)) {
          continue;
        }
        const gutter =
          group.length === 0 ? TabPane.FIRST_GUTTER : TabPane.GUTTER;
        const needed = required + gutter + tab.splitWidth;
        if (needed > width) {
          break;
        }
        group.push(tab);
        required = needed;
      }
      if (group.length > 0) {
        group.unshift(primary);
      }
    }

    const changed =
      group.length !== this.splitTabs.length ||
      group.some((tab, i) => tab !== this.splitTabs[i]);
    if (changed) {
      // adding panes waits for the width to settle, removals are immediate
      // since keeping a pane that no longer fits would overflow
      if (!immediate && group.length > this.splitTabs.length) {
        window.clearTimeout(this.splitGrowTimeout);
        this.splitGrowTimeout = window.setTimeout(() => {
          this.updateSplitting(true);
        }, TabPane.GROW_DELAY);
        this.applySplitStyles(width);
        // going from no split to a split, cap the anchor at its split width
        // now so its content doesn't stretch across the full width and then
        // reflow when the extra panes are pulled in after the width settles.
        // the reserved space stays empty until the panes arrive.
        //
        // only cap the width here — the pane is still a column at this point
        // (the split/row layout doesn't kick in until the panes actually
        // arrive), so setting flex:0 0 auto would collapse the anchor to its
        // content height and leave just the compose box showing. leaving the
        // selected tab's flex-grow in place keeps it filling the height while
        // the explicit width holds the reserved space on the cross axis.
        if (this.splitTabs.length === 0) {
          const primary = group[0];
          if (primary && group.includes(this.options[this.index])) {
            primary.style.removeProperty('flex');
            primary.style.width = `${primary.maxWidth}px`;
          }
        }
        return;
      }
      this.splitTabs = group;
    }
    this.applySplitStyles(width);
  }

  // size our panes, the first pane is capped at its max width, panes in the
  // middle use their remembered widths and the last pane fills what's left
  private applySplitStyles(width: number): void {
    const active = this.isSplitActive();
    const group = this.splitTabs;
    const gutters =
      group.length > 1
        ? TabPane.FIRST_GUTTER + (group.length - 2) * TabPane.GUTTER
        : 0;
    const secondaryMins = group
      .slice(1)
      .reduce((total, tab) => total + tab.splitWidth, 0);

    const placeholder = this.paneDragging
      ? (this.shadowRoot.querySelector('.drop-placeholder') as HTMLElement)
      : null;

    for (const tab of this.options) {
      const groupIndex = active ? group.indexOf(tab) : -1;
      tab.split = groupIndex >= 0;
      tab.splitIndex = groupIndex;
      tab.headerGrab = this.orderable && !tab.pinned;

      // while a card is being dragged it follows the cursor, its layout
      // slot is occupied by the drop placeholder
      if (this.paneDragging && tab === this.paneDragTab) {
        if (placeholder) {
          if (groupIndex >= 0) {
            placeholder.style.display = 'block';
            this.applySlotStyles(
              placeholder,
              groupIndex,
              group,
              width,
              gutters,
              secondaryMins
            );
          } else {
            placeholder.style.display = 'none';
          }
        }
        continue;
      }

      if (groupIndex < 0) {
        tab.style.removeProperty('flex');
        tab.style.removeProperty('width');
        tab.style.removeProperty('min-width');
        tab.style.removeProperty('margin-left');
        tab.style.removeProperty('margin-right');
        tab.style.removeProperty('order');
        tab.style.removeProperty('border');
        continue;
      }

      // the card border is inline so page-level resets can't strip it
      if (groupIndex > 0) {
        tab.style.border =
          '1px solid var(--tab-card-border, var(--border-strong, #ddd))';
      } else {
        tab.style.removeProperty('border');
      }

      this.applySlotStyles(
        tab,
        groupIndex,
        group,
        width,
        gutters,
        secondaryMins
      );
    }
  }

  // position and size an element for a slot in the split layout, used for
  // both the panes themselves and the drop placeholder during a drag
  private applySlotStyles(
    el: HTMLElement,
    groupIndex: number,
    group: Tab[],
    width: number,
    gutters: number,
    secondaryMins: number
  ): void {
    const tab = group[groupIndex];
    el.style.order = `${groupIndex * 2}`;

    // the first secondary pane has no resizer before it, just a gap
    if (groupIndex === 1) {
      el.style.marginLeft = `${TabPane.FIRST_GUTTER}px`;
    } else {
      el.style.removeProperty('margin-left');
    }

    el.style.removeProperty('margin-right');

    if (groupIndex === 0) {
      el.style.flex = '0 0 auto';
      el.style.width = `${tab.maxWidth}px`;
    } else if (groupIndex === group.length - 1) {
      el.style.flex = '1 1 0';
      el.style.removeProperty('width');
      el.style.minWidth = `${tab.splitWidth}px`;
    } else {
      const available =
        width - group[0].maxWidth - gutters - (secondaryMins - tab.splitWidth);
      const paneWidth = Math.min(
        Math.max(this.getStoredWidth(tab) || tab.splitWidth, tab.splitWidth),
        available
      );
      el.style.flex = '0 0 auto';
      el.style.width = `${paneWidth}px`;
    }
  }

  private getTabKey(tab: Tab): string {
    return tab.icon || tab.name;
  }

  private getStorageScope(): string {
    return this.id ? `-${this.id}` : '';
  }

  private getStorageKey(tab: Tab): string {
    return `temba-tabs${this.getStorageScope()}-split-${this.getTabKey(tab)}`;
  }

  private getStoredWidth(tab: Tab): number {
    try {
      const width = parseInt(
        window.localStorage.getItem(this.getStorageKey(tab))
      );
      return isNaN(width) ? 0 : width;
    } catch (e) {
      return 0;
    }
  }

  private setStoredWidth(tab: Tab, width: number): void {
    try {
      window.localStorage.setItem(this.getStorageKey(tab), `${width}`);
    } catch (e) {
      // storage isn't available, width just won't be remembered
    }
  }

  private getStoredOrder(): string[] {
    try {
      const order = JSON.parse(
        window.localStorage.getItem(`temba-tabs${this.getStorageScope()}-order`)
      );
      return Array.isArray(order) ? order : [];
    } catch (e) {
      return [];
    }
  }

  private setStoredOrder(): void {
    try {
      window.localStorage.setItem(
        `temba-tabs${this.getStorageScope()}-order`,
        JSON.stringify(this.ordering)
      );
    } catch (e) {
      // storage isn't available, order just won't be remembered
    }
  }

  private handleResizerDown(event: MouseEvent): void {
    const groupIndex = parseInt(
      (event.currentTarget as HTMLElement).dataset.index
    );
    this.dragTab = this.splitTabs[groupIndex];
    this.dragStartX = event.clientX;
    this.dragStartWidth = this.dragTab.offsetWidth;

    // we can grow until the last pane is squeezed to its minimum
    const last = this.splitTabs[this.splitTabs.length - 1];
    this.dragMaxWidth =
      this.dragStartWidth + last.offsetWidth - last.splitWidth;

    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', this.handleResizerMove);
    window.addEventListener('mouseup', this.handleResizerUp);
    this.dragging = true;
    event.preventDefault();
  }

  private handleResizerMove(event: MouseEvent): void {
    const width = Math.min(
      Math.max(
        this.dragStartWidth + event.clientX - this.dragStartX,
        this.dragTab.splitWidth
      ),
      this.dragMaxWidth
    );
    this.dragTab.style.width = `${width}px`;
  }

  private handleResizerUp(): void {
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', this.handleResizerMove);
    window.removeEventListener('mouseup', this.handleResizerUp);
    this.dragging = false;

    const width = this.dragTab.offsetWidth;
    this.setStoredWidth(this.dragTab, width);
    this.fireCustomEvent(CustomEventType.Resized, {
      tab: this.dragTab.name,
      width
    });
  }

  private handleOrderDown(event: MouseEvent): void {
    const tab =
      this.options[
        parseInt((event.currentTarget as HTMLElement).dataset.index)
      ];
    if (!tab || tab.pinned) {
      return;
    }
    this.orderTab = tab;
    this.orderStartX = event.clientX;
    this.orderStartY = event.clientY;
    window.addEventListener('mousemove', this.handleOrderMove);
    window.addEventListener('mouseup', this.handleOrderUp);
  }

  private handleOrderMove(event: MouseEvent): void {
    if (!this.orderDragging) {
      if (
        Math.abs(event.clientX - this.orderStartX) < 5 &&
        Math.abs(event.clientY - this.orderStartY) < 5
      ) {
        return;
      }
      this.orderDragging = true;
      document.body.style.userSelect = 'none';
    }

    // unpinned tabs in display order, without the one being dragged
    const flat = this.getDisplayOrder().filter(
      (tab) => !tab.pinned && tab !== this.orderTab
    );

    // walk the rendered options, treating each merged segment as its own
    // stop, counting the unpinned tabs left of the pointer
    const stops: HTMLElement[] = [];
    for (const option of Array.from(
      this.shadowRoot.querySelectorAll('.options .option:not(.hidden)')
    ) as HTMLElement[]) {
      if (option.classList.contains('merged')) {
        stops.push(
          ...(Array.from(option.querySelectorAll('.segment')) as HTMLElement[])
        );
      } else {
        stops.push(option);
      }
    }

    let insert = 0;
    for (const stop of stops) {
      const tab = this.options[parseInt(stop.dataset.index)];
      if (!tab || tab === this.orderTab || tab.pinned) {
        continue;
      }
      const box = stop.getBoundingClientRect();
      if (event.clientX > box.left + box.width / 2) {
        insert += 1;
      }
    }

    const newOrdering = flat.map((tab) => this.getTabKey(tab));
    newOrdering.splice(insert, 0, this.getTabKey(this.orderTab));
    if (JSON.stringify(newOrdering) !== JSON.stringify(this.ordering)) {
      this.ordering = newOrdering;
    }
  }

  // a pane header was grabbed, get ready to drag it to reorder the panes
  private handlePaneDragStart(event: CustomEvent): void {
    const tab = event.detail.tab as Tab;
    if (
      !tab ||
      !this.options.includes(tab) ||
      !this.orderable ||
      tab.pinned ||
      !this.isSplitActive()
    ) {
      return;
    }
    event.stopPropagation();
    this.paneDragTab = tab;
    this.paneDragStartX = event.detail.clientX;
    this.paneDragStartY = event.detail.clientY;
    window.addEventListener('mousemove', this.handlePaneDragMove);
    window.addEventListener('mouseup', this.handlePaneDragUp);
  }

  private handlePaneDragMove(event: MouseEvent): void {
    if (!this.paneDragging) {
      if (
        Math.abs(event.clientX - this.paneDragStartX) < 3 &&
        Math.abs(event.clientY - this.paneDragStartY) < 3
      ) {
        return;
      }

      // the real card lifts out of the layout and follows the cursor, a
      // placeholder takes over its slot. the grab offset is anchored to the
      // original mousedown so the card tracks the true grab point
      const rect = this.paneDragTab.getBoundingClientRect();
      this.paneGhostOffsetX = this.paneDragStartX - rect.left;
      this.paneGhostOffsetY = this.paneDragStartY - rect.top;
      this.paneDragging = true;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';

      const style = this.paneDragTab.style;
      style.position = 'fixed';
      style.left = `${rect.left}px`;
      style.top = `${rect.top}px`;
      style.width = `${rect.width}px`;
      style.height = `${rect.height}px`;
      style.margin = '0';
      style.zIndex = '99999';
      style.pointerEvents = 'none';
      style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.18)';
      style.transform = 'scale(1.02)';

      // render the placeholder now so the layout doesn't jump
      this.performUpdate();
      this.updateSplitting();
    }

    this.paneDragTab.style.left = `${event.clientX - this.paneGhostOffsetX}px`;
    this.paneDragTab.style.top = `${event.clientY - this.paneGhostOffsetY}px`;

    // reorder live as the dragged card itself crosses pane midpoints, using
    // the card's center rather than the cursor so the grab point within the
    // title bar doesn't matter
    const others = this.splitTabs.filter(
      (tab) => tab !== this.paneDragTab && !tab.pinned
    );
    if (!others.length) {
      return;
    }
    const draggedCenter =
      event.clientX - this.paneGhostOffsetX + this.paneDragTab.offsetWidth / 2;
    let before: Tab = null;
    for (const tab of others) {
      const box = tab.getBoundingClientRect();
      if (draggedCenter < box.left + box.width / 2) {
        before = tab;
        break;
      }
    }

    const flat = this.getDisplayOrder().filter(
      (tab) => !tab.pinned && tab !== this.paneDragTab
    );
    const index = before
      ? flat.indexOf(before)
      : flat.indexOf(others[others.length - 1]) + 1;
    flat.splice(index, 0, this.paneDragTab);
    const newOrdering = flat.map((tab) => this.getTabKey(tab));
    if (JSON.stringify(newOrdering) !== JSON.stringify(this.ordering)) {
      this.ordering = newOrdering;
      this.updateSplitting();
    }
  }

  private handlePaneDragUp(): void {
    window.removeEventListener('mousemove', this.handlePaneDragMove);
    window.removeEventListener('mouseup', this.handlePaneDragUp);
    if (this.paneDragging) {
      this.paneDragging = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      if (this.paneDragTab) {
        // drop the card back into its slot
        const style = this.paneDragTab.style;
        for (const prop of [
          'position',
          'left',
          'top',
          'width',
          'height',
          'margin',
          'z-index',
          'pointer-events',
          'box-shadow',
          'transform'
        ]) {
          style.removeProperty(prop);
        }
      }
      this.setStoredOrder();
      this.updateSplitting();
      this.fireCustomEvent(CustomEventType.OrderChanged, {
        order: [...this.ordering]
      });
    }
    this.paneDragTab = null;
  }

  private handleOrderUp(): void {
    window.removeEventListener('mousemove', this.handleOrderMove);
    window.removeEventListener('mouseup', this.handleOrderUp);
    if (this.orderDragging) {
      this.orderDragging = false;
      document.body.style.userSelect = '';
      this.setStoredOrder();
      this.updateSplitting();

      // swallow the click that follows a drag
      this.suppressClick = true;
      window.setTimeout(() => {
        this.suppressClick = false;
      }, 0);
    }
    this.orderTab = null;
  }

  public focusTab(name: string): Tab {
    const index = this.options.findIndex((tab) => tab.name === name);
    if (index >= 0) {
      this.index = index;
      return this.getTab(index);
    }
  }

  public setTabDetails(
    index: number,
    details: { count: number; hidden: boolean }
  ) {
    if (index < this.options.length) {
      const tab = this.options[index];
      tab.count = details.count;
      tab.hidden = details.hidden;
      this.requestUpdate();
    } else {
      // not ready yet, set the tab details later
      setTimeout(() => {
        this.setTabDetails(index, details);
      }, 100);
    }
  }

  public getCurrentTab(): Tab {
    return this.options[this.index];
  }

  public getTab(index: number): Tab {
    return this.options[index];
  }

  public handleTabContentChanged() {
    this.requestUpdate();
  }

  public handleTabDetailsChanged() {
    this.requestUpdate();
  }

  private renderOptionContent(tab: Tab): TemplateResult {
    return html`${tab.icon ? html`<temba-icon name=${tab.icon} />` : null}
      <div class="name">${tab.name} ${tab.dirty ? ` *` : ``}</div>
      ${tab.hasBadge()
        ? html`
            <div class="badge">
              ${tab.count > 0 && !tab.activity
                ? html`<div class="count">${tab.count.toLocaleString()}</div>`
                : null}
              ${tab.activity && tab.count > 0 && !tab.dirty
                ? html`<div class="dot"></div>`
                : null}
            </div>
          `
        : null}
      ${tab.checked && !tab.alert
        ? html`<temba-icon class="check" name="check"></temba-icon>`
        : null}`;
  }

  public render(): TemplateResult {
    const merged = this.splitTabs.length > 1;
    const splitActive = this.isSplitActive();
    const display = this.getDisplayOrder();
    return html`
      <div
        class="${getClasses({
          options: true,
          collapses: this.collapses,
          focusedname: this.focusedName,
          unselect: this.unselect
        })}"
      >
        ${display.map((tab) => {
          const index = this.options.indexOf(tab);
          const groupIndex = merged ? this.splitTabs.indexOf(tab) : -1;

          // merged tabs render together as a single option
          if (groupIndex > 0) {
            return null;
          }

          if (groupIndex === 0) {
            return html`
              <div
                @click=${this.handleTabClick}
                data-index=${index}
                class="${getClasses({
                  option: true,
                  merged: true,
                  first: display[0] === tab,
                  selected: splitActive,
                  alert: this.splitTabs.some((t) => t.alert),
                  dirty: this.splitTabs.some((t) => t.dirty)
                })}"
              >
                ${this.splitTabs.map(
                  (t) =>
                    html`<div
                      class="${getClasses({
                        segment: true,
                        ghost: this.orderDragging && t === this.orderTab
                      })}"
                      data-index=${this.options.indexOf(t)}
                      @mousedown=${this.orderable && !t.pinned
                        ? this.handleOrderDown
                        : null}
                    >
                      ${this.renderOptionContent(t)}
                    </div>`
                )}
              </div>
            `;
          }

          return html`
            <div
              @click=${this.handleTabClick}
              @mousedown=${this.orderable && !tab.pinned
                ? this.handleOrderDown
                : null}
              data-index=${index}
              class="${getClasses({
                option: true,
                first: display[0] === tab,
                selected: index == this.index,
                hidden: tab.hidden,
                alert: tab.alert,
                dirty: tab.dirty,
                ghost: this.orderDragging && tab === this.orderTab
              })}"
            >
              ${this.renderOptionContent(tab)}
            </div>
          `;
        })}

        <div style="flex-grow:1"></div>
        <div style="display:flex; align-items:center">
          <slot name="tab-right"></slot>
        </div>
      </div>
      <div
        @temba-details-changed=${this.handleTabDetailsChanged}
        @temba-drag-start=${this.handlePaneDragStart}
        class="${getClasses({ pane: true, split: splitActive })}"
      >
        <slot></slot>
        ${splitActive
          ? this.splitTabs.slice(1, -1).map((tab, i) => {
              // each resizer sits after the pane it resizes
              const groupIndex = i + 1;
              return html`
                <div
                  data-index=${groupIndex}
                  style="order:${groupIndex * 2 + 1}"
                  class="${getClasses({
                    resizer: true,
                    dragging: this.dragging && this.dragTab === tab
                  })}"
                  @mousedown=${this.handleResizerDown}
                >
                  <div class="bar"></div>
                </div>
              `;
            })
          : null}
        ${this.paneDragging ? html`<div class="drop-placeholder"></div>` : null}
        <slot name="pane-bottom"></slot>
      </div>
    `;
  }
}
