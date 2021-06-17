import { css, html, TemplateResult } from 'lit-element';
import { TembaList } from './TembaList';
import { timeSince } from '../utils';
import { Contact } from '../interfaces';

export class ContactList extends TembaList {
  static get styles() {
    return css`
      :host {
        width: 100%;
      }
    `;
  }

  constructor() {
    super();

    this.valueKey = 'ticket.uuid';
    this.renderOption = (contact: Contact): TemplateResult => {
      return html`
        <div style="display: flex-col;">
          <div style="display:flex;	align-items: center;">
            <div
              style="flex: 1; font-weight:400; color:#333; margin-top: 0.4em"
            >
              ${contact.name}
            </div>
            <div style="font-size: 11px">
              ${timeSince(
                new Date(contact.ticket.closed_on || contact.last_seen_on)
              )}
            </div>
          </div>
          ${contact.ticket.closed_on
            ? html`<div
                style="font-size: 11px; margin:0.4em 0; display: -webkit-box;  -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;"
              >
                ${contact.ticket.subject}
              </div>`
            : contact.last_msg
            ? html`
                <div
                  style="font-size: 11px; margin:0.4em 0; display: -webkit-box;  -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;"
                >
                  ${contact.last_msg.direction === 'I'
                    ? html`<temba-icon
                        name="user"
                        style="display:inline-block;margin-bottom:-1px;fill:rgba(0,0,0,.6)"
                      ></temba-icon>`
                    : null}
                  ${contact.last_msg.text}
                </div>
              `
            : null}
        </div>
      `;
    };
  }
}
