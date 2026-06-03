import { css, html, PropertyValues, TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ContentList, ContentListColumn } from './ContentList';
import { Icon } from '../Icons';
import { Contact } from '../interfaces';
import { getUrl } from '../utils';

const FIELD_PREFIX = 'field:';

/** Placeholder shown in any cell whose value is empty. */
const EMPTY = '--';

/**
 * Contact CRUDL list — drop-in replacement for the rapidpro
 * `contacts/contact_list.html` table. Each row carries a contact
 * silhouette as the leading icon, then the system columns (name,
 * URN, last-seen) followed by the workspace's featured fields.
 * Name + Last-seen are sortable.
 *
 * Featured contact fields render as extra columns after the system
 * columns. The component fetches them from
 * {@link ContactList.fieldsEndpoint} on connect; cells read each
 * contact's value out of `item.fields[<key>]`. Date/time fields
 * render as a relative duration, matching the Last-seen column.
 */
export class ContactList extends ContentList<Contact> {
  static get styles() {
    return css`
      ${ContentList.styles}
      /* The contact name is the one cell that carries a slightly
         heavier weight — every other cell stays at the regular
         table weight so values don't read as emphasised. */
      .contact-name {
        color: inherit;
        font-weight: var(--w-medium);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .contact-urn {
        color: var(--text-3);
        font-size: 12.5px;
      }
    `;
  }

  /** Endpoint returning `{ results: ContactField[] }`. Fields where
   * `featured: true` become extra columns. */
  @property({ type: String, attribute: 'fields-endpoint' })
  fieldsEndpoint = '/api/v2/fields.json';

  @state()
  private featuredFields: any[] = [];

  private pendingFieldsController?: AbortController;

  constructor() {
    super();
    this.valueKey = 'uuid';
    this.emptyMessage = 'No contacts';
    this.searchPlaceholder = 'Search contacts';
    this.columns = this.buildColumns();
    this.bulkActions = [
      { key: 'send', label: 'Send', icon: Icon.compose },
      { key: 'flow', label: 'Start flow', icon: Icon.flow },
      // Group toggle — a dropdown of the workspace's static (manual)
      // groups to add/remove the selection to/from, like the message
      // list's label dropdown.
      {
        key: 'label',
        label: 'Group',
        icon: Icon.group,
        labelsEndpoint: '/api/v2/groups.json?manual_only=1',
        labelsKey: 'groups'
      },
      { key: 'archive', label: 'Archive', icon: Icon.archive },
      { key: 'delete', label: 'Delete', icon: Icon.delete, destructive: true }
    ];
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this.loadFields();
  }

  public disconnectedCallback(): void {
    if (this.pendingFieldsController) {
      this.pendingFieldsController.abort();
      this.pendingFieldsController = undefined;
    }
    super.disconnectedCallback();
  }

  protected updated(changes: PropertyValues): void {
    super.updated(changes);
    if (changes.has('fieldsEndpoint') && this.fieldsEndpoint) {
      this.loadFields();
    }
  }

  private async loadFields(): Promise<void> {
    if (!this.fieldsEndpoint) return;
    // Abort any in-flight fields request so a stale response can't
    // overwrite featuredFields/columns after a new endpoint is set
    // or the component has disconnected.
    if (this.pendingFieldsController) {
      this.pendingFieldsController.abort();
    }
    const controller = new AbortController();
    this.pendingFieldsController = controller;
    try {
      const response = await getUrl(this.fieldsEndpoint, controller);
      // If the controller has been swapped or cleared, the response
      // is from a stale request — drop it on the floor.
      if (this.pendingFieldsController !== controller) return;
      const all = response.json?.results || [];
      this.featuredFields = all
        .filter((f: any) => f.featured)
        .sort((a: any, b: any) => (b.priority ?? 0) - (a.priority ?? 0));
      this.columns = this.buildColumns();
    } catch (err) {
      if ((err as DOMException)?.name !== 'AbortError') {
        // eslint-disable-next-line no-console
        console.error('failed to fetch contact fields', err);
      }
    } finally {
      if (this.pendingFieldsController === controller) {
        this.pendingFieldsController = undefined;
      }
    }
  }

  /** Columns: name, urn, the featured fields, then last seen.
   *
   * Name + URN lead and Last-seen trails, with the workspace's
   * custom fields filling the middle. Every column sizes to its
   * content between min/max bounds — none are hard-fixed — so the
   * table stays compact and overflows into a horizontal scroll only
   * when the field set is genuinely wide. Name + URN are pinned to
   * the left edge and Last-seen to the right, so identity and
   * recency stay anchored while the fields scroll between them.
   *
   * There is deliberately no group-membership column — contacts
   * routinely belong to dozens of groups, so a groups cell is
   * noise rather than signal in a list view. */
  private buildColumns(): ContentListColumn[] {
    // Custom-field columns are all left-aligned for simplicity, and
    // set no minWidth — their natural floor is the column header
    // label, which the table's auto layout already honours; maxWidth
    // just caps a runaway value.
    const fieldColumns: ContentListColumn[] = (this.featuredFields || []).map(
      (f: any) => ({
        key: FIELD_PREFIX + f.key,
        label: f.name || f.label || f.key,
        sortable: true,
        maxWidth: '200px'
      })
    );
    // Name + URN are the pinned identity columns and are not
    // sortable — every other column (last-seen and the custom
    // fields) is.
    return [
      {
        key: 'name',
        label: 'Name',
        minWidth: '150px',
        maxWidth: '260px',
        pinned: true
      },
      {
        key: 'urn',
        label: 'URN',
        minWidth: '120px',
        maxWidth: '190px'
      },
      ...fieldColumns,
      {
        key: 'last_seen_on',
        label: 'Last seen',
        sortable: true,
        minWidth: '96px',
        maxWidth: '150px',
        align: 'right'
      },
      {
        key: 'created_on',
        label: 'Created on',
        sortable: true,
        minWidth: '96px',
        maxWidth: '150px',
        align: 'right'
      }
    ];
  }

  protected getRowIcon(_item: Contact): string | null {
    return Icon.contact;
  }

  protected getRowHref(item: Contact): string | null {
    return item?.uuid ? `/contact/read/${item.uuid}/` : null;
  }

  protected renderCell(
    item: Contact,
    column: ContentListColumn
  ): TemplateResult | string {
    if (column.key.startsWith(FIELD_PREFIX)) {
      const fieldKey = column.key.substring(FIELD_PREFIX.length);
      const raw = item.fields?.[fieldKey];
      if (raw == null || raw === '') return EMPTY;
      // Location values are stored as a full hierarchy path
      // (e.g. "Nigeria > Yobe > Nguru > Dabule"); show only the leaf.
      if (this.isLocationField(fieldKey)) {
        const path = String(raw);
        return html`<span title=${path}>${this.locationLeaf(path)}</span>`;
      }
      // Date/time fields render via the timedate format.
      if (this.isDateField(fieldKey)) {
        return html`<temba-date value=${raw} display="timedate"></temba-date>`;
      }
      const value = String(raw);
      return html`<span title=${value}>${value}</span>`;
    }
    switch (column.key) {
      case 'name':
        return html`<span class="contact-name" title=${item.name || ''}
          >${item.name || EMPTY}</span
        >`;
      case 'urn':
        return html`<span class="contact-urn"
          >${this.primaryUrn(item) || EMPTY}</span
        >`;
      case 'last_seen_on':
        return item.last_seen_on
          ? html`<temba-date
              value=${item.last_seen_on}
              display="timedate"
            ></temba-date>`
          : EMPTY;
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

  /** True when a featured field stores a date/time value — those
   * cells render via temba-date instead of as plain text. */
  private isDateField(fieldKey: string): boolean {
    const field = (this.featuredFields || []).find(
      (f: any) => f.key === fieldKey
    );
    const type = field?.value_type;
    return type === 'datetime' || type === 'date';
  }

  /** True when a featured field stores a location value (state /
   * district / ward) — those are serialized as a full hierarchy path
   * and we render only the leaf. */
  private isLocationField(fieldKey: string): boolean {
    const field = (this.featuredFields || []).find(
      (f: any) => f.key === fieldKey
    );
    const type = field?.value_type;
    return type === 'state' || type === 'district' || type === 'ward';
  }

  /** The last segment of a location hierarchy path, e.g.
   * "Nigeria > Yobe > Nguru > Dabule" → "Dabule". */
  private locationLeaf(path: string): string {
    const parts = path.split('>');
    return parts[parts.length - 1].trim();
  }

  private primaryUrn(item: Contact): string {
    const i = item as any;
    if (i.urn) return i.urn;
    if (Array.isArray(i.urns) && i.urns.length > 0) {
      const u = i.urns[0];
      return typeof u === 'string' ? u.split(':')[1] || u : u?.display || '';
    }
    return '';
  }
}
