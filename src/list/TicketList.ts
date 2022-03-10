import { html, TemplateResult } from 'lit';
import { property } from 'lit/decorators';
import { TembaList } from './TembaList';
import { timeSince } from '../utils';
import { Contact } from '../interfaces';
import { renderAvatar } from '../contacts/events';

export class TicketList extends TembaList {
  @property({ type: String })
  agent = '';

  public getRefreshEndpoint() {
    if (this.items.length > 0) {
      const lastActivity = this.items[0].ticket.last_activity_on;
      return (
        this.endpoint + '?after=' + new Date(lastActivity).getTime() * 1000
      );
    }
    return this.endpoint;
  }

  constructor() {
    super();

    this.valueKey = 'ticket.uuid';
    this.renderOption = (contact: Contact): TemplateResult => {
      return html`
        <div
          style="align-items:center; margin-top: 0.1em; margin-bottom: 0.1em"
        >
          <div
            style="display:flex; align-items: flex-start;border:0px solid red;"
          >
            <div style="flex: 1; color:#333;">
              <div
                style="font-weight:400;line-height:1.6;border:0px solid purple;"
              >
                ${contact.name}
              </div>
              ${contact.ticket.closed_on
                ? null
                : contact.last_msg
                ? html`
                    <div
                      style="font-size: 0.9em; display: -webkit-box;  -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;"
                    >
                      ${
                        contact.last_msg.direction === 'I'
                          ? html`<div
                              style="border-radius:9999px; background:var(--color-primary-dark);width:6px;height:6px;display:inline-block;margin:0px 2px;margin-bottom:1px;"
                            ></div>`
                          : null
                      }
                      ${
                        contact.last_msg.text
                          ? contact.last_msg.text
                          : contact.last_msg.attachments
                          ? html`<div style="display:inline-block">
                              <div style="display:flex; margin-left:0.2em">
                                <temba-icon name="paperclip"></temba-icon>
                                <div style="flex-grow:1;margin-left:0.2em">
                                  Attachment
                                </div>
                              </div>
                            </div>`
                          : 'Unsupported Message'
                      }
                    </div></div>
                  `
                : null}
            </div>
            <div
              style="font-size:0.8em;display:flex;flex-direction:column;align-items:flex-end;max-width:60px;min-width:30px;border:0px solid green;text-align:right"
            >
              <div style="padding:4px;padding-bottom:2px">
                ${timeSince(
                  new Date(
                    contact.ticket.closed_on || contact.ticket.last_activity_on
                  )
                )}
              </div>
              <div style="font-size:0.7em;">
                ${!contact.ticket.closed_on && contact.ticket.assignee
                  ? html`${renderAvatar(contact.ticket.assignee, this.agent)}`
                  : null}
              </div>
            </div>
          </div>
        </div>
      `;
    };
  }
}
