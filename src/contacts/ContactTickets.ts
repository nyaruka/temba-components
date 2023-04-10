import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { CustomEventType, Ticket, TicketStatus, User } from '../interfaces';
import { StoreElement } from '../store/StoreElement';
import {
  getAssets,
  getClasses,
  getFullName,
  postJSON,
  renderAvatar,
  stopEvent,
} from '../utils';
import { Icon } from '../vectoricon';

export class ContactTickets extends StoreElement {
  @property({ type: String })
  agent: string;

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

      .dropdown {
        color: rgb(45, 45, 45);
        z-index: 50;
        width: 18em;
      }

      .option-group {
        padding: 0.4em;
        border-bottom: 1px solid #f3f3f3;
      }

      .assigned .user {
        flex-grow: 1;
      }

      .assigned {
        display: flex;
        align-items: center;
      }

      .assigned temba-button {
        margin-right: 0.75em;
      }

      .assigned .user:hover {
        cursor: default;
        background: none;
      }

      .options {
        max-height: 40vh;
        overflow-y: auto;
        border-bottom: none;
      }

      .user {
        display: flex;
        padding: 0.4em 0.7em;
        align-items: center;
        border-radius: var(--curvature);
        cursor: pointer;
      }

      .user:hover {
        background: var(--color-selection);
      }

      .user .avatar {
        font-size: 0.5em;
        margin-right: 1em;
      }

      .user .name {
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
        flex-grow: 1;
      }

      .user temba-button {
        margin-left: 0.5em;
      }

      .current-user {
        font-weight: 400;
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

  private renderUser(user: User) {
    if (!user) {
      return null;
    }
    return html`<div class="user">
      <div class="avatar">${renderAvatar({ user: user })}</div>
      <div class="name">${getFullName(user)}</div>
    </div>`;
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

  public handleTicketAssignment(uuid: string, email: string) {
    // if its already assigned to use, it's a noop
    const ticket = this.data.find(ticket => ticket.uuid === uuid);
    if (ticket.assignee && ticket.assignee.email === email) {
      return;
    }

    postJSON(`/api/v2/ticket_actions.json`, {
      tickets: [uuid],
      action: 'assign',
      assignee: email,
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
    const users = this.store.getAssignableUsers();
    const agent = users.find(user => user.email === this.agent);
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
              <div>
                <temba-dropdown
                  drop_align="right"
                  arrowsize="8"
                  arrowoffset="-44"
                  offsety="8"
                  offsetx=${ticket.assignee ? -42 : -28}
                >
                  <div slot="toggle" class="toggle">
                    ${ticket.assignee
                      ? html`
                          <div style="font-size:0.5em">
                            ${renderAvatar({
                              name: ticket.assignee.name,
                              position: 'left',
                            })}
                          </div>
                        `
                      : html`
                          <temba-button
                            name="Assign"
                            primary
                            small
                          ></temba-button>
                        `}
                  </div>

                  <div
                    slot="dropdown"
                    class="dropdown"
                    @click=${(event: MouseEvent) => {
                      stopEvent(event);
                    }}
                  >
                    ${ticket.assignee
                      ? html`
                          <div
                            class="assigned option-group ${agent &&
                            ticket.assignee.email == agent.email
                              ? 'current-user'
                              : ''}"
                          >
                            ${this.renderUser(
                              users.find(
                                user => user.email === ticket.assignee.email
                              )
                            )}
                            <temba-button
                              name="Unassign"
                              primary
                              small
                              @click=${(event: MouseEvent) => {
                                stopEvent(event);
                                this.handleTicketAssignment(ticket.uuid, null);
                              }}
                            ></temba-button>
                          </div>
                        `
                      : null}
                    ${agent &&
                    (!ticket.assignee || agent.email !== ticket.assignee.email)
                      ? html`
                          <div
                            class="current-user option-group"
                            @click=${(event: MouseEvent) => {
                              stopEvent(event);
                              this.handleTicketAssignment(
                                ticket.uuid,
                                agent.email
                              );
                            }}
                          >
                            ${this.renderUser(agent)}
                          </div>
                        `
                      : null}

                    <div class="options option-group">
                      ${this.store.getAssignableUsers().map(user => {
                        if (
                          ticket.assignee &&
                          user.email === ticket.assignee.email
                        ) {
                          return null;
                        }

                        if (user.email === this.agent) {
                          return null;
                        }
                        return html`<div
                          @click=${(event: MouseEvent) => {
                            stopEvent(event);
                            this.handleTicketAssignment(
                              ticket.uuid,
                              user.email
                            );
                          }}
                        >
                          ${this.renderUser(user)}
                        </div>`;
                      })}
                    </div>
                  </div>
                </temba-dropdown>
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
