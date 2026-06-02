import { css, html, TemplateResult } from 'lit';
import { ContentList, ContentListColumn } from './ContentList';
import { Icon } from '../Icons';
import { Msg } from '../interfaces';

/**
 * Message CRUDL list — drop-in replacement for the rapidpro
 * `msgs/msg_list.html` table. Reverse-chronological; the message
 * cell carries the body text with its attachment thumbnails right
 * after it and the flow / label pills pushed to the trailing edge,
 * with a duration timestamp closing the row.
 */
export class MsgList extends ContentList<Msg> {
  static get styles() {
    return css`
      ${ContentList.styles}
      /* The message cell holds the body text with its attachment
         thumbnails right after it, and the flow / label pills pushed
         to the trailing edge. The text sizes to content and
         ellipsizes when squeezed — resolved per row, so a busy row
         doesn't widen a column for all of them. */
      .msg-cell {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .msg-text {
        flex: 0 1 auto;
        /* A small floor so the message keeps a few words even on a
           row whose meta is wide — the message yields most of its
           width to the attachments and pills before they clip. */
        min-width: 80px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      /* Attachment thumbnails sit immediately after the text. */
      .msg-attachments {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      /* Flow + label pills, pushed to the trailing edge of the cell. */
      .cell-pills {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        gap: 6px;
        margin-left: auto;
      }
      /* Attachment thumbnails are sized well below the 44px row so
         they never grow its height — a small square preview rather
         than the chat history's full-size thumbnail. --thumb-icon-
         padding shrinks temba-thumbnail's non-image fallback (the
         document/video icon box) to match. The max-height clamp is
         a backstop for any type that still carries its own larger
         intrinsic size (e.g. a location map). */
      .msg-thumb {
        --thumb-size: 24px;
        --thumb-padding: 2px;
        --thumb-icon-padding: 4px;
        max-height: 36px;
        overflow: hidden;
      }
      /* Sent cell — the date with an optional channel-log icon to
         its right. The cell stays right-aligned (the column's own
         alignment) and uses a flex row so the icon sits flush
         against the date with a small gap. */
      .sent-cell {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 6px;
      }
      /* Channel-log icon link inside the sent cell. */
      .msg-log {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        padding: 2px;
        border-radius: var(--r-sm);
        color: var(--text-3);
        text-decoration: none;
      }
      .msg-log:hover {
        background: var(--sunken);
        color: var(--text-1);
      }
      .msg-log temba-icon {
        --icon-color: currentColor;
      }
    `;
  }

  constructor() {
    super();
    this.valueKey = 'id';
    this.emptyMessage = 'No messages';
    this.searchPlaceholder = 'Search messages';
    // Messages page 100 at a time, matching rapidpro's msg list.
    this.pageSize = 100;
    // Fixed layout so a long message ellipsis-truncates within its
    // column instead of stretching the table; minTableWidth lets the
    // list scroll horizontally once the container is too narrow to
    // keep the columns usable, rather than clipping anything.
    this.fixedLayout = true;
    this.minTableWidth = '640px';
    this.columns = [
      {
        key: 'contact',
        label: 'Contact',
        width: '130px',
        pinned: true
      },
      { key: 'text', label: 'Message', grow: true },
      {
        key: 'created_on',
        label: 'Sent',
        width: '120px',
        align: 'right',
        pinned: 'right'
      }
    ];
    this.bulkActions = [
      {
        key: 'label',
        label: 'Label',
        icon: Icon.label,
        labelsEndpoint: '/api/v2/labels.json'
      },
      { key: 'archive', label: 'Archive', icon: Icon.archive },
      { key: 'delete', label: 'Delete', icon: Icon.delete, destructive: true }
    ];
  }

  /** Rows navigate to the message's contact. Returning the href here
   * also marks the row `clickable`, so it carries the pointer cursor on
   * hover. */
  protected getRowHref(item: Msg): string | null {
    const uuid = item.contact?.uuid;
    return uuid ? `/contact/read/${uuid}/` : null;
  }

  protected renderCell(
    item: Msg,
    column: ContentListColumn
  ): TemplateResult | string {
    switch (column.key) {
      case 'contact': {
        const contact = item.contact || {};
        return contact.name || contact.urn || '';
      }
      case 'text':
        return this.renderMessageCell(item);
      case 'created_on':
        return this.renderSentCell(item);
      default:
        return super.renderCell(item, column);
    }
  }

  /** The message cell — body text, its attachment thumbnails, then
   * the trailing flow / label pills. Each piece sizes to content, so
   * the split is resolved independently for every row. */
  private renderMessageCell(item: Msg): TemplateResult {
    return html`
      <div class="msg-cell">
        <span class="msg-text">${this.renderMessageText(item)}</span>
        ${this.renderAttachments(item)}${this.renderPills(item)}
      </div>
    `;
  }

  /** The sent cell — duration timestamp with an optional channel-log
   * icon to its right. The icon is rendered when the server includes
   * a logs_url on the row (permission- and retention-gated
   * server-side). stopPropagation keeps the row's contact navigation
   * from also firing when the icon is clicked. */
  private renderSentCell(item: Msg): TemplateResult | string {
    if (!item.created_on) return '';
    return html`
      <div class="sent-cell">
        <temba-date value=${item.created_on} display="duration"></temba-date>
        ${item.logs_url && this.isSafeHref(item.logs_url)
          ? html`
              <a
                class="msg-log"
                href=${item.logs_url}
                @click=${(e: MouseEvent) => e.stopPropagation()}
                aria-label="Channel log"
              >
                <temba-icon name=${Icon.log} size="0.95"></temba-icon>
              </a>
            `
          : ''}
      </div>
    `;
  }

  /** The message body — plain text, or an opt-in pill when an
   * opt-in request carries no text of its own. */
  private renderMessageText(item: Msg): TemplateResult | string {
    const isOptin = item.msg_type === 'optin' || item.type === 'optin';
    if (!item.text && isOptin) {
      return this.renderStatusPill('pending', 'opt-in request');
    }
    return item.text || '';
  }

  /** Attachment thumbnails for a row, sitting immediately after the
   * message text, or '' when the row carries none. */
  private renderAttachments(item: Msg): TemplateResult | string {
    const attachments = item.attachments || [];
    if (!attachments.length) return '';
    return html`
      <div class="msg-attachments">
        ${attachments.map(
          (a) => html`
            <temba-thumbnail
              class="msg-thumb"
              attachment=${a}
            ></temba-thumbnail>
          `
        )}
      </div>
    `;
  }

  /** Flow + label pills for a row, pushed to the trailing edge of
   * the message cell, or '' when the row carries none. The flow pill
   * opens its editor and each label pill opens that label's filtered
   * message view — matching the rapidpro msg list. `clickable` gives
   * the hover affordance; `goto` routes the click through the SPA and
   * stops propagation so the row's own contact navigation doesn't also
   * fire. */
  private renderPills(item: Msg): TemplateResult | string {
    const labels = item.labels || [];
    if (!item.flow && !labels.length) return '';
    return html`
      <div class="cell-pills">
        ${item.flow
          ? html`<temba-label
              type="flow"
              icon=${Icon.flow}
              href="/flow/editor/${item.flow.uuid}/"
              onclick="goto(event)"
              clickable
              >${item.flow.name}</temba-label
            >`
          : null}
        ${labels.map(
          (l) => html`
            <temba-label
              type="label"
              icon=${Icon.label}
              href="/msg/filter/${l.uuid}/"
              onclick="goto(event)"
              clickable
              >${l.name}</temba-label
            >
          `
        )}
      </div>
    `;
  }
}
