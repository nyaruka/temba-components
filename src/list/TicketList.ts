import { html, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { msg } from '@lit/localize';
import { TembaList } from './TembaList';
import { Contact } from '../interfaces';
import { Icon } from '../Icons';

export class TicketList extends TembaList {
  @property({ type: String })
  agent = '';

  public getRefreshEndpoint() {
    if (this.items.length > 0) {
      // open tickets sort above closed ones, so the newest activity can be
      // anywhere in the list, not just the top
      const lastActivity = Math.max(
        ...this.items.map((item) =>
          new Date(item.ticket.last_activity_on).getTime()
        )
      );
      const separator = this.endpoint.includes('?') ? '&' : '?';
      return this.endpoint + separator + 'after=' + lastActivity * 1000;
    }
    return this.endpoint;
  }

  protected sanitizeResults(results: any[]): Promise<any[]> {
    return new Promise<any[]>((resolve) => {
      const contacts: Contact[] = results as Contact[];
      this.store.resolveUsers(contacts, ['ticket.assignee']).then(() => {
        resolve(contacts);
      });
    });
  }

  constructor() {
    super();

    this.valueKey = 'ticket.uuid';
    this.compareItems = (a: Contact, b: Contact): number => {
      const aClosed = !!a.ticket.closed_on;
      const bClosed = !!b.ticket.closed_on;
      if (aClosed !== bClosed) {
        return aClosed ? 1 : -1;
      }
      return (
        new Date(b.ticket.last_activity_on).getTime() -
        new Date(a.ticket.last_activity_on).getTime()
      );
    };
    // a quiet label marks where the list crosses from open into closed
    // tickets - the rows themselves then only need gentle muting
    this.renderDivider = (prev: Contact, contact: Contact): TemplateResult => {
      if (!contact.ticket.closed_on || (prev && prev.ticket.closed_on)) {
        return null;
      }
      return html`
        <div
          style="display:flex; align-items:center; gap:0.6em; padding:0.9em var(--pad, 0.75em) 0.2em var(--pad, 0.75em);"
        >
          <div
            style="font-size:0.7em; font-weight:500; letter-spacing:0.08em; text-transform:uppercase; color:var(--text-4, #a2abb8);"
          >
            ${msg('Closed')}
          </div>
          <div
            style="flex-grow:1; height:1px; background:var(--color-widget-border, #e6e6e6);"
          ></div>
        </div>
      `;
    };
    this.renderOption = (
      contact: Contact,
      selected: boolean
    ): TemplateResult => {
      // closed tickets are settled history - a compact single line that
      // recedes behind the open work above it
      if (contact.ticket.closed_on) {
        return html`
          <div
            style="display:flex; align-items:baseline; margin-top:0.1em; margin-bottom:0.1em; ${selected
              ? ''
              : 'color:var(--text-3, #7b8593);'}"
          >
            <div
              style="flex:1; min-width:0; font-weight:400; line-height:1.6; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"
            >
              ${contact.name}
            </div>
            <div style="font-size:0.8em; margin-left:0.75em;">
              <temba-date
                value=${contact.ticket.closed_on}
                display="duration"
              ></temba-date>
            </div>
          </div>
        `;
      }

      return html`
        <div
          style="align-items:center; margin-top: 0.1em; margin-bottom: 0.1em;"
        >
          <div
            style="display:flex; align-items: flex-start;border:0px solid red;"
          >
            <div style="flex: 1; color:#333;">
              <div
                style="font-weight:400;line-height:1.6;padding-right:0.5em;display:-webkit-box;-webkit-box-orient: vertical; -webkit-line-clamp: 1;overflow: hidden;"
              >
                ${contact.name}
              </div>
              ${contact.last_msg
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
                                  <temba-icon
                                    name="${Icon.attachment}"
                                  ></temba-icon>
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
              style="margin-right: -5px; margin-top: 0px;display:flex;flex-direction:column;align-items:flex-end;max-width:60px;min-width:30px;border:0px solid green;text-align:right"
            >
              <div>
                ${contact.ticket.assignee
                  ? html`<temba-user
                      name=${contact.ticket.assignee.name}
                      email=${contact.ticket.assignee.email}
                      avatar=${contact.ticket.assignee.avatar}
                      scale="0.8"
                    ></temba-user>`
                  : null}
              </div>
            </div>
          </div>

          <div style="font-size:0.8em;text-align:right;border:0px solid red;">
            <temba-date
              value=${contact.ticket.last_activity_on}
              display="duration"
            ></temba-date>
          </div>
        </div>
      `;
    };
  }
}
