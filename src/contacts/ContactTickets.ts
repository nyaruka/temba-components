import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { Ticket, TicketStatus } from '../interfaces';
import { StoreElement } from '../store/StoreElement';
import { Icon } from '../vectoricon';

export class ContactTickets extends StoreElement {
  @property({ type: String })
  contact: string;

  @property({ type: Object, attribute: false })
  data: Ticket[];

  static get styles() {
    return css`
      :host {
        padding: 1em;
      }

      :hover {
      }

      .ticket:hover {
        cursor: pointer;
        box-shadow: 0 0 8px 1px rgba(0, 0, 0, 0.055),
          0 0 0px 2px var(--color-link-primary);
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
        padding: 0.5em 1em;
        pointer-events: none;
      }

      .status {
        --icon-color: #999;
      }

      .ticket.closed {
        background: #f9f9f9;
        color: #888;
      }
    `;
  }

  prepareData(data: any): any {
    if (data && data.length) {
      data.sort((a: Ticket, b: Ticket) => {
        if (a.status == TicketStatus.Open && b.status == TicketStatus.Closed) {
          return -1;
        }

        if (b.status == TicketStatus.Open && a.status == TicketStatus.Closed) {
          return 1;
        }

        if (
          a.status == TicketStatus.Closed &&
          b.status == TicketStatus.Closed
        ) {
          return (
            new Date(b.closed_on).getTime() - new Date(a.closed_on).getTime()
          );
        }

        return (
          new Date(b.opened_on).getTime() - new Date(a.opened_on).getTime()
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
            ${this.store.getShortDurationFromIso(date)}
          </temba-tip>
        </div>

        ${ticket.status === TicketStatus.Closed
          ? html`<div class="status">
              <temba-icon name="${Icon.check}"></temba-icon>
            </div>`
          : null}
      </div>
    `;
  }

  public render(): TemplateResult {
    if (this.data && this.data.length > 0) {
      const tickets = this.data.map(ticket => {
        return this.renderTicket(ticket);
      });

      return html`${tickets}`;
    }

    return html`<slot name="empty"></slot>`;
  }
}
