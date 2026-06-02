import { css, html, PropertyValues, TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { Icon } from '../Icons';
import { CustomEventType } from '../interfaces';
import { getUrl, postUrl } from '../utils';
import { designTokens } from '../styles/designTokens';
import { Dropdown } from '../display/Dropdown';

/** A single column in the list. Subclasses typically define a static
 * set via {@link ContentList.columns}; consumers may also set it as
 * an attribute / property for ad-hoc lists. */
export interface ContentListColumn {
  key: string;
  label?: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  /** Fixed column width (e.g. "150px"). Pins the column to an exact
   * size regardless of content. Most columns instead leave this
   * unset and size to their content within {@link minWidth} /
   * {@link maxWidth} bounds. */
  width?: string;
  /** Optional lower bound for a content-sized column (one with no
   * `width`). When unset the column floors at its own content —
   * typically the width of the header label. */
  minWidth?: string;
  /** Upper bound for a content-sized column (one with no `width`).
   * Defaults to "320px" — the column grows to fit its widest value
   * up to this cap, then ellipsis-truncates. */
  maxWidth?: string;
  /** Greedily absorb the leftover table width — the column's cell
   * stretches to fill the slack between the fixed/content-sized
   * columns, so it always reaches the card edge. At most one column
   * should set this; it stands in for the slack {@link spacer}, so
   * the spacer is skipped when a grow column is present. A `grow`
   * column ignores `maxWidth` but still honours `minWidth` as a
   * floor for when the table overflows. */
  grow?: boolean;
  /** Pin the column so it stays visible while the table scrolls
   * horizontally. `true` / `'left'` freezes it against the left
   * edge; `'right'` freezes it against the right edge. Left-pinned
   * columns must be contiguous from the first column; right-pinned
   * columns contiguous to the last. */
  pinned?: boolean | 'left' | 'right';
}

/** A bulk action surfaced in the toolbar when one or more rows are
 * selected. When {@link ContentList.actionEndpoint} is set the
 * component POSTs the action there directly and re-fetches the
 * current page so the user stays put — the `temba-bulk-action`
 * event then fires after the round-trip for consumers that need to
 * react (refresh a sidebar count, etc.). When `actionEndpoint` is
 * empty the component just fires the event and leaves the POST to
 * the host. The label-toggle action is a special case — when
 * `labelsEndpoint` is set, the component renders a dropdown of
 * label checkboxes and POSTs the apply/remove directly to
 * `actionEndpoint`, mirroring rapidpro's
 * `runActionOnObjectRows('label', …)` flow. */
export interface ContentListBulkAction {
  key: string;
  label: string;
  icon?: string;
  destructive?: boolean;
  /** When set, the component shows window.confirm(message) before
   * applying the action — used for destructive operations whose
   * wording is localized server-side. */
  confirm?: string;
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
        /* Flex column so the panel fills the host's height — when
           the host is given a bounded height (see fillWindow) the
           table scrolls internally instead of growing the page. */
        display: flex;
        flex-direction: column;
        min-height: 0;
        font-family: var(--font);
        color: var(--text-1);
        font-size: 13.5px;
        /* Fixed-width slot for a column's sort arrow. It is reserved
           on the inboard side of the label so the arrow never shifts
           the label, and the label stays flush with the column's
           values. */
        --sort-gutter: 16px;
        /* Selected-row wash — accent-50 on its own reads grey, so a
           touch of the accent-400 rail colour is mixed in to give
           the selection a faint accent tint. */
        --cl-selected: color-mix(
          in oklab,
          var(--accent-400) 9%,
          var(--accent-50)
        );
        /* The dividers bracketing a selected row — the plain grey
           --border reads as a seam against the wash, so this is the
           same accent pushed a little further. */
        --cl-selected-border: color-mix(
          in oklab,
          var(--accent-400) 24%,
          var(--accent-50)
        );
      }
      /* fillWindow — take the slack of a height-bounded flex-column
         parent so the table scrolls internally; min-height: 0 (set
         above) lets the host shrink enough for that scroll. */
      :host([fill-window]) {
        flex: 1 1 auto;
      }

      /* The header — title + content menu — is temba-page-header.
         The list slots its search / bulk-action controls into that
         header's actions area through this row. When rows are
         selected the search is replaced inline by bulk-action chips
         so the toolbar stays in the same spot visually. */
      .header-actions {
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
      .searchbar .clear,
      .searchbar .submit {
        cursor: pointer;
        color: var(--text-3);
        padding: 2px;
        display: inline-flex;
        align-items: center;
      }
      .searchbar .clear:hover,
      .searchbar .submit:hover {
        color: var(--text-1);
      }
      /* Result tally for the active search — quiet, trailing the
         input, so the user can confirm how many rows matched without
         the count competing with the query itself. */
      .searchbar .result-count {
        flex: 0 0 auto;
        color: var(--text-3);
        font-size: 12px;
        white-space: nowrap;
        padding: 0 4px;
      }

      /* Card panel — surface white wrapping the header and table.
         Soft shadow + radius gives it the contained-card feel from
         the styleguide. The 20px horizontal padding insets the
         header and table from the card edges. A flex column so the
         header stays put and the table region takes the slack —
         when the host is height-bounded the table scrolls inside it
         rather than growing the page. */
      .panel {
        background: var(--surface);
        border-radius: var(--r);
        overflow: hidden;
        box-shadow: var(--shadow-1);
        padding: 0 20px;
        flex: 1 1 auto;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }
      /* A window-filling list isn't a floating card — it fills its
         container flush, so it drops the card radius + shadow that
         would otherwise reveal the page background at its corners. */
      :host([fill-window]) .panel {
        border-radius: 0;
        box-shadow: none;
      }
      /* The header holds its size; the table frame takes the slack. */
      temba-page-header,
      .header-rule,
      .searchbar {
        flex: 0 0 auto;
      }

      /* Full-bleed rule between the titlebar/searchbar and the
         table. Negative horizontal margin escapes the panel's 20px
         padding so the line reaches the card chrome on both sides
         — the table itself (rows, lines, hover wash) stays inset. */
      .header-rule {
        height: 1px;
        background: var(--border);
        margin: 0 -20px;
      }

      /* Scroll frame — flexes to fill the panel's slack and is the
         positioning context for the right-edge scroll shadow. The
         negative margin escapes the panel's 20px panel padding so
         both the vertical scrollbar AND the right-pinned column ride
         the component's edge — .table-scroll deliberately carries no
         padding because position: sticky resolves offsets against
         the scroller's padding-box, and any padding here would leave
         a transparent gap where overflowing content shows through
         behind the pinned cell. The lead/trail inset comes from the
         first/last cell padding instead. The inner .table-scroll
         scrolls the table both ways (vertically within this frame,
         horizontally for overflow) so the header row and data rows
         scroll together as one table. */
      .table-frame {
        position: relative;
        flex: 1 1 auto;
        min-height: 0;
        /* Extend only the right side past the panel's 20px padding
           so the vertical scrollbar (and any right-pinned column)
           rides the card chrome instead of stranding whitespace
           between the bar and the panel edge. The left side stays
           within the panel padding so row dividers don't bleed full-
           width. */
        margin-right: -20px;
        /* Contain the sticky header's z-index inside this frame so it
           can't compete with the page header's content-menu dropdown
           (also z-index 2), which otherwise paints under the table
           header by DOM-order tie-break. */
        isolation: isolate;
      }
      .table-scroll {
        overflow: auto;
        height: 100%;
      }

      /* auto layout lets the contact-field columns size to the
         content shown in them; system columns are instead held to a
         fixed size by their .cell-inner width. width: 100% makes the
         table fill the card, then overflow once the fixed widths
         outgrow it — which is what arms the horizontal scroll. */
      table.table {
        width: 100%;
        border-collapse: collapse;
        table-layout: auto;
      }
      /* A fixed-layout list sizes every column up front, so the
         table is exactly its container width and never arms a
         horizontal scroll — overflowing cells truncate instead. The
         leading cells need an explicit width here, since the auto-
         layout shrink trick (width 1%) collapses them to nothing
         under fixed layout. */
      table.table.fixed {
        table-layout: fixed;
      }
      /* Just wide enough for the checkbox glyph (~15px); the cell's
         lead inset and trailing padding supply the breathing room
         on either side. Anything wider strands the checkbox in dead
         space ahead of column one. */
      table.table.fixed th.check-cell {
        width: 16px;
      }
      table.table.fixed th.icon-cell {
        width: 32px;
      }

      /* The header row sticks to the top of the scroll frame so the
         column labels stay put while the rows scroll under them.
         z-index 2 lifts it above the body; a pinned header cell
         needs 3 to also clear the body's pinned column (z-index 1). */
      tr.header th {
        height: 36px;
        vertical-align: middle;
        text-align: left;
        color: var(--text-3);
        font-size: 11px;
        font-weight: var(--w-medium);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        white-space: nowrap;
        background: var(--surface);
        border-bottom: 1px solid var(--border);
        position: sticky;
        top: 0;
        z-index: 2;
      }
      tr.header th.pinned {
        z-index: 3;
      }

      tr.row td {
        height: 44px;
        vertical-align: middle;
        color: var(--text-1);
        border-bottom: 1px solid var(--border);
      }
      tbody tr.row:last-child td {
        border-bottom: none;
      }
      tr.row:hover {
        background: var(--accent-50);
      }
      /* Selection — a light accent wash (--cl-selected) carrying a
         hint of the accent-400 rail colour so it reads clearly as
         accent rather than grey. The accent-400 leading rail (below)
         still sets a selected row apart from a hovered one. */
      tr.row.selected {
        background: var(--cl-selected);
      }
      /* Recolour the dividers that bracket a selected row — its own
         bottom border and the bottom border of the row above it —
         so the grey row seam doesn't cut across the accent wash.
         Between two adjacent selected rows both rules agree. */
      tr.row.selected td,
      tr.row:has(+ tr.row.selected) td {
        border-bottom-color: var(--cl-selected-border);
      }
      /* Grey pills (label / neutral / keyword variants) border off
         --pill-border; setting it on a selected row's cells retints
         those borders to the same colour as the row dividers. The
         custom property inherits into the pill's shadow DOM, where
         --border itself is re-declared and so can't be overridden. */
      tr.row.selected td {
        --pill-border: var(--cl-selected-border);
      }
      /* Solid accent-400 rail down the row's leading edge — the
         design system's "active rail" selection affordance. Drawn
         as a ::before on the first cell so it never competes with
         the pinned cells' own box-shadow divider; bottom: -1px
         bridges the row border so a run of selected rows reads as
         one continuous rail. */
      tr.row.selected td:first-child::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: -1px;
        width: 3px;
        background: var(--accent-400);
      }
      /* A pinned first cell is position: sticky and already a
         containing block for the rail; an unpinned one needs an
         explicit positioning context. */
      tr.row td:first-child:not(.pinned) {
        position: relative;
      }
      tr.row.clickable {
        cursor: pointer;
      }

      .head-cell,
      .cell {
        padding: 0 8px;
      }

      /* The inner wrapper carries each column's width contract: a
         fixed width for system columns, a max-width cap for the
         content-fit field columns. overflow/ellipsis keeps a long
         value from blowing the column out. */
      .cell-inner {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      /* Right-aligned values sit flush against the column edge; the
         header label matches because its sort slot is inboard (left
         of the label), not between the label and the edge. */
      .cell.right .cell-inner {
        margin-left: auto;
        text-align: right;
      }
      .cell.center .cell-inner {
        margin-left: auto;
        margin-right: auto;
        text-align: center;
      }
      /* No gap between label and sort slot — the slot's fixed width
         is the whole gutter, which keeps the header-to-content
         alignment math down to a single value. */
      .head-inner {
        display: flex;
        align-items: center;
        gap: 0;
        overflow: hidden;
      }
      /* The label never shrinks — its full width becomes the
         column's minimum, so a header is never truncated and a
         content-sized column is always at least as wide as its
         name. */
      .head-inner .label {
        flex: 0 0 auto;
        white-space: nowrap;
      }
      .head-cell.right .head-inner {
        margin-left: auto;
        justify-content: flex-end;
      }
      .head-cell.center .head-inner {
        margin-left: auto;
        margin-right: auto;
        justify-content: center;
      }

      /* Pinned columns stay fixed against their edge while the rest
         of the table scrolls under them. The frozen-region look —
         the tint and the divider — only kicks in once the table
         actually overflows (.overflowing); until then a pinned
         column is indistinguishable from a plain one. */
      th.pinned,
      td.pinned {
        position: sticky;
        z-index: 1;
      }
      /* A faint tint sets the frozen region apart as its own sub-
         panel — and, being opaque, stops scrolled content bleeding
         through. The header/row selectors out-specify the plain
         cell backgrounds so the tint actually lands. */
      .table-frame.overflowing tr.header th.pinned,
      .table-frame.overflowing tr.row td.pinned {
        background: color-mix(in oklab, var(--sunken) 35%, var(--surface));
      }
      /* The hover/selected wash still wins over the tint so a
         hovered/selected row reads as one continuous strip. */
      .table-frame.overflowing tr.row:hover td.pinned {
        background: var(--accent-50);
      }
      .table-frame.overflowing tr.row.selected td.pinned {
        background: var(--cl-selected);
      }
      /* A subtle vertical rule marks where the pinned section ends.
         It is an inset shadow rather than a border so it stays put
         with the sticky cell under border-collapse. */
      .table-frame.overflowing th.pin-last,
      .table-frame.overflowing td.pin-last {
        box-shadow: inset -1px 0 0 0 var(--border);
      }
      /* Once scrolled, a soft drop shadow joins the rule to lift the
         frozen edge above the content sliding under it. */
      .table-frame.scrolled th.pin-last,
      .table-frame.scrolled td.pin-last {
        box-shadow:
          inset -1px 0 0 0 var(--border),
          8px 0 9px -9px rgba(15, 23, 42, 0.45);
      }
      /* Mirror of the rule for the right-pinned group — the divider
         sits on the inboard (left) edge of its first cell. */
      .table-frame.overflowing th.pin-first,
      .table-frame.overflowing td.pin-first {
        box-shadow: inset 1px 0 0 0 var(--border);
      }
      /* While there is more table to the right, a drop shadow lifts
         the right-frozen edge above the content sliding under it. */
      .table-frame.can-scroll-right th.pin-first,
      .table-frame.can-scroll-right td.pin-first {
        box-shadow:
          inset 1px 0 0 0 var(--border),
          -8px 0 9px -9px rgba(15, 23, 42, 0.45);
      }

      /* Slack-absorbing column between the pinned and scrolling
         sections — width: 100% makes it greedily take all leftover
         table width, so extra space pools here as a gap instead of
         stretching the real columns. It collapses to nothing once
         the columns outgrow the viewport and the table scrolls. */
      .spacer {
        width: 100%;
        padding: 0;
      }

      /* A 'grow' column does the spacer's job inline — width: 100%
         makes its cell pool the leftover table width so the column
         stretches to the card edge. It collapses back toward its
         content (held at minWidth) once the table overflows. */
      th.grow,
      td.grow {
        width: 100%;
      }

      /* Scroll gradient — fades in while there is more table to the
         right, signalling the row scrolls horizontally. It sits
         against the inboard edge of the right-pinned group (via
         --cl-rpin-total, 0 when nothing is right-pinned) so it fades
         the scrolling content just before it slides under the
         frozen columns, rather than behind them, and stops short of
         the horizontal scrollbar (via --cl-scrollbar).
         pointer-events: none keeps it from eating row clicks. */
      .scroll-shadow {
        position: absolute;
        top: 0;
        bottom: var(--cl-scrollbar, 0px);
        right: var(--cl-rpin-total, 0px);
        width: 28px;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.15s ease;
        background: linear-gradient(
          to right,
          transparent,
          color-mix(in oklab, var(--text-1) 16%, transparent)
        );
      }
      .table-frame.can-scroll-right .scroll-shadow {
        opacity: 1;
      }

      /* Checkbox column — shrink-to-fit (width: 1% is the table-
         cell trick for that). The cell-level @click owns selection;
         the inner checkbox is display-only (pointer-events: none)
         so it can't double-fire on the same click. temba-checkbox
         sizes its icon in em, so .check-inner pins the font-size to
         keep header + row checkboxes the same visual scale. */
      .check-cell {
        width: 1%;
        white-space: nowrap;
        padding: 0 12px;
        cursor: pointer;
        --icon-color: var(--text-3);
      }
      .check-inner {
        display: flex;
        align-items: center;
        font-size: 13.5px;
      }
      .check-cell temba-checkbox {
        pointer-events: none;
      }
      tr.row.selected .check-cell {
        --icon-color: var(--accent-700);
      }

      .head-cell.sortable {
        cursor: pointer;
        user-select: none;
      }
      .head-cell.sortable:hover {
        color: var(--text-2);
      }
      /* The sort arrow trails the label in a fixed-width slot. The
         slot is reserved whenever a column is sortable or right-
         aligned, so the label never shifts when the arrow appears
         and the gutter math holds. The arrow itself is invisible
         until the column is the active sort — or, for an inactive
         sortable column, while its header is hovered. */
      .sort-slot {
        flex: 0 0 var(--sort-gutter);
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .sort-icon {
        --icon-color: var(--text-3);
        opacity: 0;
        transition: opacity 0.12s ease;
      }
      .head-cell.sortable:hover .sort-icon {
        opacity: 0.55;
      }
      .head-cell.sortable.active .sort-icon {
        --icon-color: var(--accent-700);
        opacity: 1;
      }
      .head-cell.sortable.active {
        color: var(--accent-700);
      }

      /* Leading entity-type icon column — small icon shared by
         every row (contact silhouette, flow type icon, etc.).
         Subclasses override {@link getRowIcon}; when it returns
         null for every row the column is never rendered. */
      .icon-cell {
        width: 1%;
        white-space: nowrap;
        padding: 0 6px 0 0;
        --icon-color: var(--text-3);
      }
      /* Reserve the icon's footprint on the wrapper itself so the
         icon column's intrinsic width is the same whether
         <temba-icon> has upgraded or not — without this, the column
         briefly measures as just the cell's right-padding (6px) and
         the downstream pinned columns end up positioned ~14px to
         the left, which races with whatever moment we snapshot.
         <temba-icon size="1"> renders at 1em, so we reserve 1em
         square and let the icon paint into it. */
      .icon-inner {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1em;
        height: 1em;
      }
      tr.row.selected .icon-cell {
        --icon-color: var(--accent-700);
      }

      /* The table-frame sits inside the panel's 20px padding, so the
         first cell already starts at the page-header's content edge
         — no extra lead inset needed. The last cell still trims its
         padding-right (below) so column content doesn't crowd the
         card chrome. */
      /* The first data cell trims its left padding to sit close to
         the leading icon — the icon cell's 6px trailing padding
         plus this 4px makes a snug 10px gap. */
      .icon-cell + .head-cell,
      .icon-cell + .cell {
        padding-left: 4px;
      }
      /* With no icon column the first data cell follows the
         checkbox directly; it drops its left padding entirely so
         the value isn't marooned past a gap meant to clear an
         icon — just the checkbox cell's 12px trailing padding. */
      .check-cell + .head-cell,
      .check-cell + .cell {
        padding-left: 0;
      }
      tr.header th:last-child,
      tr.row td:last-child {
        padding-right: 20px;
      }

      .empty,
      .loading {
        padding: 40px var(--pad);
        text-align: center;
        color: var(--text-3);
      }

      /* Pager — a compact "‹ 1–N of Total ›" stepper that lives in
         the header's actions cluster: chevron-only paging buttons
         bracketing a plain count, no borders or labels, matching the
         quiet Search action it sits beside. */
      .pager {
        display: flex;
        align-items: center;
        gap: 2px;
      }
      .pager-status {
        padding: 0 4px;
        color: var(--text-3);
        font-size: 12.5px;
        white-space: nowrap;
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

  /** JSON endpoint URL. The component appends `sort` and `search`
   * params. Two pagination shapes are supported, picked per
   * response: a page-counted list — `{ results, count }`, navigated
   * by appending `page` — or a cursor list — `{ results, next,
   * previous }` with no `count`, navigated by following the opaque
   * `next` / `previous` URLs (rapidpro's `CursorPagination`). */
  @property({ type: String })
  endpoint: string;

  /** Endpoint for the page's content menu. Passed straight through
   * to the embedded {@link PageHeader}, which fetches it and renders
   * the menu's action buttons + overflow in the list header — so the
   * list header doubles as the page header instead of the page
   * chrome carrying a separate title + menu bar. */
  @property({ type: String, attribute: 'content-menu-endpoint' })
  contentMenuEndpoint = '';

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

  /** Enables the multi-select checkbox column. The column only
   * actually renders when this is true AND {@link bulkActions} has
   * entries — a list with no bulk actions has nothing for selection
   * to drive, so checkboxes would just take up space. See
   * {@link hasCheckboxes}. */
  @property({ type: Boolean })
  selectable = true;

  /** Whether the selection column actually renders — true only when
   * the list is `selectable` AND has at least one bulk action. */
  protected get hasCheckboxes(): boolean {
    return this.selectable && this.bulkActions.length > 0;
  }

  /** When true, the table uses a fixed layout: every column is
   * sized up front (from each column's `width`, with the `grow`
   * column taking the remainder), so a cell whose content doesn't
   * fit ellipsis-truncates rather than stretching its column.
   * Intended for lists whose columns are all `width`-set or `grow`.
   * Pair with {@link minTableWidth} to allow a horizontal scroll
   * once the container is too narrow for those column shares. */
  @property({ type: Boolean, attribute: 'fixed-layout' })
  fixedLayout = false;

  /** Minimum table width (e.g. "640px"). The table won't shrink
   * below it — once the container is narrower, the list scrolls
   * horizontally instead. With {@link fixedLayout} this is what
   * lets the table scroll at all: fixed layout keeps each column's
   * share stable and truncates overflow, and this floor decides
   * when that share stops shrinking and the scroll takes over. */
  @property({ type: String, attribute: 'min-table-width' })
  minTableWidth = '';

  /** When true, the list grows to fill its container — the table
   * body scrolls inside it rather than the page. The host's parent
   * must be a height-bounded flex column (the list takes the slack
   * via `flex: 1`); anything below the list in that column, such as
   * a page footer, stays visible. Off by default; a full-page list
   * (e.g. the inbox) opts in. */
  @property({ type: Boolean, attribute: 'fill-window' })
  fillWindow = false;

  /** When true, sort/search/page state is reflected to the URL via
   * `history.pushState` so the page is deep-linkable and back/forward
   * navigates between list states. Off by default — opt in. */
  @property({ type: Boolean })
  urlState = false;

  /** Prefix for URL parameter names — set this when multiple lists
   * share a page (e.g. `messages` → `?messages_page=2&messages_sort=...`). */
  @property({ type: String })
  urlParamPrefix = '';

  /** Key under which restorable list state (page, sort, search) is
   * stashed in the browser's history entry — set this to opt into
   * history-state restoration without touching the URL. On every
   * user-driven page/sort/search change the list fires a
   * `temba-history-change` event carrying `{key, state, replace}`;
   * the host (e.g. an SPA frame) is expected to merge `state` into
   * the current history entry and either `pushState` (when
   * `replace` is false — paging, sort, committed search) or
   * `replaceState` (when `replace` is true — typing in the search
   * box, or other no-history-entry updates). On mount the list
   * reads back `history.state?.[key]` and resumes from those values
   * before its initial fetch, and an in-list `popstate` re-reads
   * the active entry and re-fetches so back/forward navigates
   * between the user's page/sort/search states. Picks one slot per
   * list, so multiple lists on a page coexist by using distinct
   * keys. */
  @property({ type: String, attribute: 'history-state-key' })
  historyStateKey = '';

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

  /** Whether the last response carried a server `count`. Distinct
   * from {@link total} because cursor lists fall back to the visible
   * page length so the empty-state math still works — only an actual
   * server count is reliable enough to surface in the UI (e.g. the
   * search result indicator). */
  @state()
  protected hasCount = false;

  @state()
  protected page = 1;

  /** Whether the last response was a cursor list. Detected from the
   * shape of `next` / `previous` (a `cursor=` query param marks DRF
   * CursorPagination) so the mode survives a count being returned
   * alongside cursor URLs — a searched cursor endpoint may include
   * `count` for the result indicator without abandoning cursor
   * navigation. Falls back to count-absent on single-page responses
   * where neither nav URL is set. In cursor mode the pager follows
   * {@link nextCursor} / {@link prevCursor} instead of computing
   * page numbers off {@link total}. */
  @state()
  protected cursorMode = false;

  /** Same-origin path+query of the cursor list's `next` page, or ''
   * when there is none. Only meaningful in {@link cursorMode}. */
  @state()
  protected nextCursor = '';

  /** Same-origin path+query of the cursor list's `previous` page, or
   * '' when there is none. Only meaningful in {@link cursorMode}. */
  @state()
  protected prevCursor = '';

  /** URL of the most recent fetch — re-requested by {@link refresh}
   * (and after a bulk action) so a cursor list stays on its current
   * page rather than snapping back to the first. */
  private currentUrl = '';

  /** URL to fetch on the next initial-fetch pass, lifted from the
   * host's `history.state` by {@link readHistoryState}. Lets a
   * cursor-paginated list resume on the exact slice the user was on
   * (cursor URLs are opaque, so reconstructing them from page/sort
   * isn't possible). Cleared after use. */
  private restoreUrl = '';

  /** Sort key; prefix with `-` for descending. Empty = server default. */
  @state()
  protected sort = '';

  @state()
  protected search = '';

  @state()
  protected loading = false;

  @state()
  protected searching = false;

  @state()
  protected selectedIds: Set<string> = new Set();

  /** Whether the inline search input is expanded. The "Search"
   * action button toggles it; the styleguide hides the input until
   * the user asks for it so the toolbar stays clean. */
  @state()
  protected searchOpen = false;

  /** Uncommitted input text — what's in the textbox while the user
   * is typing. Distinct from {@link search}, which is the committed
   * query that drives the fetch; the draft is only promoted to
   * `search` when the user presses Enter or clicks the search icon.
   * Bound to the input's `.value` so re-renders preserve typing. */
  @state()
  protected searchDraft = '';

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
  private popstateHandler: () => void;
  private resizeHandler: () => void;

  /** Pin index assigned to each left-pinned column / leading cell,
   * used to resolve its sticky `left`. Recomputed each render. */
  private pinIndexByColumn = new Map<ContentListColumn, number>();
  /** Pin index assigned to each right-pinned column, counted from
   * the right edge (0 = rightmost), used to resolve its sticky
   * `right`. Recomputed each render. */
  private rightPinIndexByColumn = new Map<ContentListColumn, number>();
  private checkPinIndex = -1;
  private iconPinIndex = -1;
  private lastPinIndex = -1;
  /** Right-pin index of the leftmost right-pinned column — the one
   * that carries the divider against the scrolling section. */
  private firstRightPinIndex = -1;
  /** Column index after which the slack-absorbing spacer cell is
   * rendered (the last pinned column), or -1 when nothing is
   * pinned. Extra table width pools in that spacer. */
  private spacerAfterIndex = -1;
  /** Whether the current items reserve a leading-icon column. */
  private reservesIcon = false;

  constructor() {
    super();
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
    } else if (this.historyStateKey) {
      // Restore from the host SPA's history entry on mount so the
      // list resumes on whatever page it was on the last time the
      // user was here — works in tandem with the host's
      // `temba-history-change` listener (which pushes a new entry
      // for paging/sort/committed-search and replaces in place for
      // search-typing, per the event's `replace` flag). The
      // popstate handler covers in-list back/forward, where the
      // URL doesn't change so the SPA frame doesn't remount the
      // list — we re-read state from the active entry and re-fetch
      // ourselves. Cross-URL back navigation still goes through
      // the SPA frame and remounts a fresh list, which then reads
      // state on mount.
      this.readHistoryState();
      this.popstateHandler = () => {
        this.readHistoryState();
        const restore = this.restoreUrl;
        this.restoreUrl = '';
        this.fetchPage(restore || undefined);
      };
      window.addEventListener('popstate', this.popstateHandler);
    }
    // A viewport resize changes whether the table overflows, so the
    // right-edge scroll affordance has to be re-evaluated.
    this.resizeHandler = () => this.syncScrollAffordance();
    window.addEventListener('resize', this.resizeHandler);
    // Pinned columns now size to their content, so a late web-font
    // load shifts their widths — re-measure the sticky offsets once
    // fonts settle so the pinned cells don't drift out of alignment.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        this.measurePinOffsets();
        this.syncScrollAffordance();
      });
    }
  }

  public disconnectedCallback(): void {
    if (this.popstateHandler) {
      window.removeEventListener('popstate', this.popstateHandler);
    }
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    if (this.pending) {
      // Null the pending pointer before aborting so fetchPage's
      // finally block — which gates cleanup on `this.pending ===
      // controller` — skips firing FetchComplete on a disconnected
      // component.
      const controller = this.pending;
      this.pending = null;
      controller.abort();
    }
    super.disconnectedCallback();
  }

  protected updated(changes: PropertyValues): void {
    super.updated(changes);
    // Only watch endpoint and refreshKey here — both are typically
    // set externally and have no other handler that already fires a
    // fetch. Sort/page/search are mutated by internal handlers that
    // call fetchPage themselves, so tracking them here would
    // double-fire the request.
    if (
      (changes.has('endpoint') || changes.has('refreshKey')) &&
      this.endpoint
    ) {
      // If readHistoryState staged a restoreUrl, the first fetch
      // follows that URL so a cursor list lands on the saved slice.
      // Clear it so subsequent fetches use the live state.
      const restore = this.restoreUrl;
      this.restoreUrl = '';
      this.fetchPage(restore || undefined);
    }
    // Pinned-column offsets and the scroll affordances both depend
    // on the freshly-laid-out DOM, so settle them after each render.
    this.measurePinOffsets();
    this.syncScrollAffordance();
  }

  /** Read sort/page/search from the URL on first load / popstate. */
  private readUrlState(): void {
    const params = new URLSearchParams(window.location.search);
    const k = (name: string) =>
      this.urlParamPrefix ? `${this.urlParamPrefix}_${name}` : name;
    const previousSearch = this.search;
    this.search = params.get(k('search')) || '';
    this.sort = params.get(k('sort')) || '';
    const pageParam = parseInt(params.get(k('page')) || '1', 10);
    this.page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    // Reveal the search input when the URL carries an active query —
    // see readHistoryState for the equivalent treatment. The
    // close-on-empty branch only fires when the navigation actually
    // cleared a prior search; an unrelated popstate that arrives
    // while the user has the searchbar open and is mid-typing must
    // not slam their draft.
    if (this.search) {
      this.searchOpen = true;
      this.searchDraft = this.search;
    } else if (previousSearch) {
      this.searchOpen = false;
      this.searchDraft = '';
    }
  }

  /** Push current sort/page/search to the URL and/or bubble it up
   * to the host for stashing in history.state — call this on every
   * user-driven page/sort/search change. `replace` is true while the
   * user is typing in the search box (don't pollute history). */
  private writeUrlState(replace = false): void {
    this.bubbleHistoryState(replace);
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

  /** Read saved list state out of the host's history entry under
   * {@link historyStateKey}. Mirrors {@link readUrlState} but pulls
   * from `history.state` rather than the query string. The `url`
   * field, when present, is the cursor-or-page URL of the slice the
   * user was on — staged in {@link restoreUrl} so the very next
   * fetch follows it (the only way to land on a specific slice of a
   * cursor-paginated list, whose pages have no numeric identifier). */
  private readHistoryState(): void {
    const key = this.historyStateKey;
    if (!key) return;
    const stash = (window.history.state || {})[key] || {};
    const previousSearch = this.search;
    this.search = typeof stash.search === 'string' ? stash.search : '';
    this.sort = typeof stash.sort === 'string' ? stash.sort : '';
    const p = parseInt(stash.page, 10);
    this.page = isNaN(p) || p < 1 ? 1 : p;
    this.restoreUrl = typeof stash.url === 'string' ? stash.url : '';
    // A restored search needs visible affordance — open the search
    // bar and seed the draft so the user sees the active query and
    // can edit or clear it without having to click the search
    // toggle and discover the term was retained. Only auto-close on
    // empty when the navigation actually cleared a prior search, so
    // an unrelated popstate that arrives while the user is mid-
    // typing doesn't slam their draft.
    if (this.search) {
      this.searchOpen = true;
      this.searchDraft = this.search;
    } else if (previousSearch) {
      this.searchOpen = false;
      this.searchDraft = '';
    }
  }

  /** Bubble the current page/sort/search/url up to the host so it
   * can stash them in the active history entry. The `url` field
   * carries `currentUrl` (the URL of the most recent successful
   * fetch) — page-mode lists can rebuild that from page/sort/search,
   * but cursor-mode lists rely on it to land on the exact slice the
   * user was on. `replace` tells the host whether this change should
   * create a new back-history entry (false — paging, sort,
   * committed search) or overwrite the current one (true — typing
   * in the search box, cursor-page snap-back). The component never
   * touches `history` itself in this mode — that keeps the host's
   * SPA navigation in charge of history mutations and lets multiple
   * lists on a page coexist under distinct {@link historyStateKey}s. */
  private bubbleHistoryState(replace: boolean): void {
    if (!this.historyStateKey) return;
    // For a page-mode list, page/sort/search are enough — the
    // initial fetch on restore rebuilds the request URL from them.
    // For a cursor list, page numbers are meaningless, so we also
    // stash the most recent cursor URL (set synchronously by
    // fetchPage(target)) so restore can land on the exact slice.
    const state: Record<string, any> = {
      page: this.page,
      sort: this.sort,
      search: this.search
    };
    if (this.cursorMode && this.currentUrl) {
      state.url = this.currentUrl;
    }
    this.fireCustomEvent(CustomEventType.HistoryChange, {
      key: this.historyStateKey,
      state,
      replace
    });
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

  /** Tell a cursor list from a page-counted one by inspecting the
   * server's nav URLs. DRF CursorPagination always emits a `cursor=`
   * query param; PageNumberPagination uses `page=`. A response that
   * carries `count` alongside cursor URLs — e.g. a searched cursor
   * endpoint that returns a result tally for the UI indicator — must
   * still be navigated by following the cursor URLs, so we can't use
   * count presence alone. Falls back to the count-absent heuristic
   * for single-page responses where neither nav URL is populated. */
  private detectCursorMode(data: FetchResponse<T>): boolean {
    const hasCursor = (raw: string | undefined | null): boolean => {
      if (!raw) return false;
      try {
        return new URL(raw, window.location.origin).searchParams.has('cursor');
      } catch {
        return false;
      }
    };
    if (hasCursor(data.next) || hasCursor(data.previous)) return true;
    return data.count == null;
  }

  /** Reduce a cursor `next` / `previous` URL — which the server
   * returns absolute — to a same-origin path+query for `getUrl`.
   * A cross-origin URL is rejected (returns '') so a malformed
   * response can't redirect the fetch off-site. */
  private toRequestUrl(raw: string): string {
    try {
      const url = new URL(raw, window.location.origin);
      if (url.origin !== window.location.origin) return '';
      return url.pathname + url.search;
    } catch {
      return '';
    }
  }

  /** Fetch a page. With no argument this builds a fresh request from
   * the endpoint + current sort/search/page (resetting a cursor list
   * to its first page); pass an explicit `url` to follow a cursor or
   * to re-request {@link currentUrl}. */
  private async fetchPage(url?: string): Promise<void> {
    if (!this.endpoint) return;
    if (this.pending) this.pending.abort();
    const controller = new AbortController();
    this.pending = controller;
    this.loading = true;
    const requestUrl = url || this.buildRequestUrl();
    this.currentUrl = requestUrl;
    try {
      const response = await getUrl(requestUrl, controller);
      const data = (response.json || {}) as FetchResponse<T>;
      this.items = data.results || [];
      this.nextCursor = data.next ? this.toRequestUrl(data.next) : '';
      this.prevCursor = data.previous ? this.toRequestUrl(data.previous) : '';
      // Cursor mode is detected from the shape of next/previous,
      // not the absence of `count` — a cursor endpoint may include
      // `count` (e.g. during search) without switching to page-mode
      // navigation. See {@link detectCursorMode}.
      this.cursorMode = this.detectCursorMode(data);
      this.hasCount = data.count != null;
      this.total = data.count ?? this.items.length;
      // A cursor endpoint has no way to honor `?page=N` on first
      // load, so a hard refresh that lands with a stale synthetic
      // page param would leave the URL out of sync with what the
      // server actually returned (the first slice). Snap the
      // synthetic page back to 1 and rewrite the URL in place.
      if (this.cursorMode && !this.prevCursor && this.page !== 1) {
        this.page = 1;
        this.writeUrlState(true);
      }
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
        this.searching = false;
        this.fireCustomEvent(CustomEventType.FetchComplete);
      }
    }
  }

  /** Public API — programmatic refresh, mirrors `refreshKey` bump.
   * Re-requests the current page (cursor lists included) rather than
   * resetting to the first. */
  public refresh(): void {
    this.fetchPage(this.currentUrl || undefined);
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

  /** Update the uncommitted input value as the user types. The
   * fetch is deferred until the user submits (Enter / search-icon
   * click) so we don't pound the server on every keystroke. */
  private handleSearchInput(event: any): void {
    this.searchDraft = event.target.value || '';
  }

  /** Commit on Enter; let other keys through. Escape clears the
   * draft (so the user can bail without firing a search). */
  private handleSearchKey(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commitSearch();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (this.searchDraft && this.searchDraft !== this.search) {
        // Discard the in-progress draft, leaving the committed
        // search alone — a quick way out without altering results.
        this.searchDraft = this.search;
      }
    }
  }

  /** Promote the input's draft to the committed search and fetch.
   * fetchPage runs first so currentUrl reflects the new search before
   * the state bubbles — bubbling first would stash the pre-search URL
   * and break history restoration on the way back. Pushes a new
   * history entry so the prior search (or unsearched view) is one
   * "back" away, matching paging and sort semantics. */
  private commitSearch(): void {
    if (this.search === this.searchDraft) return;
    this.search = this.searchDraft;
    this.page = 1;
    this.searching = true;
    this.fetchPage();
    this.writeUrlState();
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
    // fetchPage first so currentUrl reflects the new sort before the
    // state bubbles — see commitSearch for the full reasoning.
    this.fetchPage();
    this.writeUrlState();
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
      // Meta/ctrl-click opens a new tab, matching ordinary links.
      if (event.metaKey || event.ctrlKey) {
        window.open(href, '_blank');
        return;
      }
      // Fire Redirected rather than assigning window.location so the
      // host SPA frame swaps content in place instead of doing a full
      // page reload — the frame listens for this event on document and
      // routes it through its in-app loader.
      this.fireCustomEvent(CustomEventType.Redirected, { url: href });
    }
  }

  /** Guard against open-redirect: row hrefs come from JSON-driven
   * subclasses and could contain externally-influenced values. Only
   * permit same-origin navigation — absolute URLs must match the
   * current origin, relative URLs must be path-only (starting with
   * `/` and not `//`, which would be protocol-relative). */
  protected isSafeHref(href: string): boolean {
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

  /** Run a non-label bulk action. With an `actionEndpoint` set, POST
   * the action server-side (form-encoded to match smartmin's
   * `BulkActionMixin`), then re-fetch the current page so the user
   * stays where they were — rather than letting the host trigger a
   * full SPA page replacement that drops them back to page 1. With
   * no `actionEndpoint`, just fire the event for the host to
   * handle. Destructive actions can carry a `confirm` string for a
   * window.confirm() prompt (text comes from the host so it can be
   * localized). The event fires after the POST/refresh so a host
   * sidebar can refresh counts when notified. */
  private async handleBulkAction(action: ContentListBulkAction): Promise<void> {
    if (action.confirm && !window.confirm(action.confirm)) return;

    const ids = Array.from(this.selectedIds);

    if (this.actionEndpoint) {
      const params = new URLSearchParams();
      params.append('action', action.key);
      ids.forEach((id) => params.append('objects', id));
      try {
        await postUrl(this.actionEndpoint, params);
        // Re-request the current page so a filtered view (e.g.
        // archive removes rows from inbox) drops the acted-on rows,
        // staying on the user's page rather than resetting to one.
        await this.fetchPage(this.currentUrl || undefined);
        // Drop selection for any ids the server filtered out of the
        // refreshed view; survivors stay selected.
        this.recheckSelection(ids);
        // Only fire after the server confirms — a failed POST
        // shouldn't trigger consumers to refresh based on a
        // non-event.
        this.fireCustomEvent(CustomEventType.BulkAction, {
          action: action.key,
          ids
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('bulk action POST failed', err);
      }
    } else {
      // No server round-trip — leave the action entirely up to the
      // host and let it know.
      this.fireCustomEvent(CustomEventType.BulkAction, {
        action: action.key,
        ids
      });
    }
  }

  private handlePage(delta: number): void {
    // A cursor list has no page numbers — step by following the
    // opaque next/previous URL the last response handed back. Call
    // fetchPage first so currentUrl is updated synchronously, then
    // bubble state so the saved URL points at the new view. The
    // synthetic page number is bumped only to give each history entry
    // a distinct URL; the cursor URL stashed in history.state is what
    // actually drives restoration.
    if (this.cursorMode) {
      const target = delta > 0 ? this.nextCursor : this.prevCursor;
      if (target) {
        this.page = Math.max(1, this.page + delta);
        this.fetchPage(target);
        this.writeUrlState();
      }
      return;
    }
    const lastPage = Math.max(1, Math.ceil(this.total / this.pageSize));
    const next = Math.min(lastPage, Math.max(1, this.page + delta));
    if (next !== this.page) {
      this.page = next;
      this.fetchPage();
      this.writeUrlState();
    }
  }

  private renderTitlebar(): TemplateResult {
    const selectionCount = this.selectedIds.size;
    const bulkVisible = selectionCount > 0 && this.bulkActions.length > 0;
    const hasSubtitle =
      this.subtitle || this.querySelector('[slot="subtitle"]');
    const resultCount = `${this.total} ${this.total === 1 ? 'result' : 'results'}`;
    // The header — title + content menu — is temba-page-header. The
    // list forwards its own title/subtitle slots into it and slots
    // its search / bulk-action controls into the header's actions
    // area, so the list and a plain page share one header.
    return html`
      <temba-page-header
        content-menu-endpoint=${this.contentMenuEndpoint}
        ?hide-menu=${bulkVisible}
      >
        <slot name="title" slot="title">${this.listTitle}</slot>
        ${hasSubtitle
          ? html`<slot name="subtitle" slot="subtitle">${this.subtitle}</slot>`
          : null}
        <div slot="actions" class="header-actions">
          ${bulkVisible
            ? html`
                <span class="bulk-count">${selectionCount} selected</span>
                ${this.bulkActions.map((a) => this.renderBulkAction(a))}
              `
            : html`
                ${this.renderPager()}
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
      </temba-page-header>
      ${this.searchable && this.searchOpen
        ? html`
            <div class="searchbar">
              <span
                class="submit"
                title="Search"
                aria-label="Search"
                @click=${() => this.commitSearch()}
              >
                <temba-icon name=${Icon.search} size="0.95"></temba-icon>
              </span>
              <input
                type="text"
                placeholder=${this.searchPlaceholder}
                .value=${this.searchDraft}
                @input=${this.handleSearchInput}
                @keydown=${this.handleSearchKey}
              />
              ${this.search && this.hasCount && !this.loading
                ? html`<span class="result-count">${resultCount}</span>`
                : null}
              <span
                class="clear"
                title="Close search"
                aria-label="Close search"
                @click=${() => this.toggleSearch()}
              >
                <temba-icon name=${Icon.close} size="0.85"></temba-icon>
              </span>
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
        data-action-key=${action.key}
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
            : labels.map((label) => this.renderLabelOption(label, action))}
        </div>
      </temba-dropdown>
    `;
  }

  private renderLabelOption(
    label: any,
    action: ContentListBulkAction
  ): TemplateResult {
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
          this.toggleLabel(label, state, action.key);
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
  private async toggleLabel(
    label: any,
    state: string,
    actionKey: string
  ): Promise<void> {
    if (this.pendingLabel !== null) return;
    const add = state !== 'all';
    const originalSelectedIds = Array.from(this.selectedIds);
    this.pendingLabel = label.uuid;
    try {
      // Close just the dropdown for the action that fired — other
      // label dropdowns in the toolbar (e.g. a separate "labels"
      // grouping) stay in whatever state the user left them.
      // `actionKey` is a consumer-supplied public-API field, so
      // CSS.escape() keeps a key containing `"` or `\` from throwing
      // SyntaxError (and leaving the dropdown stuck open).
      const dropdown = this.shadowRoot?.querySelector(
        `.label-dropdown[data-action-key="${CSS.escape(actionKey)}"]`
      ) as Dropdown | null;
      if (dropdown) dropdown.open = false;

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
          // Re-fetch the current page so a filtered view (e.g. a
          // label-filter) drops rows that no longer match — staying on
          // the page being acted on rather than resetting to the first.
          await this.fetchPage(this.currentUrl || undefined);
          // Re-check the ids we were operating on. Items that survived
          // the refresh stay selected; items the server filtered out
          // (label removed → no longer matches the view) are absent
          // from `this.items` and won't be re-selected. Mirrors
          // rapidpro's `recheckIds()` after a `spaPost`.
          this.recheckSelection(originalSelectedIds);
          // Only fire after the server confirms — a failed POST
          // shouldn't tell consumers (e.g. a sidebar refreshing
          // counts) that the label actually changed.
          this.fireCustomEvent(CustomEventType.BulkAction, {
            action: 'label',
            ids: originalSelectedIds,
            label: label.uuid,
            add
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('label toggle POST failed', err);
        }
      } else {
        // No server round-trip — the host is fully responsible for the
        // action, so fire so it can react.
        this.fireCustomEvent(CustomEventType.BulkAction, {
          action: 'label',
          ids: originalSelectedIds,
          label: label.uuid,
          add
        });
      }
    } finally {
      // Always release the toggle gate, even if an early return or a
      // throw from a future edit short-circuits the round-trip — the
      // dropdown's other rows must never get permanently wedged.
      this.pendingLabel = null;
    }
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
    if (this.searchOpen) {
      // Reopen with the committed query in the input so the user
      // can edit it rather than starting over.
      this.searchDraft = this.search;
      this.updateComplete.then(() => {
        const input = this.shadowRoot?.querySelector(
          '.searchbar input'
        ) as HTMLInputElement | null;
        input?.focus();
      });
    } else if (this.search) {
      // Closing while a search is active is the same as clearing
      // it — keeps the toolbar from misleading once the input is
      // gone (no clear-X to signal the active filter).
      this.clearSearch();
    } else {
      // No committed search, but a draft may have been typed; toss
      // it so reopening starts clean.
      this.searchDraft = '';
    }
  }

  private clearSearch(): void {
    this.searchDraft = '';
    if (!this.search) return;
    this.search = '';
    this.page = 1;
    // fetchPage's `finally` will clear this once the kicked-off
    // request settles, but doing it synchronously here is a UX
    // optimization: "Searching…" disappears the instant the user
    // clears, rather than flickering until the in-flight request
    // resolves.
    this.searching = false;
    // fetchPage first so currentUrl reflects the cleared search before
    // the state bubbles — see commitSearch for the full reasoning.
    // Pushes a new entry so the cleared-search view is its own back
    // step, paired with commitSearch.
    this.fetchPage();
    this.writeUrlState();
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

  /** Whether a column is pinned against the left edge. */
  private isLeftPinned(column: ContentListColumn): boolean {
    return column.pinned === true || column.pinned === 'left';
  }

  /** Whether a column is pinned against the right edge. */
  private isRightPinned(column: ContentListColumn): boolean {
    return column.pinned === 'right';
  }

  /** Recompute which leading cells + columns are pinned and assign
   * each a sticky "pin index". Called at the top of render() so the
   * header and rows agree. Left-pinned columns are expected to be
   * contiguous from the first column (the leading checkbox/icon
   * cells pin alongside them so identity stays anchored); right-
   * pinned columns contiguous to the last. */
  private computePinLayout(): void {
    // Reserve an empty leading-icon column when any row would carry
    // an icon — probe a representative row, then skip the icon
    // per-row if that row's own getRowIcon returns null.
    this.reservesIcon =
      this.items.length > 0 && this.getRowIcon(this.items[0]) !== null;
    this.pinIndexByColumn = new Map();
    this.rightPinIndexByColumn = new Map();
    this.checkPinIndex = -1;
    this.iconPinIndex = -1;
    this.lastPinIndex = -1;
    this.firstRightPinIndex = -1;
    this.spacerAfterIndex = -1;

    // Right-pinned columns are contiguous at the end; walk inward
    // from the last column, numbering 0 = rightmost.
    let ridx = 0;
    for (let i = this.columns.length - 1; i >= 0; i--) {
      if (!this.isRightPinned(this.columns[i])) break;
      this.rightPinIndexByColumn.set(this.columns[i], ridx++);
    }
    this.firstRightPinIndex = ridx - 1;

    // Left-pinned columns + the leading checkbox/icon cells.
    const leftPinnedCount = this.columns.filter((c) =>
      this.isLeftPinned(c)
    ).length;
    if (leftPinnedCount === 0) return;
    let idx = 0;
    if (this.hasCheckboxes) this.checkPinIndex = idx++;
    if (this.reservesIcon) this.iconPinIndex = idx++;
    this.columns.forEach((c) => {
      if (this.isLeftPinned(c)) this.pinIndexByColumn.set(c, idx++);
    });
    this.lastPinIndex = idx - 1;
    // Left-pinned columns are contiguous from the start, so the last
    // one sits at column index leftPinnedCount - 1; the spacer
    // follows it — unless a `grow` column is present, in which case
    // that column already pools the slack and a spacer would only
    // split it.
    this.spacerAfterIndex = this.columns.some((c) => c.grow)
      ? -1
      : leftPinnedCount - 1;
  }

  /** `pinned` (+ `pin-last` for the rightmost left-pinned cell)
   * class string for a left-pinned leading cell at the given pin
   * index, or '' when unpinned. */
  private pinClass(index: number): string {
    if (index < 0) return '';
    return index === this.lastPinIndex ? 'pinned pin-last' : 'pinned';
  }

  /** Sticky `left` for a left-pinned cell — resolved from a per-
   * index CSS var that {@link measurePinOffsets} sets from the real
   * header cell widths after each render. */
  private pinStyle(index: number): string {
    return index < 0 ? '' : `left: var(--cl-pin-${index}, 0px);`;
  }

  /** Pin class string for a column cell (header or body) — handles
   * both edges: `pin-last` marks the inboard edge of the left group,
   * `pin-first` the inboard edge of the right group. */
  private columnPinClass(column: ContentListColumn): string {
    const left = this.pinIndexByColumn.get(column);
    if (left != null) return this.pinClass(left);
    const right = this.rightPinIndexByColumn.get(column);
    if (right != null) {
      return right === this.firstRightPinIndex
        ? 'pinned pin-right pin-first'
        : 'pinned pin-right';
    }
    return '';
  }

  /** Sticky `left`/`right` style for a column cell, resolved from
   * the per-index CSS vars {@link measurePinOffsets} publishes. */
  private columnPinStyle(column: ContentListColumn): string {
    const left = this.pinIndexByColumn.get(column);
    if (left != null) return `left: var(--cl-pin-${left}, 0px);`;
    const right = this.rightPinIndexByColumn.get(column);
    if (right != null) return `right: var(--cl-rpin-${right}, 0px);`;
    return '';
  }

  /** Width contract for a column's inner wrapper — a hard `width`
   * when set, otherwise optional min/max bounds. With neither bound
   * the column simply sizes to its content (header label or widest
   * value) via the table's auto layout. */
  private cellWidthStyle(column: ContentListColumn): string {
    // Under fixed layout the column widths are set on the cells
    // themselves (see {@link renderHeaderCell}); the inner wrapper
    // just fills its cell and ellipsis-truncates against it.
    if (this.fixedLayout) return '';
    if (column.width) return `width: ${column.width};`;
    const parts: string[] = [];
    if (column.minWidth) parts.push(`min-width: ${column.minWidth};`);
    // A grow column drops the upper cap so it can stretch with the
    // table; every other column caps its content-driven width.
    if (!column.grow) parts.push(`max-width: ${column.maxWidth || '320px'};`);
    return parts.join(' ');
  }

  /** Column count for the empty/loading row's colspan — includes
   * the leading cells and the slack spacer when present. */
  private colSpan(): number {
    return (
      (this.hasCheckboxes ? 1 : 0) +
      (this.reservesIcon ? 1 : 0) +
      (this.spacerAfterIndex >= 0 ? 1 : 0) +
      this.columns.length
    );
  }

  /** Measure the header's pinned cells and publish a cumulative
   * `left` offset per pin index as a CSS var on the host. Pinned
   * cells (header + body) read these via {@link pinStyle}. Pinned
   * columns size to content, so this re-runs after every render. */
  private measurePinOffsets(): void {
    const headRow = this.shadowRoot?.querySelector('tr.header');
    if (!headRow) return;
    const cells = Array.from(headRow.children) as HTMLElement[];
    // Left group — cumulative `left` offset, walking from the start.
    let offset = 0;
    let idx = 0;
    for (const cell of cells) {
      if (!cell.classList.contains('pinned')) break;
      if (cell.classList.contains('pin-right')) break;
      this.style.setProperty(`--cl-pin-${idx}`, `${offset}px`);
      offset += cell.offsetWidth;
      idx++;
    }
    // Right group — cumulative `right` offset, walking from the end.
    let roffset = 0;
    let ridx = 0;
    for (let i = cells.length - 1; i >= 0; i--) {
      if (!cells[i].classList.contains('pin-right')) break;
      this.style.setProperty(`--cl-rpin-${ridx}`, `${roffset}px`);
      roffset += cells[i].offsetWidth;
      ridx++;
    }
    // Total width of the right-pinned group — the scroll gradient
    // is inset by this so it lands just left of the frozen columns.
    this.style.setProperty('--cl-rpin-total', `${roffset}px`);
  }

  /** Refresh the horizontal-scroll affordances — whether the table
   * overflows at all (`overflowing`, which gates the pinned-column
   * tint + divider), the pinned-column divider shadow (table
   * scrolled off its start) and the right-edge fade (more table
   * hidden to the right). These are purely presentational, so the
   * classes are toggled straight on the frame rather than through
   * reactive state — that keeps a scroll (or a post-render
   * re-measure) from scheduling another render. */
  private syncScrollAffordance(): void {
    const frame = this.shadowRoot?.querySelector(
      '.table-frame'
    ) as HTMLElement | null;
    const scroller = this.shadowRoot?.querySelector(
      '.table-scroll'
    ) as HTMLElement | null;
    if (!frame || !scroller) return;
    const maxScroll = scroller.scrollWidth - scroller.clientWidth;
    // Below a 1px slack the table fits and there is nothing to
    // scroll — the pinned columns then read as plain columns.
    frame.classList.toggle('overflowing', maxScroll > 1);
    frame.classList.toggle('scrolled', scroller.scrollLeft > 1);
    frame.classList.toggle(
      'can-scroll-right',
      scroller.scrollLeft < maxScroll - 1
    );
    // Height of the horizontal scrollbar (0 for overlay scrollbars)
    // — the scroll gradient is lifted by this so it never paints
    // over the scrollbar track.
    this.style.setProperty(
      '--cl-scrollbar',
      `${scroller.offsetHeight - scroller.clientHeight}px`
    );
  }

  private renderHeader(): TemplateResult {
    const allIds = this.items.map((i) => this.rowId(i));
    const allSelected =
      allIds.length > 0 && allIds.every((id) => this.selectedIds.has(id));
    const someSelected = !allSelected && this.selectedIds.size > 0;

    return html`
      <thead>
        <tr class="header">
          ${this.hasCheckboxes
            ? html`
                <th
                  class="check-cell ${this.pinClass(this.checkPinIndex)}"
                  style=${this.pinStyle(this.checkPinIndex)}
                  @click=${() => this.handleSelectAll()}
                >
                  <div class="check-inner">
                    <temba-checkbox
                      size="1.1"
                      ?checked=${allSelected}
                      ?partial=${someSelected}
                    ></temba-checkbox>
                  </div>
                </th>
              `
            : null}
          ${this.reservesIcon
            ? html`<th
                class="icon-cell ${this.pinClass(this.iconPinIndex)}"
                style=${this.pinStyle(this.iconPinIndex)}
              ></th>`
            : null}
          ${this.columns.map((c, i) =>
            i === this.spacerAfterIndex
              ? html`${this.renderHeaderCell(c)}
                  <th class="spacer"></th>`
              : this.renderHeaderCell(c)
          )}
        </tr>
      </thead>
    `;
  }

  private renderHeaderCell(column: ContentListColumn): TemplateResult {
    const active = this.sort === column.key || this.sort === '-' + column.key;
    const desc = this.sort === '-' + column.key;
    const cls = `head-cell ${column.align || ''} ${
      column.sortable ? 'sortable' : ''
    } ${active ? 'active' : ''} ${
      column.grow ? 'grow' : ''
    } ${this.columnPinClass(column)}`;
    // The sort arrow sits on the inboard side of the label — left of
    // it for right-aligned columns, right of it otherwise — so the
    // label stays flush with the column's values whichever way the
    // column is aligned, with no offset to reconcile. Its slot is a
    // fixed width, reserved even while the arrow is hidden, so the
    // label never shifts when the arrow appears on hover.
    const label = html`<span class="label"
      >${column.label ?? column.key}</span
    >`;
    const slot = column.sortable
      ? html`<span class="sort-slot"
          ><temba-icon
            class="sort-icon"
            name=${active ? (desc ? Icon.sort_down : Icon.sort_up) : Icon.sort}
            size="0.85"
          ></temba-icon
        ></span>`
      : null;
    // Under fixed layout the header row drives the column widths, so
    // each `width`-set column carries its width on the cell itself;
    // the grow column is left unsized to claim the remainder.
    const widthStyle =
      this.fixedLayout && column.width ? `width: ${column.width};` : '';
    return html`
      <th
        class=${cls}
        style="${this.columnPinStyle(column)} ${widthStyle}"
        @click=${column.sortable ? () => this.handleSortClick(column) : null}
      >
        <div class="head-inner" style=${this.cellWidthStyle(column)}>
          ${column.align === 'right'
            ? html`${slot}${label}`
            : html`${label}${slot}`}
        </div>
      </th>
    `;
  }

  private renderRow(item: T): TemplateResult {
    const id = this.rowId(item);
    const selected = this.selectedIds.has(id);
    const href = this.getRowHref(item);
    const icon = this.getRowIcon(item);
    return html`
      <tr
        class="row ${selected ? 'selected' : ''} ${href ? 'clickable' : ''}"
        @click=${(e: MouseEvent) => this.handleRowClick(item, e)}
      >
        ${this.hasCheckboxes
          ? html`
              <td
                class="check-cell ${this.pinClass(this.checkPinIndex)}"
                style=${this.pinStyle(this.checkPinIndex)}
                @click=${(e: MouseEvent) => {
                  // Cell-level click is the single source of truth
                  // for selection. The inner checkbox has
                  // pointer-events: none so it can't fire a second
                  // toggle on the same click.
                  e.stopPropagation();
                  this.handleRowToggle(item);
                }}
              >
                <div class="check-inner">
                  <temba-checkbox
                    size="1.1"
                    ?checked=${selected}
                  ></temba-checkbox>
                </div>
              </td>
            `
          : null}
        ${this.reservesIcon
          ? html`
              <td
                class="icon-cell ${this.pinClass(this.iconPinIndex)}"
                style=${this.pinStyle(this.iconPinIndex)}
              >
                ${icon
                  ? html`<div class="icon-inner">
                      <temba-icon name=${icon} size="1"></temba-icon>
                    </div>`
                  : null}
              </td>
            `
          : null}
        ${this.columns.map((c, i) =>
          i === this.spacerAfterIndex
            ? html`${this.renderBodyCell(item, c)}
                <td class="spacer"></td>`
            : this.renderBodyCell(item, c)
        )}
      </tr>
    `;
  }

  private renderBodyCell(item: T, column: ContentListColumn): TemplateResult {
    return html`
      <td
        class="cell ${column.align || ''} ${column.grow
          ? 'grow'
          : ''} ${this.columnPinClass(column)}"
        style=${this.columnPinStyle(column)}
      >
        <div class="cell-inner" style=${this.cellWidthStyle(column)}>
          ${this.renderCell(item, column)}
        </div>
      </td>
    `;
  }

  /** The pager — a compact "‹ 1–N of Total ›" stepper for the
   * header's actions cluster. A cursor list has no total, so it
   * shows chevrons only, gated on whether the last response handed
   * back a cursor for that direction. Returns nothing when there is
   * neither a page to move to nor a count worth showing. */
  private renderPager(): TemplateResult {
    const lastPage = Math.max(1, Math.ceil(this.total / this.pageSize));
    const first = this.total === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
    const last = Math.min(this.total, this.page * this.pageSize);
    const atStart = this.cursorMode ? !this.prevCursor : this.page <= 1;
    const atEnd = this.cursorMode ? !this.nextCursor : this.page >= lastPage;
    if (this.cursorMode ? atStart && atEnd : this.total === 0) {
      return html``;
    }
    return html`
      <div class="pager">
        <span
          class="page-btn"
          ?disabled=${atStart}
          @click=${() => this.handlePage(-1)}
          aria-label="Previous page"
        >
          <temba-icon name=${Icon.arrow_left} size="1"></temba-icon>
        </span>
        ${!this.cursorMode
          ? html`<span class="pager-status"
              >${first}&ndash;${last} of ${this.total}</span
            >`
          : null}
        <span
          class="page-btn"
          ?disabled=${atEnd}
          @click=${() => this.handlePage(1)}
          aria-label="Next page"
        >
          <temba-icon name=${Icon.arrow_right} size="1"></temba-icon>
        </span>
      </div>
    `;
  }

  public render(): TemplateResult {
    // Pin layout depends on the current columns + items, so resolve
    // it once per render before the header and rows are built.
    this.computePinLayout();
    const span = this.colSpan();
    return html`
      <div class="panel">
        ${this.renderTitlebar()}
        <div class="header-rule"></div>
        <div class="table-frame">
          <div
            class="table-scroll"
            @scroll=${() => this.syncScrollAffordance()}
          >
            <table
              class="table ${this.fixedLayout ? 'fixed' : ''}"
              style=${this.minTableWidth
                ? `min-width: ${this.minTableWidth};`
                : ''}
            >
              ${this.renderHeader()}
              <tbody>
                ${this.searching
                  ? html`<tr>
                      <td class="loading" colspan=${span}>Searching&hellip;</td>
                    </tr>`
                  : this.loading && this.items.length === 0
                    ? html`<tr>
                        <td class="loading" colspan=${span}>Loading&hellip;</td>
                      </tr>`
                    : this.items.length === 0
                      ? html`<tr>
                          <td class="empty" colspan=${span}>
                            ${this.emptyMessage}
                          </td>
                        </tr>`
                      : this.items.map((i) => this.renderRow(i))}
              </tbody>
            </table>
          </div>
          <div class="scroll-shadow"></div>
        </div>
      </div>
    `;
  }
}
