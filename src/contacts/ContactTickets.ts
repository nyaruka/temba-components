import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators';
import { Ticket, TicketStatus } from '../interfaces';
import { StoreElement } from '../store/StoreElement';

export class ContactTickets extends StoreElement {
  @property({ type: String })
  contact: string;

  @property({ type: Object, attribute: false })
  data: Ticket[];

  static get styles() {
    return css`
      :host {
        background: rgba(0, 0, 0, 0.6);
        color: #fff;
        --icon-color: #fff;
        border-radius: var(--curvature);
      }

      :hover {
        background: rgba(0, 0, 0, 0.9);
        border-radius: var(--curvature);
        transition: background 200ms ease-in-out, padding 200ms ease-in-out;
        cursor: pointer;
      }

      .tickets {
        display: flex;
        padding: 0.3em 0.8em;
      }

      .count {
        margin-left: 0.5em;
      }

      .ticket {
        display: flex;
        margin-bottom: 0.5em;
        border-radius: var(--curvature);
        display: flex;
        flex-direction: row;
        align-items: center;
        box-shadow: 0 0 8px 1px rgba(0, 0, 0, 0.055),
          0 0 0px 1px rgba(0, 0, 0, 0.02);
      }

      .ticket .body {
        flex-grow: 1;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        padding: 0.1em;
      }

      .ticket > div {
        padding: 1em;
      }

      .ticket .action {
        background: rgba(0, 0, 0, 0.1);
        border-top-right-radius: var(--curvature);
        border-bottom-right-radius: var(--curvature);
        padding: 1.5em;
        --icon-color: rgba(0, 0, 0, 0.4);
        white-space: nowrap;
      }

      .open .action {
        background: rgba(0, 0, 0, 0.1);
      }

      .closed .action {
        background: #fff;
      }
    `;
  }

  prepareData(data: any): any {
    if (data && data.length) {
      data.sort((a: Ticket, b: Ticket) => {
        return (
          new Date(a.opened_on).getTime() - new Date(b.opened_on).getTime()
        );
      });
    }
    return data;
  }

  protected updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);
    if (changes.has('contact')) {
      if (this.contact) {
        this.url = `/api/v2/tickets.json?contact=${this.contact}`;
      } else {
        this.url = null;
      }
    }
  }

  public renderTicket(ticket: Ticket) {
    const date =
      ticket.status === TicketStatus.Open ? ticket.opened_on : ticket.closed_on;
    return html`
      <div
        class="ticket ${ticket.status}"
        href="/ticket/all/open/${ticket.uuid}"
        onclick="goto(event)"
      >
        <div class="topic">${ticket.topic.name}</div>
        <div class="body">${ticket.body}</div>

        <div class="date">
          <temba-tip direction="left" text=${this.store.formatDate(date)}>
            ${this.store.getShortDuration(date)}
          </temba-tip>
        </div>

        ${ticket.status === TicketStatus.Open
          ? html`
              <div class="action">
                <temba-icon name="check" size="1.5" clickable></temba-icon>
              </div>
            `
          : html`
              <div class="action">
                <temba-icon name="check" size="1.5"></temba-icon>
              </div>
            `}
      </div>
    `;
  }

  public render(): TemplateResult {
    if (this.data && this.data.length > 0) {
      const ticket = this.data.find(
        (ticket: Ticket) => ticket.status == TicketStatus.Open
      );
      if (ticket) {
        return html`
          <div
            class="tickets"
            href="/ticket/all/open/${ticket.uuid}"
            onclick="goto(event)"
          >
            <div style="flex-grow:1"></div>
            <temba-icon name="agent" style="pointer-events: none;"></temba-icon>
            <div class="count" style="pointer-events: none;">
              ${this.data.filter(
                (ticket: Ticket) => ticket.status === TicketStatus.Open
              ).length}
            </div>
          </div>
        `;
      }
    }
  }
}
