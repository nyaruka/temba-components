import { css, html, PropertyValues, TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ContentList, ContentListColumn } from './ContentList';
import { Icon } from '../Icons';
import { Contact } from '../interfaces';
import { getUrl } from '../utils';

const FIELD_PREFIX = 'field:';

/**
 * Contact CRUDL list — drop-in replacement for the rapidpro
 * `contacts/contact_list.html` table. Each row carries a contact
 * silhouette as the leading icon, name + URN, group pills, and a
 * last-seen duration. Name + Last-seen are sortable.
 *
 * Featured contact fields from the workspace render as extra
 * columns between URN and Groups. The component fetches them from
 * {@link ContactList.fieldsEndpoint} on connect; cells read each
 * contact's value out of `item.fields[<key>]`.
 */
export class ContactList extends ContentList<Contact> {
  static get styles() {
    return css`
      ${ContentList.styles}
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
      /* Featured-field values are concrete data (someone's age,
         their state, etc.) — bold text, not a pill. Truncated
         with a title tooltip so long entries don't blow up the
         row width. */
      .field-value {
        font-weight: var(--w-semibold);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        display: block;
      }
      .group-list {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-wrap: wrap;
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

  /** Columns: name, urn, <featured fields>, groups, last seen. */
  private buildColumns(): ContentListColumn[] {
    const fieldColumns: ContentListColumn[] = (this.featuredFields || []).map(
      (f: any) => ({
        key: FIELD_PREFIX + f.key,
        label: f.name || f.label || f.key,
        width: '110px',
        grow: 0
      })
    );
    return [
      { key: 'name', label: 'Name', sortable: true, grow: 2 },
      { key: 'urn', label: 'URN', width: '150px', grow: 0 },
      ...fieldColumns,
      { key: 'groups', label: 'Groups', grow: 1 },
      {
        key: 'last_seen_on',
        label: 'Last seen',
        sortable: true,
        width: '110px',
        grow: 0,
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
      const value = raw == null || raw === '' ? '' : String(raw);
      return value
        ? html`<span class="field-value" title=${value}>${value}</span>`
        : '';
    }
    switch (column.key) {
      case 'name':
        return html`<span class="contact-name" title=${item.name || ''}
          >${item.name || '—'}</span
        >`;
      case 'urn':
        return html`<span class="contact-urn"
          >${this.primaryUrn(item) || ''}</span
        >`;
      case 'groups':
        return this.renderGroups(item);
      case 'last_seen_on':
        return item.last_seen_on
          ? html`<temba-date
              value=${item.last_seen_on}
              display="duration"
            ></temba-date>`
          : '';
      default:
        return super.renderCell(item, column);
    }
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

  private renderGroups(item: Contact): TemplateResult {
    const groups = item.groups || [];
    if (groups.length === 0) return html``;
    return html`
      <div class="group-list">
        ${groups.map(
          (g: any) =>
            html`<temba-label type="group" icon=${Icon.group}
              >${g.name}</temba-label
            >`
        )}
      </div>
    `;
  }
}
