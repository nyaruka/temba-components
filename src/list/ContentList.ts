import { css, html, PropertyValues, TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { Icon } from '../Icons';
import { CustomEventType } from '../interfaces';
import { getUrl, postUrl, debounce } from '../utils';
import { designTokens } from '../styles/designTokens';

/** A single column in the list. Subclasses typically define a static
 * set via {@link ContentList.columns}; consumers may also set it as
 * an attribute / property for ad-hoc lists. */
export interface ContentListColumn {
  key: string;
  label?: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  /** Explicit flex-basis (e.g. "120px" or "20%"). When omitted the
   * cell uses `flex: <grow> 1 0` and shares remaining width. */
  width?: string;
  /** Flex grow factor — defaults to 1, set to 0 to keep a column
   * sized strictly to its `width`. */
  grow?: number;
}

/** A bulk action surfaced in the toolbar when one or more rows are
 * selected. The host typically handles the action by listening for
 * `temba-bulk-action` and POSTing as it sees fit. The label-toggle
 * action is a special case — when `labelsEndpoint` is set, the
 * component renders a dropdown of label checkboxes and POSTs the
 * apply/remove directly to {@link ContentList.actionEndpoint},
 * mirroring rapidpro's `runActionOnObjectRows('label', …)` flow. */
export interface ContentListBulkAction {
  key: string;
  label: string;
  icon?: string;
  destructive?: boolean;
  /** GET endpoint returning `{ results: [{ uuid, name, count? }] }`.
   * Setting this turns the action into a label-toggle dropdown
   * instead of a fire-and-forget bulk-action event. */
  labelsEndpoint?: string;
}

interface FetchResponse<T = any> {
  results: T[];
  count?: number;
  next?: string;
  previous?: string;
}

/**
 * Generic JSON-driven list for CRUDL-style pages. Renders search +
 * sortable column headers + multi-select rows + bulk-action toolbar
 * + paged pagination, fully styled from the TextIt design tokens.
 *
 * Subclasses set `columns` / `bulkActions` / `valueKey` and override
 * {@link renderCell} for non-trivial cells (pills, attachments,
 * progress bars, etc.). The base class handles selection, sorting,
 * search debouncing, pagination, URL state, and fetch lifecycle.
 *
 * No polling — list refresh is explicit (`refresh()` method or
 * `refresh-key` attribute change). CRUDL pages should not auto-poll.
 */
export class ContentList<T = any> extends RapidElement {
  static get styles() {
    return css`
      ${designTokens}

      :host {
        display: block;
        font-family: var(--font);
        color: var(--text-1);
        font-size: 13.5px;
      }

      /* Title row sits inside the panel at the top — title + subtitle
         on the left, actions slot on the right. When rows are
         selected the actions slot is replaced inline by bulk-action
         chips so the toolbar stays in the same spot visually. */
      .titlebar {
        display: flex;
        align-items: flex-start;
        gap: var(--gap);
        padding: 20px 0 16px 0;
      }
      .titles {
        flex: 1 1 auto;
        min-width: 0;
      }
      .title {
        font-size: 15.5px;
        font-weight: var(--w-semibold);
        color: var(--text-1);
        line-height: 1.3;
      }
      .subtitle {
        font-size: 12.5px;
        color: var(--text-3);
        line-height: 1.3;
        margin-top: 1px;
      }
      .actions {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        gap: 14px;
        color: var(--text-2);
        font-size: 13px;
      }

      /* Built-in action button (Search). Plain text + icon, no
         border, host's slotted buttons can match this style or
         bring their own. */
      .action {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        user-select: none;
        padding: 6px 8px;
        border-radius: var(--r-sm);
        color: var(--text-2);
      }
      .action:hover {
        background: var(--sunken);
        color: var(--text-1);
      }
      .action temba-icon {
        --icon-color: currentColor;
      }

      .bulk-action {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: var(--r-sm);
        background: var(--accent-100);
        color: var(--accent-800);
        font-size: 12.5px;
        cursor: pointer;
        user-select: none;
      }
      .bulk-action:hover {
        background: var(--accent-200);
      }
      .bulk-action.destructive {
        background: var(--danger-bg);
        color: var(--danger);
      }
      .bulk-action.destructive:hover {
        background: color-mix(in oklab, var(--danger) 20%, white);
      }
      .bulk-action temba-icon {
        --icon-color: currentColor;
      }
      .bulk-count {
        font-weight: var(--w-medium);
        color: var(--accent-800);
        margin-right: 4px;
      }

      /* Label-toggle dropdown — temba-dropdown wraps the bulk-
         action button, and the slotted content is a list of
         per-label checkbox rows. The menu padding/width matches
         the rapidpro pattern in short_pagination.html. */
      .label-menu {
        min-width: 220px;
        max-height: 320px;
        overflow-y: auto;
        padding: 8px 4px;
        font-size: 13px;
      }
      .label-menu-empty {
        padding: 12px 16px;
        color: var(--text-3);
        font-size: 12.5px;
      }
      .lbl-menu {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        border-radius: var(--r-sm);
        cursor: pointer;
        color: var(--text-1);
      }
      .lbl-menu:hover {
        background: var(--accent-50);
      }
      .lbl-menu.pending {
        background: var(--accent-50);
      }
      /* During an in-flight toggle, the other rows are blocked.
         Keep them readable (no opacity dim) but disable hover and
         cursor so the user can't fire conflicting POSTs. */
      .lbl-menu.blocked,
      .lbl-menu.blocked:hover {
        cursor: not-allowed;
        background: transparent;
        color: var(--text-3);
      }
      .lbl-menu .lbl-name {
        flex: 1 1 auto;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .lbl-menu temba-loading {
        flex: 0 0 auto;
      }

      /* Inline search bar — slides below the title row inside the
         panel when the search trigger is active. Single-line input
         with a leading icon, no border, --sunken background. */
      .searchbar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        margin: 0 0 12px 0;
        background: var(--sunken);
        border-radius: var(--r-sm);
        color: var(--text-3);
      }
      .searchbar input {
        flex: 1 1 auto;
        border: 0;
        background: transparent;
        outline: 0;
        font: inherit;
        color: var(--text-1);
        min-width: 0;
      }
      .searchbar input::placeholder {
        color: var(--text-3);
      }
      .searchbar .clear {
        cursor: pointer;
        color: var(--text-3);
        padding: 2px;
      }
      .searchbar .clear:hover {
        color: var(--text-2);
      }

      /* Card panel — surface white wrapping everything from title
         to footer. Soft shadow + radius gives it the contained-card
         feel from the styleguide. The 20px horizontal padding is
         what insets the header, rows, and footer from the card
         edges so the row strips (and their hover wash) sit on a
         clear margin instead of bleeding to the card chrome. */
      .panel {
        background: var(--surface);
        border-radius: var(--r);
        overflow: hidden;
        box-shadow: var(--shadow-1);
        padding: 0 20px;
      }

      /* Header row sits inside the panel below the titlebar. The
         separators above/below the header are drawn via pseudo-
         elements so they inset 20px from the card edges instead
         of bleeding full-width — same with the row separators
         below. The header background stays untinted; only weight
         + uppercase distinguish it from data rows. */
      /* Full-bleed rule between titlebar/searchbar and the header
         row. Negative horizontal margin escapes the panel's 20px
         padding so the line reaches the card chrome on both sides
         — the rest of the table (rows, lines, hover wash) stays
         inset. */
      .header-rule {
        height: 1px;
        background: var(--border);
        margin: 0 -20px;
      }

      .header {
        position: relative;
        display: flex;
        align-items: center;
        min-height: 36px;
        padding: 0 12px;
        color: var(--text-3);
        font-size: 11px;
        font-weight: var(--w-medium);
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .header::after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 1px;
        background: var(--border);
      }

      /* Data rows live inside the panel's 20px horizontal padding,
         with an extra 12px of lead padding so the checkbox sits
         off the row's left edge. The hover/selected wash paints
         the full row box (inset by the panel), and the bottom
         separator spans the same width. */
      .row {
        position: relative;
        display: flex;
        align-items: center;
        min-height: 44px;
        padding: 0 12px;
        color: var(--text-1);
        cursor: default;
      }
      .row::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: var(--border);
      }
      .row:last-child::after {
        display: none;
      }
      .row:hover {
        background: var(--accent-50);
      }
      .row.selected {
        background: var(--accent-50);
      }
      .row.clickable {
        cursor: pointer;
      }

      .cell,
      .head-cell {
        padding: 0 8px;
        flex: 1 1 0;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .cell.wrap,
      .head-cell.wrap {
        white-space: normal;
      }
      .cell.right,
      .head-cell.right {
        text-align: right;
        justify-content: flex-end;
      }
      .cell.center,
      .head-cell.center {
        text-align: center;
        justify-content: center;
      }

      /* temba-checkbox sizes its icon in em, so the parent's
         font-size dictates the visual scale. The header row uses
         a smaller font-size for its uppercase labels — without
         this override, the header's select-all checkbox would
         render smaller than the row checkboxes. Pin the cell's
         font-size so all checkboxes match regardless of parent. */
      .check-cell {
        flex: 0 0 auto;
        padding: 0 6px 0 0;
        display: flex;
        align-items: center;
        font-size: 13.5px;
        cursor: pointer;
        --icon-color: var(--text-3);
      }
      /* The inner temba-checkbox is purely a visual indicator —
         the cell-level @click is the single source of truth for
         toggling selection. Disabling pointer events on the
         checkbox prevents its internal click handler from firing
         a second toggle on the same user click. */
      .check-cell temba-checkbox {
        pointer-events: none;
      }
      .row.selected .check-cell {
        --icon-color: var(--accent-700);
      }

      .head-cell.sortable {
        cursor: pointer;
        user-select: none;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .head-cell.sortable:hover {
        color: var(--text-2);
      }
      .head-cell.sortable temba-icon {
        --icon-color: var(--text-3);
        opacity: 0.55;
      }
      .head-cell.sortable.active temba-icon {
        --icon-color: var(--accent-700);
        opacity: 1;
      }
      .head-cell.sortable.active {
        color: var(--accent-700);
      }

      /* Leading icon column — small entity-type icon shared by
         every row in the list (e.g. campaign clock-refresh,
         contact silhouette, flow type icon). Subclasses override
         {@link getRowIcon} to return a name; if null the column
         collapses. */
      .icon-cell {
        flex: 0 0 auto;
        padding: 0 8px 0 0;
        display: flex;
        align-items: center;
        --icon-color: var(--text-3);
      }
      .row.selected .icon-cell {
        --icon-color: var(--accent-700);
      }

      .empty,
      .loading {
        padding: 40px var(--pad);
        text-align: center;
        color: var(--text-3);
      }

      /* Footer: plain "1–N of Total" count on the left, chevron-
         only paging buttons on the right. No borders, no labels —
         minimal as the styleguide. */
      .footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 0;
        color: var(--text-3);
        font-size: 12.5px;
      }

      .pager {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .page-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: var(--r-sm);
        color: var(--text-3);
        cursor: pointer;
        user-select: none;
      }
      .page-btn:hover {
        background: var(--sunken);
        color: var(--text-1);
      }
      .page-btn[disabled],
      .page-btn[disabled]:hover {
        opacity: 0.35;
        cursor: not-allowed;
        background: transparent;
        color: var(--text-3);
      }
      .page-btn temba-icon {
        --icon-color: currentColor;
      }

      /* Status pill: small rounded chip with a leading colored
         dot. Subclasses use {@link renderStatusPill} to surface
         per-row state (active/pending/stopped/archived/etc.). */
      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 2px 10px 2px 8px;
        border-radius: 999px;
        font-size: 11.5px;
        font-weight: var(--w-medium);
        line-height: 1.4;
      }
      .status-pill::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
      }
      .status-active {
        background: var(--success-bg);
        color: var(--success);
      }
      .status-pending {
        background: var(--info-bg);
        color: var(--info);
      }
      .status-stopped,
      .status-warning {
        background: var(--warning-bg);
        color: var(--warning);
      }
      .status-archived,
      .status-neutral {
        background: var(--neutral-bg);
        color: var(--neutral);
      }
      .status-error {
        background: var(--danger-bg);
        color: var(--danger);
      }
    `;
  }

  /** JSON endpoint URL. The component appends `page`, `sort`, and
   * `search` params. Response must be `{ results, count }` (plus
   * optional `next` / `previous` for parity with api/v2). */
  @property({ type: String })
  endpoint: string;

  /** Column definitions. Subclasses set this in the constructor;
   * consumers may also override at the element level. */
  @property({ type: Array, attribute: false })
  columns: ContentListColumn[] = [];

  /** Bulk actions surfaced in the toolbar when rows are selected. */
  @property({ type: Array, attribute: false })
  bulkActions: ContentListBulkAction[] = [];

  /** Data key used to identify each row (default `uuid`). */
  @property({ type: String })
  valueKey = 'uuid';

  @property({ type: Number })
  pageSize = 50;

  @property({ type: Boolean })
  searchable = true;

  /** When true, multi-select checkboxes render in the first column. */
  @property({ type: Boolean })
  selectable = true;

  /** When true, sort/search/page state is reflected to the URL via
   * `history.pushState` so the page is deep-linkable and back/forward
   * navigates between list states. Off by default — opt in. */
  @property({ type: Boolean })
  urlState = false;

  /** Prefix for URL parameter names — set this when multiple lists
   * share a page (e.g. `messages` → `?messages_page=2&messages_sort=...`). */
  @property({ type: String })
  urlParamPrefix = '';

  /** Placeholder for the search input. */
  @property({ type: String })
  searchPlaceholder = 'Search';

  /** Page-level title rendered above the panel. Either set this or
   * slot custom content via `<div slot="title">…</div>`. */
  @property({ type: String, attribute: 'list-title' })
  listTitle = '';

  /** Smaller subtitle below the title. */
  @property({ type: String })
  subtitle = '';

  /** Message shown when the list is empty. */
  @property({ type: String })
  emptyMessage = 'Nothing to show';

  /** Bump to force a refetch — useful after a bulk action so the host
   * can re-pull from the server. */
  @property({ type: String })
  refreshKey = '';

  /** URL the component POSTs bulk-action changes to (currently
   * label-toggle). Form-data shape mirrors rapidpro's smartmin
   * `BulkActionMixin`: `action=label`, `objects[]=<id>`,
   * `label=<uuid>`, `add=true|false`. */
  @property({ type: String, attribute: 'action-endpoint' })
  actionEndpoint = '';

  @state()
  protected items: T[] = [];

  @state()
  protected total = 0;

  @state()
  protected page = 1;

  /** Sort key; prefix with `-` for descending. Empty = server default. */
  @state()
  protected sort = '';

  @state()
  protected search = '';

  @state()
  protected loading = false;

  @state()
  protected selectedIds: Set<string> = new Set();

  /** Whether the inline search input is expanded. The "Search"
   * action button toggles it; the styleguide hides the input until
   * the user asks for it so the toolbar stays clean. */
  @state()
  protected searchOpen = false;

  /** Cache of labels fetched per label-toggle action key.
   * Populated lazily the first time a label dropdown opens. */
  @state()
  protected labelsByActionKey: { [key: string]: any[] } = {};

  /** Uuid of the label currently being toggled. While set, the
   * dropdown's other toggles are blocked so the user can't fire
   * conflicting POSTs before the server confirms + the list
   * re-fetches. */
  @state()
  protected pendingLabel: string | null = null;

  private pending: AbortController = null;
  private debouncedFetch: () => void;
  private popstateHandler: () => void;

  constructor() {
    super();
    this.debouncedFetch = debounce(() => this.fetchPage(), 250);
  }

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.urlState) {
      this.readUrlState();
      this.popstateHandler = () => {
        this.readUrlState();
        this.fetchPage();
      };
      window.addEventListener('popstate', this.popstateHandler);
    }
  }

  public disconnectedCallback(): void {
    if (this.popstateHandler) {
      window.removeEventListener('popstate', this.popstateHandler);
    }
    if (this.pending) {
      this.pending.abort();
    }
    super.disconnectedCallback();
  }

  protected updated(changes: PropertyValues): void {
    super.updated(changes);
    // Only watch endpoint and refreshKey here — both are typically
    // set externally and have no other handler that already fires a
    // fetch. Sort/page/search are mutated by internal handlers that
    // call fetchPage (directly or via debouncedFetch) themselves, so
    // tracking them here would double-fire the request.
    if ((changes.has('endpoint') || changes.has('refreshKey')) && this.endpoint) {
      this.fetchPage();
    }
  }

  /** Read sort/page/search from the URL on first load / popstate. */
  private readUrlState(): void {
    const params = new URLSearchParams(window.location.search);
    const k = (name: string) =>
      this.urlParamPrefix ? `${this.urlParamPrefix}_${name}` : name;
    this.search = params.get(k('search')) || '';
    this.sort = params.get(k('sort')) || '';
    const pageParam = parseInt(params.get(k('page')) || '1', 10);
    this.page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  }

  /** Push current sort/page/search to the URL. `replace` is true while
   * the user is typing in the search box (don't pollute history). */
  private writeUrlState(replace = false): void {
    if (!this.urlState) return;
    const params = new URLSearchParams(window.location.search);
    const k = (name: string) =>
      this.urlParamPrefix ? `${this.urlParamPrefix}_${name}` : name;

    const setOrDelete = (name: string, value: string) => {
      if (value) params.set(name, value);
      else params.delete(name);
    };
    setOrDelete(k('search'), this.search);
    setOrDelete(k('sort'), this.sort);
    setOrDelete(k('page'), this.page > 1 ? String(this.page) : '');

    const qs = params.toString();
    const url = window.location.pathname + (qs ? '?' + qs : '');
    if (replace) {
      window.history.replaceState({}, '', url);
    } else {
      window.history.pushState({}, '', url);
    }
  }

  /** Build the request URL by appending sort/search/page params to
   * the configured endpoint. */
  private buildRequestUrl(): string {
    const url = new URL(this.endpoint, window.location.origin);
    if (this.search) url.searchParams.set('search', this.search);
    if (this.sort) url.searchParams.set('sort', this.sort);
    if (this.page > 1) url.searchParams.set('page', String(this.page));
    if (this.pageSize !== 50)
      url.searchParams.set('page_size', String(this.pageSize));
    return url.pathname + url.search;
  }

  private async fetchPage(): Promise<void> {
    if (!this.endpoint) return;
    if (this.pending) this.pending.abort();
    const controller = new AbortController();
    this.pending = controller;
    this.loading = true;
    try {
      const response = await getUrl(this.buildRequestUrl(), controller);
      const data = (response.json || {}) as FetchResponse<T>;
      this.items = data.results || [];
      this.total = data.count ?? this.items.length;
      // drop any selected ids that aren't visible anymore — selection
      // is per-page, not cross-page, so users don't accidentally bulk
      // act on rows they can't see.
      const visible = new Set(this.items.map((i) => this.rowId(i)));
      const next = new Set<string>();
      this.selectedIds.forEach((id) => {
        if (visible.has(id)) next.add(id);
      });
      this.selectedIds = next;
    } catch (err) {
      // aborted or failed; leave items as-is and let the caller see
      // the empty/error state via console — no toast to keep the
      // component dependency-free.
      if ((err as DOMException)?.name !== 'AbortError') {
        // eslint-disable-next-line no-console
        console.error('ContentList fetch failed', err);
      }
    } finally {
      if (this.pending === controller) {
        this.pending = null;
        this.loading = false;
        this.fireCustomEvent(CustomEventType.FetchComplete);
      }
    }
  }

  /** Public API — programmatic refresh, mirrors `refreshKey` bump. */
  public refresh(): void {
    this.fetchPage();
  }

  /** Identity helper — uses the `valueKey` to pull a stable id from
   * the row, falling back to JSON.stringify for objects without one. */
  protected rowId(item: T): string {
    const v = (item as any)?.[this.valueKey];
    return v != null ? String(v) : JSON.stringify(item);
  }

  /** Override in subclasses to customize per-column rendering. The
   * default reads `item[column.key]` and renders as text. */
  protected renderCell(
    item: T,
    column: ContentListColumn
  ): TemplateResult | string {
    const value = (item as any)?.[column.key];
    if (value == null) return '';
    return String(value);
  }

  /** Override in subclasses to make rows navigate on click. Return
   * a URL to navigate, or null to leave the click as event-only. */
  protected getRowHref(_item: T): string | null {
    return null;
  }

  private handleSearchInput(event: any): void {
    this.search = event.target.value || '';
    this.page = 1;
    this.writeUrlState(true);
    this.debouncedFetch();
  }

  private handleSortClick(column: ContentListColumn): void {
    if (!column.sortable) return;
    if (this.sort === column.key) {
      this.sort = '-' + column.key;
    } else if (this.sort === '-' + column.key) {
      this.sort = '';
    } else {
      this.sort = column.key;
    }
    this.page = 1;
    this.writeUrlState();
    this.fetchPage();
  }

  private handleRowClick(item: T, event: MouseEvent): void {
    // Ignore clicks originating from the checkbox cell so toggling
    // selection doesn't double as navigation.
    const path = event.composedPath();
    if (path.some((n: any) => n?.classList?.contains?.('check-cell'))) {
      return;
    }
    this.fireCustomEvent(CustomEventType.RowClick, { item });
    const href = this.getRowHref(item);
    if (href && this.isSafeHref(href)) {
      window.location.href = href;
    }
  }

  /** Guard against open-redirect: row hrefs come from JSON-driven
   * subclasses and could contain externally-influenced values. Only
   * permit same-origin navigation — absolute URLs must match the
   * current origin, relative URLs must be path-only (starting with
   * `/` and not `//`, which would be protocol-relative). */
  private isSafeHref(href: string): boolean {
    if (typeof href !== 'string' || href.length === 0) return false;
    // Reject protocol-relative URLs ("//evil.com/...") and any
    // scheme-prefixed URL that isn't same-origin.
    if (href.startsWith('//')) return false;
    if (href.startsWith('/')) return true;
    try {
      const url = new URL(href, window.location.origin);
      return url.origin === window.location.origin;
    } catch {
      return false;
    }
  }

  private handleRowToggle(item: T): void {
    const id = this.rowId(item);
    const next = new Set(this.selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedIds = next;
    this.fireCustomEvent(CustomEventType.SelectionChange, {
      ids: Array.from(next)
    });
  }

  private handleSelectAll(): void {
    const allIds = this.items.map((i) => this.rowId(i));
    const allSelected =
      allIds.length > 0 && allIds.every((id) => this.selectedIds.has(id));
    this.selectedIds = allSelected ? new Set() : new Set(allIds);
    this.fireCustomEvent(CustomEventType.SelectionChange, {
      ids: Array.from(this.selectedIds)
    });
  }

  private handleBulkAction(action: ContentListBulkAction): void {
    this.fireCustomEvent(CustomEventType.BulkAction, {
      action: action.key,
      ids: Array.from(this.selectedIds)
    });
  }

  private handlePage(delta: number): void {
    const lastPage = Math.max(1, Math.ceil(this.total / this.pageSize));
    const next = Math.min(lastPage, Math.max(1, this.page + delta));
    if (next !== this.page) {
      this.page = next;
      this.writeUrlState();
      this.fetchPage();
    }
  }

  private renderTitlebar(): TemplateResult {
    const selectionCount = this.selectedIds.size;
    const bulkVisible = selectionCount > 0 && this.bulkActions.length > 0;
    return html`
      <div class="titlebar">
        <div class="titles">
          <div class="title">
            <slot name="title">${this.listTitle}</slot>
          </div>
          ${this.subtitle || this.querySelector('[slot="subtitle"]')
            ? html`<div class="subtitle">
                <slot name="subtitle">${this.subtitle}</slot>
              </div>`
            : null}
        </div>
        <div class="actions">
          ${bulkVisible
            ? html`
                <span class="bulk-count">${selectionCount} selected</span>
                ${this.bulkActions.map((a) => this.renderBulkAction(a))}
              `
            : html`
                ${this.searchable && !this.searchOpen
                  ? html`
                      <span class="action" @click=${() => this.toggleSearch()}>
                        <temba-icon
                          name=${Icon.search}
                          size="0.95"
                        ></temba-icon>
                        Search
                      </span>
                    `
                  : null}
                <slot name="actions"></slot>
              `}
        </div>
      </div>
      ${this.searchable && this.searchOpen
        ? html`
            <div class="searchbar">
              <temba-icon name=${Icon.search} size="0.95"></temba-icon>
              <input
                type="text"
                placeholder=${this.searchPlaceholder}
                .value=${this.search}
                @input=${this.handleSearchInput}
                autofocus
              />
              ${this.search
                ? html`<span class="clear" @click=${() => this.clearSearch()}>
                    <temba-icon name=${Icon.close} size="0.85"></temba-icon>
                  </span>`
                : null}
            </div>
          `
        : null}
    `;
  }

  private renderBulkAction(action: ContentListBulkAction): TemplateResult {
    if (action.labelsEndpoint) {
      return this.renderLabelDropdown(action);
    }
    return html`
      <span
        class="bulk-action ${action.destructive ? 'destructive' : ''}"
        @click=${() => this.handleBulkAction(action)}
      >
        ${action.icon
          ? html`<temba-icon name=${action.icon} size="0.9"></temba-icon>`
          : null}
        ${action.label}
      </span>
    `;
  }

  private renderLabelDropdown(action: ContentListBulkAction): TemplateResult {
    const labels = this.labelsByActionKey[action.key] || [];
    return html`
      <temba-dropdown
        class="label-dropdown"
        @temba-opened=${() => this.handleLabelDropdownOpened(action)}
      >
        <span
          slot="toggle"
          class="bulk-action ${action.destructive ? 'destructive' : ''}"
        >
          ${action.icon
            ? html`<temba-icon name=${action.icon} size="0.9"></temba-icon>`
            : null}
          ${action.label}
        </span>
        <div slot="dropdown" class="label-menu">
          ${labels.length === 0
            ? html`<div class="label-menu-empty">Loading&hellip;</div>`
            : labels.map((label) => this.renderLabelOption(label))}
        </div>
      </temba-dropdown>
    `;
  }

  private renderLabelOption(label: any): TemplateResult {
    const state = this.computeLabelState(label.uuid);
    const isPending = this.pendingLabel === label.uuid;
    const isBlocked = this.pendingLabel !== null && !isPending;
    return html`
      <div
        class="lbl-menu ${isPending ? 'pending' : ''} ${isBlocked
          ? 'blocked'
          : ''}"
        @click=${(e: MouseEvent) => {
          e.stopPropagation();
          if (this.pendingLabel !== null) return;
          this.toggleLabel(label, state);
        }}
      >
        <temba-checkbox
          size="1.1"
          ?checked=${state === 'all'}
          ?partial=${state === 'some'}
        ></temba-checkbox>
        <span class="lbl-name">${label.name}</span>
        ${isPending
          ? html`<temba-loading units="3" size="6"></temba-loading>`
          : null}
      </div>
    `;
  }

  private async handleLabelDropdownOpened(
    action: ContentListBulkAction
  ): Promise<void> {
    if (this.labelsByActionKey[action.key] || !action.labelsEndpoint) return;
    try {
      const response = await getUrl(action.labelsEndpoint);
      const labels = response.json?.results || [];
      this.labelsByActionKey = {
        ...this.labelsByActionKey,
        [action.key]: labels
      };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('failed to fetch labels', err);
    }
  }

  /** Compute the tri-state across the selected rows for a given
   * label uuid: 'all' if every selected row has it, 'some' if at
   * least one but not all do, 'none' otherwise. */
  private computeLabelState(labelUuid: string): 'none' | 'some' | 'all' {
    const selected = this.items.filter((item) =>
      this.selectedIds.has(this.rowId(item))
    );
    if (selected.length === 0) return 'none';
    const withLabel = selected.filter((item) =>
      ((item as any).labels || []).some((l: any) => l.uuid === labelUuid)
    );
    if (withLabel.length === 0) return 'none';
    if (withLabel.length === selected.length) return 'all';
    return 'some';
  }

  /** Toggle a label across the currently-selected rows. Mirrors
   * rapidpro's `labelObjectRows` semantics: if every selected row
   * already has the label, we're removing; otherwise we're adding.
   *
   * No optimistic local update — if the list is filtered (e.g. a
   * view showing only messages with this label), removing the label
   * means the row no longer belongs in the view, and the only
   * correct thing to do is re-fetch from the server and let the
   * filtered result decide which rows stay. We POST first, then
   * refresh once the server confirms. The `pendingLabel` state
   * blocks further toggles until the round-trip completes. */
  private async toggleLabel(label: any, state: string): Promise<void> {
    if (this.pendingLabel !== null) return;
    const add = state !== 'all';
    const originalSelectedIds = Array.from(this.selectedIds);
    this.pendingLabel = label.uuid;

    if (this.actionEndpoint) {
      // application/x-www-form-urlencoded matches what Django's
      // smartmin `BulkActionMixin` reads from `request.POST`, and
      // is trivial to parse server-side (URLSearchParams) without
      // pulling in a multipart parser for the demo mock.
      const params = new URLSearchParams();
      params.append('action', 'label');
      params.append('label', label.uuid);
      if (!add) params.append('add', 'false');
      originalSelectedIds.forEach((id) => params.append('objects', id));
      try {
        await postUrl(this.actionEndpoint, params);
        // Re-fetch the page so a filtered view (e.g. label-filter)
        // drops rows that no longer match.
        await this.fetchPage();
        // Re-check the ids we were operating on. Items that survived
        // the refresh stay selected; items the server filtered out
        // (label removed → no longer matches the view) are absent
        // from `this.items` and won't be re-selected. Mirrors
        // rapidpro's `recheckIds()` after a `spaPost`.
        this.recheckSelection(originalSelectedIds);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('label toggle POST failed', err);
      }
    }

    this.pendingLabel = null;

    this.fireCustomEvent(CustomEventType.BulkAction, {
      action: 'label',
      ids: originalSelectedIds,
      label: label.uuid,
      add
    });
  }

  /** Re-apply a selection set against the current `items`. Used
   * after a refresh that follows a bulk action — only ids whose
   * rows are still visible stay selected. */
  private recheckSelection(ids: string[]): void {
    const visible = new Set(this.items.map((i) => this.rowId(i)));
    this.selectedIds = new Set(ids.filter((id) => visible.has(id)));
  }

  private toggleSearch(): void {
    this.searchOpen = !this.searchOpen;
    if (!this.searchOpen && this.search) {
      this.clearSearch();
    }
  }

  private clearSearch(): void {
    this.search = '';
    this.page = 1;
    this.writeUrlState(true);
    this.fetchPage();
  }

  /** Render a status pill — convenience for subclasses. The
   * `kind` keys match the `.status-{kind}` classes defined in
   * ContentList styles (active / pending / stopped / archived /
   * warning / neutral / error). */
  protected renderStatusPill(kind: string, label: string): TemplateResult {
    return html`<span class="status-pill status-${kind}">${label}</span>`;
  }

  /** Optional leading icon name for each row (e.g. the campaign
   * clock-refresh in the styleguide). Override in subclasses;
   * return `null` to skip the leading-icon column entirely. */
  protected getRowIcon(_item: T): string | null {
    return null;
  }

  private renderHeader(): TemplateResult {
    const allIds = this.items.map((i) => this.rowId(i));
    const allSelected =
      allIds.length > 0 && allIds.every((id) => this.selectedIds.has(id));
    const someSelected = !allSelected && this.selectedIds.size > 0;
    // Reserve an empty leading-icon column in the header to align
    // with row icons. We probe a representative row — if any row
    // returns an icon, every row gets the column (skipped per-row
    // if its own getRowIcon returns null).
    const reservesIcon =
      this.items.length > 0 && this.getRowIcon(this.items[0]) !== null;

    return html`
      <div class="header">
        ${this.selectable
          ? html`
              <div class="check-cell" @click=${() => this.handleSelectAll()}>
                <temba-checkbox
                  size="1.1"
                  ?checked=${allSelected}
                  ?partial=${someSelected}
                ></temba-checkbox>
              </div>
            `
          : null}
        ${reservesIcon ? html`<div class="icon-cell"></div>` : null}
        ${this.columns.map((c) => this.renderHeaderCell(c))}
      </div>
    `;
  }

  private renderHeaderCell(column: ContentListColumn): TemplateResult {
    const style = this.columnStyle(column);
    const active = this.sort === column.key || this.sort === '-' + column.key;
    const desc = this.sort === '-' + column.key;
    // Only sortable columns get a click handler, the `sortable`
    // class (which paints the cursor + hover state), and the
    // direction icon. Non-sortable headers render as plain text.
    if (column.sortable) {
      return html`
        <div
          class="head-cell ${column.align || ''} sortable ${active
            ? 'active'
            : ''}"
          style=${style}
          @click=${() => this.handleSortClick(column)}
        >
          <span>${column.label ?? column.key}</span>
          <temba-icon
            name=${active ? (desc ? Icon.sort_down : Icon.sort_up) : Icon.sort}
            size="0.85"
          ></temba-icon>
        </div>
      `;
    }
    return html`
      <div class="head-cell ${column.align || ''}" style=${style}>
        <span>${column.label ?? column.key}</span>
      </div>
    `;
  }

  private columnStyle(column: ContentListColumn): string {
    const parts: string[] = [];
    if (column.width) {
      parts.push(`flex: ${column.grow ?? 0} 0 ${column.width}`);
    } else {
      parts.push(`flex: ${column.grow ?? 1} 1 0`);
    }
    return parts.join('; ');
  }

  private renderRow(item: T): TemplateResult {
    const id = this.rowId(item);
    const selected = this.selectedIds.has(id);
    const href = this.getRowHref(item);
    const icon = this.getRowIcon(item);
    return html`
      <div
        class="row ${selected ? 'selected' : ''} ${href ? 'clickable' : ''}"
        @click=${(e: MouseEvent) => this.handleRowClick(item, e)}
      >
        ${this.selectable
          ? html`
              <div
                class="check-cell"
                @click=${(e: MouseEvent) => {
                  // Cell-level click is the single source of truth
                  // for selection. The inner checkbox has
                  // pointer-events: none so it can't fire a second
                  // toggle on the same click.
                  e.stopPropagation();
                  this.handleRowToggle(item);
                }}
              >
                <temba-checkbox
                  size="1.1"
                  ?checked=${selected}
                ></temba-checkbox>
              </div>
            `
          : null}
        ${icon
          ? html`
              <div class="icon-cell">
                <temba-icon name=${icon} size="1"></temba-icon>
              </div>
            `
          : null}
        ${this.columns.map(
          (c) => html`
            <div class="cell ${c.align || ''}" style=${this.columnStyle(c)}>
              ${this.renderCell(item, c)}
            </div>
          `
        )}
      </div>
    `;
  }

  private renderFooter(): TemplateResult {
    const lastPage = Math.max(1, Math.ceil(this.total / this.pageSize));
    const first = this.total === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
    const last = Math.min(this.total, this.page * this.pageSize);
    return html`
      <div class="footer">
        <div class="status">
          ${this.total > 0 ? html`${first}&ndash;${last} of ${this.total}` : ''}
        </div>
        <div class="pager">
          <span
            class="page-btn"
            ?disabled=${this.page <= 1}
            @click=${() => this.handlePage(-1)}
            aria-label="Previous page"
          >
            <temba-icon name=${Icon.arrow_left} size="1"></temba-icon>
          </span>
          <span
            class="page-btn"
            ?disabled=${this.page >= lastPage}
            @click=${() => this.handlePage(1)}
            aria-label="Next page"
          >
            <temba-icon name=${Icon.arrow_right} size="1"></temba-icon>
          </span>
        </div>
      </div>
    `;
  }

  public render(): TemplateResult {
    return html`
      <div class="panel">
        ${this.renderTitlebar()}
        <div class="header-rule"></div>
        ${this.renderHeader()}
        ${this.loading && this.items.length === 0
          ? html`<div class="loading">Loading&hellip;</div>`
          : this.items.length === 0
            ? html`<div class="empty">${this.emptyMessage}</div>`
            : this.items.map((i) => this.renderRow(i))}
        ${this.renderFooter()}
      </div>
    `;
  }
}
