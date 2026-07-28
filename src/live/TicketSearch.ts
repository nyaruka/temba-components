import { css, html, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { ModalSearchResult, SearchModal } from '../layout/SearchModal';
import { getUrl } from '../utils';

export interface TicketSearchResult extends ModalSearchResult {
  contact: { uuid: string; name: string };
  ticket: { uuid: string; status: string };
  // The matched message event (uuid, type, text, created_on, ticket_uuid, ...)
  event: any;
  // The query that produced this result, so selection handlers can re-run
  // the search within the ticket
  query: string;
}

const BADGE_COLOR = '#6b7280';

// rough number of characters that fit on a result row - the snippet is
// windowed around the match so the match stays visible if CSS clips the tail
const SNIPPET_BUDGET = 60;

/**
 * Searches message text across all of an org's ticket chats. Searching hits
 * an endpoint, so it waits for Enter rather than running on every keystroke.
 */
export class TicketSearch extends SearchModal<TicketSearchResult> {
  static styles = [
    SearchModal.styles,
    css`
      .result-type-badge {
        max-width: 35%;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .result-text {
        flex-grow: 1;
      }

      .result-date {
        flex-shrink: 0;
        font-size: 11px;
        color: #9ca3af;
      }
    `
  ];

  @property({ type: String })
  endpoint = '/ticket/search/';

  constructor() {
    super();
    this.searchOnEnter = true;
  }

  protected getSearchLabel(): string {
    return 'Search tickets';
  }

  protected renderHint(): TemplateResult {
    return html`<div class="hint">
      <kbd>Enter</kbd> to search &nbsp; <kbd>Esc</kbd> to close
    </div>`;
  }

  protected async performSearch(query: string): Promise<TicketSearchResult[]> {
    const response = await getUrl(
      `${this.endpoint}?text=${encodeURIComponent(query)}`
    );
    const results = (response.json as any).results || [];
    return results.map((result: any) => this.toSearchResult(result, query));
  }

  private toSearchResult(result: any, query: string): TicketSearchResult {
    const text = result.event?.msg?.text || result.event?.text || '';
    const lowerText = text.toLowerCase();
    const lowerQuery = query.trim().toLowerCase();

    // highlight the whole query if it appears verbatim, otherwise the first
    // matching term (the backend matches terms independently)
    let matchStart = lowerText.indexOf(lowerQuery);
    let matchLength = lowerQuery.length;
    if (matchStart === -1) {
      for (const term of lowerQuery.split(/\s+/)) {
        const idx = lowerText.indexOf(term);
        if (idx !== -1) {
          matchStart = idx;
          matchLength = term.length;
          break;
        }
      }
    }
    if (matchStart === -1) {
      matchStart = 0;
      matchLength = 0;
    }

    return {
      typeName: result.contact?.name || 'Unknown',
      color: BADGE_COLOR,
      fullText: text,
      matchStart,
      matchLength,
      contact: result.contact,
      ticket: result.ticket,
      event: result.event,
      query: query.trim()
    };
  }

  /**
   * Unlike the base (which anchors the match near the start and lets CSS
   * clip the tail), message snippets are windowed to roughly center the
   * match, with ellipses marking clipped context on either side.
   */
  protected renderMatchText(result: TicketSearchResult): TemplateResult {
    const text = result.fullText.replace(/\n/g, ' ');
    const { matchStart, matchLength } = result;

    if (matchLength === 0) {
      return html`${text}`;
    }

    const matchEnd = matchStart + matchLength;
    const highlight = (start: number, end: number) =>
      html`${start > 0 ? '…' : ''}${text.slice(
        start,
        matchStart
      )}<mark>${text.slice(matchStart, matchEnd)}</mark>${text.slice(
        matchEnd,
        end
      )}${end < text.length ? '…' : ''}`;

    if (text.length <= SNIPPET_BUDGET) {
      return highlight(0, text.length);
    }

    // center the match in the character budget, shifting the window back
    // into range when the match sits near either end of the text
    const context = Math.max(0, SNIPPET_BUDGET - matchLength);
    let start = matchStart - Math.floor(context / 2);
    let end = matchEnd + Math.ceil(context / 2);
    if (start < 0) {
      end = Math.min(text.length, end - start);
      start = 0;
    }
    if (end > text.length) {
      start = Math.max(0, start - (end - text.length));
      end = text.length;
    }

    return highlight(start, end);
  }

  protected renderResultContent(result: TicketSearchResult): TemplateResult {
    return html`
      ${super.renderResultContent(result)}
      <div class="result-date">
        <temba-date
          value=${result.event?.created_on}
          display="duration"
        ></temba-date>
      </div>
    `;
  }
}
