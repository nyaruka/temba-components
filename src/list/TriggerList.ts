import { css, html, TemplateResult } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { ContentList, ContentListColumn } from './ContentList';
import { Icon } from '../Icons';
import { CustomEventType, Trigger } from '../interfaces';

/** Placeholder shown in any cell whose value is empty. */
const EMPTY = '--';

/** Most pills a cell renders before folding the remainder into a
 * "+N" summary — past this, shrinking pills to fit degrades them to
 * bare icons that identify nothing. */
const MAX_PILLS = 3;

/** A resolved filter pill (channel / contact / group / excluded
 * group) ready to render — see {@link TriggerList.renderFilters}. */
interface FilterPill {
  type: string;
  name: string;
  href: string;
  icon?: string;
  exclude?: boolean;
}

/** Human name for each trigger type slug — mirrors the type names in
 * rapidpro's `triggers/types.py`. Rendered in the trigger cell only
 * for types whose leading icon doesn't say it all (no per-type
 * details of their own). */
const TYPE_NAMES: { [slug: string]: string } = {
  keyword: 'Keyword',
  catch_all: 'Catch All',
  schedule: 'Schedule',
  inbound_call: 'Inbound Call',
  missed_call: 'Missed Call',
  new_conversation: 'New Conversation',
  referral: 'Referral',
  closed_ticket: 'Closed Ticket',
  opt_in: 'Opt-In',
  opt_out: 'Opt-Out'
};

/**
 * Trigger CRUDL list — drop-in replacement for the rapidpro
 * `triggers/trigger_list.html` table. Columns: the trigger itself
 * (a leading type icon plus the per-type details — keyword pills,
 * schedule, referrer — or the type name when there are none), the
 * filters that scope it (channel first, then contact / group pills,
 * excluded groups tinted red), the flow it starts, and created on.
 * Triggers open in an update modal rather than a page of their own,
 * so rows carry no href — the host listens for `temba-row-click`
 * and opens the modal itself.
 */
export class TriggerList extends ContentList<Trigger> {
  static get styles() {
    return css`
      ${ContentList.styles}
      /* Rows are clickable (the host opens the update modal on
         temba-row-click) but carry no href, so ContentList doesn't
         mark them .clickable — carry the affordance ourselves. */
      tr.row {
        cursor: pointer;
      }
      .type-name {
        color: inherit;
        font-weight: var(--w-medium);
        white-space: nowrap;
      }
      /* Trigger cell — muted lead-in text ("starts with", "from")
         ahead of the per-type specifics, with pills sitting inline. */
      .details {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
        max-width: 100%;
      }
      /* The lead word never shrinks; the detail text after it ("each
         week on Monday…", the referrer) ellipsizes when the cell runs
         out of room — flex items ignore the cell wrapper's
         text-overflow, so they carry their own. */
      .details .type-name {
        flex: 0 0 auto;
      }
      .details .lead-in,
      .details .detail-text {
        white-space: nowrap;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .details .lead-in {
        color: var(--text-3);
      }
      /* A pill row that outgrows its cell shrinks its pills rather
         than clipping at the cell edge: max-width pins the inline-flex
         container to the cell (it would otherwise size to its content
         and hard-clip under .cell-inner's overflow). Which pills give
         up the space is deliberate — see .wide below. */
      .pills {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
        max-width: 100%;
      }
      /* Short-named pills never squeeze — with the +N cap bounding
         the row, they always fit, so they keep their full text. */
      .pills temba-label {
        flex-shrink: 0;
      }
      /* A long-named pill is the one that gives up space, down to a
         floor that keeps its name identifiable — temba-label's
         internal slot ellipsis handles the truncation. */
      .pills temba-label.wide {
        flex-shrink: 1;
        min-width: 7em;
      }
      /* Keyword pills sit in the grow column where space varies more;
         they shrink-with-ellipsis rather than clip. No floor here — a
         min-width would stretch pills whose natural size is below it,
         and keywords are short enough (≤16 chars, capped at three by
         the +N summary) that a squeeze stays readable. */
      .details .pills temba-label {
        flex-shrink: 1;
        min-width: 0;
      }
      /* Exclusion pills — group pills derive their palette from
         --recipient (see pillVariants.ts), so re-anchoring it to the
         danger hue retints an excluded group red while keeping the
         pill chrome identical to its included siblings. */
      .pills temba-label.exclude {
        --recipient: var(--danger);
      }
      /* A long-named pill absorbs the row's squeeze first — the huge
         shrink factor concentrates the deficit on it (down to a
         readable floor) so its short-named siblings keep their full
         text instead of everything ellipsizing proportionally. */
      .pills temba-label.wide {
        flex-shrink: 999;
        min-width: 7em;
      }
      /* The "+N" summary pill never shrinks — it's the affordance
         that says more exist, so it must stay legible while its
         siblings ellipsize. */
      .pills temba-label.overflow {
        flex: 0 0 auto;
      }
    `;
  }

  constructor() {
    super();
    this.valueKey = 'id';
    this.emptyMessage = 'No triggers';
    this.searchPlaceholder = 'Search triggers';
    this.columns = [
      { key: 'trigger', label: 'Trigger', grow: true, minWidth: '200px' },
      {
        key: 'filters',
        label: 'Filters',
        minWidth: '120px',
        maxWidth: '360px'
      },
      { key: 'flow', label: 'Flow', minWidth: '110px', maxWidth: '240px' },
      {
        key: 'created_on',
        label: 'Created on',
        sortable: true,
        minWidth: '96px',
        maxWidth: '150px',
        align: 'right'
      }
    ];
    this.bulkActions = [
      { key: 'archive', label: 'Archive', icon: Icon.archive }
    ];
  }

  protected getRowIcon(item: Trigger): string | null {
    return (Icon as any)[`trigger_${item?.type}`] || Icon.trigger;
  }

  /** Navigate a pill click through the SPA, suppressing the row's
   * own click (which opens the update modal). Shared by the flow,
   * channel, group, and contact pills. */
  private handlePillClick(href: string, event: MouseEvent): void {
    // Stop the click from bubbling to the row's modal handler.
    event.stopPropagation();
    // Guard the JSON-driven href against open-redirect, same as the
    // row-click path in ContentList.handleRowClick.
    if (!href || !this.isSafeHref(href)) return;
    // Meta/ctrl-click opens a new tab, matching ordinary links and
    // the row-click behavior.
    if (event.metaKey || event.ctrlKey) {
      window.open(href, '_blank');
      return;
    }
    this.fireCustomEvent(CustomEventType.Redirected, { url: href });
  }

  protected renderCell(
    item: Trigger,
    column: ContentListColumn
  ): TemplateResult | string {
    switch (column.key) {
      case 'trigger':
        return this.renderTrigger(item);
      case 'filters':
        return this.renderFilters(item);
      case 'flow':
        return this.renderFlow(item);
      case 'created_on':
        return item.created_on
          ? html`<temba-date
              value=${item.created_on}
              display="timedate"
            ></temba-date>`
          : EMPTY;
      default:
        return super.renderCell(item, column);
    }
  }

  /** Overflow summary pill — "+N" for the pills past the visible
   * cap, with the hidden names in its tooltip. Not clickable itself,
   * so a click on it falls through to the row (the update modal),
   * where the full set is editable. */
  private renderOverflowPill(hiddenNames: string[]): TemplateResult | null {
    if (!hiddenNames.length) return null;
    return html`<temba-label
      class="overflow"
      type="neutral"
      title=${hiddenNames.join(', ')}
      >+${hiddenNames.length}</temba-label
    >`;
  }

  /** The trigger cell: every row leads with a word at the type-name
   * weight — "Message" for keywords, "Scheduled" for schedules,
   * "Referral" for referrals, or the type name itself for types with
   * no details — followed by the muted per-type specifics. */
  private renderTrigger(item: Trigger): TemplateResult | string {
    switch (item.type) {
      case 'keyword': {
        const keywords = item.keywords || [];
        if (!keywords.length) break;
        const visible = keywords.slice(0, MAX_PILLS);
        return html`<span class="details">
          <span class="type-name">Message</span>
          <span class="lead-in"
            >${item.match_type === 'O' ? 'matches' : 'starts with'}</span
          >
          <span class="pills">
            ${visible.map(
              (k) => html`<temba-label type="keyword">${k}</temba-label>`
            )}
            ${this.renderOverflowPill(keywords.slice(MAX_PILLS))}
          </span>
        </span>`;
      }
      case 'schedule':
        // a paused or exhausted schedule has no next fire — matching
        // the legacy list's "is not scheduled" copy
        return item.schedule?.next_fire && item.schedule?.display
          ? html`<span class="details">
              <span class="type-name">Scheduled</span>
              <span class="lead-in">${item.schedule.display}</span>
            </span>`
          : html`<span class="type-name">Not scheduled</span>`;
      case 'referral':
        if (!item.referrer_id) break;
        return html`<span class="details">
          <span class="type-name">Referral</span>
          <span class="lead-in">from</span>
          <span class="detail-text">${item.referrer_id}</span>
        </span>`;
    }
    return html`<span class="type-name"
      >${TYPE_NAMES[item.type] || item.type || EMPTY}</span
    >`;
  }

  /** The filter pills scoping the trigger: the channel first (there
   * is only ever one), then the contacts a scheduled trigger starts,
   * the groups it's limited to, and — tinted red — the groups it
   * excludes. At most {@link MAX_PILLS} pills render; the rest fold
   * into a "+N" summary pill so a crowded row never squeezes its
   * pills down to bare icons. */
  private renderFilters(item: Trigger): TemplateResult | string {
    const channel = item.channel;
    const filters: FilterPill[] = [];
    if (channel) {
      filters.push({
        type: 'channel',
        icon: channel.icon || Icon.channel,
        name: channel.name,
        href: `/channels/channel/read/${channel.uuid}/`
      });
    }
    for (const c of item.contacts || []) {
      filters.push({
        type: 'contact',
        name: c.name,
        href: `/contact/read/${c.uuid}/`
      });
    }
    for (const g of item.groups || []) {
      filters.push({
        type: 'group',
        icon: Icon.group_include,
        name: g.name,
        href: `/contact/group/${g.uuid}/`
      });
    }
    for (const g of item.exclude_groups || []) {
      filters.push({
        type: 'group',
        icon: Icon.group_exclude,
        name: g.name,
        href: `/contact/group/${g.uuid}/`,
        exclude: true
      });
    }
    if (!filters.length) {
      return EMPTY;
    }

    const visible = filters.slice(0, MAX_PILLS);
    // excluded names keep their meaning in the summary tooltip
    const hidden = filters
      .slice(MAX_PILLS)
      .map((f) => (f.exclude ? `not ${f.name}` : f.name));

    return html`<span class="pills">
      ${visible.map(
        (f) =>
          html`<temba-label
            class="${f.exclude ? 'exclude' : ''} ${f.name.length > 11
              ? 'wide'
              : ''}"
            type=${f.type}
            icon=${ifDefined(f.icon)}
            clickable
            @click=${(e: MouseEvent) => this.handlePillClick(f.href, e)}
            >${f.name}</temba-label
          >`
      )}
      ${this.renderOverflowPill(hidden)}
    </span>`;
  }

  private renderFlow(item: Trigger): TemplateResult | string {
    const flow = item.flow;
    if (!flow?.uuid) return EMPTY;
    return html`<temba-label
      type="flow"
      primary
      clickable
      @click=${(e: MouseEvent) =>
        this.handlePillClick(`/flow/editor/${flow.uuid}/`, e)}
      >${flow.name}</temba-label
    >`;
  }
}
