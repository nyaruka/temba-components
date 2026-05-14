import { css, html, TemplateResult } from 'lit';
import { ContentList, ContentListColumn } from './ContentList';
import { Icon } from '../Icons';

/**
 * Message CRUDL list — drop-in replacement for the rapidpro
 * `msgs/msg_list.html` table. Reverse-chronological; rows carry
 * contact name, message text + attachments + labels + active-flow
 * pill, and a duration timestamp.
 */
export class MsgList extends ContentList {
  static get styles() {
    return css`
      ${ContentList.styles}
      .msg-meta {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        font-size: 12px;
        color: var(--text-3);
      }
      .msg-text {
        display: block;
        color: inherit;
        font-weight: var(--w-regular);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .msg-row {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .attachment-pill {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        padding: 0 6px 0 4px;
        border-radius: 999px;
        background: var(--sunken);
        color: var(--text-3);
        --icon-color: var(--text-3);
        font-size: 11px;
      }
    `;
  }

  constructor() {
    super();
    this.valueKey = 'id';
    this.emptyMessage = 'No messages';
    this.searchPlaceholder = 'Search messages';
    this.columns = [
      { key: 'contact', label: 'Contact', width: '180px', grow: 0 },
      { key: 'text', label: 'Message', grow: 2 },
      {
        key: 'created_on',
        label: 'Sent',
        width: '110px',
        grow: 0,
        align: 'right'
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

  protected renderCell(
    item: any,
    column: ContentListColumn
  ): TemplateResult | string {
    switch (column.key) {
      case 'contact': {
        const contact = item.contact || {};
        return html`<span class="msg-text"
          >${contact.name || contact.urn || ''}</span
        >`;
      }
      case 'text':
        return this.renderMessageBody(item);
      case 'created_on':
        return html`<temba-date
          value=${item.created_on}
          display="duration"
        ></temba-date>`;
      default:
        return super.renderCell(item, column);
    }
  }

  private renderMessageBody(item: any): TemplateResult {
    const labels = item.labels || [];
    const attachments = item.attachments || [];
    const isOptin = item.msg_type === 'optin' || item.type === 'optin';

    return html`
      <div class="msg-row">
        <span class="msg-text">
          ${item.text || (isOptin ? 'Opt-in request' : '')}
        </span>
        ${labels.length || attachments.length || item.flow || isOptin
          ? html`
              <div class="msg-meta">
                ${isOptin ? this.renderStatusPill('pending', 'opt-in') : null}
                ${attachments.map(
                  () => html`
                    <span class="attachment-pill">
                      <temba-icon
                        name=${Icon.attachment}
                        size="0.8"
                      ></temba-icon>
                      attachment
                    </span>
                  `
                )}
                ${item.flow
                  ? html`<temba-label type="flow" icon=${Icon.flow}
                      >${item.flow.name}</temba-label
                    >`
                  : null}
                ${labels.map(
                  (l: any) => html`
                    <temba-label type="label" icon=${Icon.label}
                      >${l.name}</temba-label
                    >
                  `
                )}
              </div>
            `
          : null}
      </div>
    `;
  }
}
