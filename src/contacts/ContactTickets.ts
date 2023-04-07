import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { CustomEventType, Ticket, TicketStatus } from '../interfaces';
import { StoreElement } from '../store/StoreElement';
import { getClasses, postJSON, renderAvatar } from '../utils';
import { Icon } from '../vectoricon';

export class ContactTickets extends StoreElement {
  @property({ type: String })
  contact: string;

  @property({ type: String })
  ticket: string;

  @property({ type: Boolean })
  clickable = false;

  @property({ type: Object, attribute: false })
  data: Ticket[];

  static get styles() {
    return css`
      :host {
      }

      :hover {
      }

      .ticket.clickable:hover {
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
        background: #fff;
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
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
        padding: 0.1em;
      }

      .date {
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
        padding: 0.1em;
      }

      .ticket > div {
        padding: 0.5em 1em;
      }

      .status {
        --icon-color: #999;
      }

      .ticket.closed {
        background: #f9f9f9;
        color: #888;
      }

      .resolve {
        margin-right: 1em;
        color: var(--color-primary-dark);
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
    if (changes.has('contact') || changes.has('ticket')) {
      if (this.contact) {
        this.url = `/api/v2/tickets.json?contact=${this.contact}${
          this.ticket ? '&ticket=' + this.ticket : ''
        }`;
      } else {
        this.url = null;
      }
    }
  }

  private handleClose(uuid: string) {
    postJSON(`/api/v2/ticket_actions.json`, {
      tickets: [uuid],
      action: 'close',
    })
      .then(() => {
        this.refresh();
      })
      .catch((response: any) => {
        console.error(response);
      });
  }

  private handleReopen(uuid: string) {
    postJSON(`/api/v2/ticket_actions.json`, {
      tickets: [uuid],
      action: 'reopen',
    })
      .then(() => {
        this.refresh();
      })
      .catch((response: any) => {
        console.error(response);
      });
  }

  public renderTicket(ticket: Ticket) {
    const date = ticket.opened_on;
    return html`
      <div
        @click=${() => {
          if (this.clickable) {
            this.fireCustomEvent(CustomEventType.ButtonClicked, { ticket });
          }
        }}
        class="ticket ${ticket.status} ${getClasses({
          clickable: this.clickable,
        })}"
      >
        <div class="topic">${ticket.topic.name}</div>
        <div class="body">${ticket.body}</div>

        <div class="date">
          <temba-date value="${date}" display="duration"></temba-date>
        </div>

        ${ticket.status === TicketStatus.Closed
          ? html`<div class="reopen">
              <temba-button
                primary
                small
                name="Reopen"
                @click=${(event: MouseEvent) => {
                  event.preventDefault();
                  event.stopPropagation();
                  this.handleReopen(ticket.uuid);
                }}
              ></temba-button>
            </div>`
          : html`
              <div style="font-size:.5em">
                ${ticket.assignee
                  ? renderAvatar({ name: ticket.assignee.name })
                  : null}
              </div>
              <temba-tip
                text="Resolve"
                position="left"
                style="width:1.5em"
                class="resolve"
              >
                <temba-icon
                  size="1.25"
                  name="${Icon.check}"
                  @click=${(event: MouseEvent) => {
                    event.preventDefault();
                    event.stopPropagation();
                    this.handleClose(ticket.uuid);
                  }}
                  ?clickable=${open}
                />
              </temba-tip>
            `}
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
