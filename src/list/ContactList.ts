import { css, html, property, TemplateResult } from 'lit-element';
import { TembaList } from './TembaList';
import { timeSince } from '../utils';
import { Contact } from '../interfaces';
import { renderAvatar } from '../contacts/events';

export class ContactList extends TembaList {
  static get styles() {
    return css`
      :host {
        width: 100%;
      }
    `;
  }

  @property({ type: Number })
  agent = 1;

  constructor() {
    super();

    this.valueKey = 'ticket.uuid';
    this.renderOption = (contact: Contact): TemplateResult => {
      return html`
        <div style="display: flex-col; align-items:center">
          <div style="display:flex;	align-items: flex-start;">
            <div style="flex: 1; color:#333; margin-top: 0.4em">
              <div style="font-weight:400">${contact.name}</div>
              ${contact.ticket.closed_on
                ? html`<div
                    style="font-size: 0.9em; margin:0.4em 0; display: -webkit-box;  -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;"
                  >
                    ${contact.ticket.subject}
                  </div>`
                : contact.last_msg
                ? html`
                    <div
                      style="font-size: 0.9em; margin-bottom:0.5em; display: -webkit-box;  -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;"
                    >
                      ${contact.last_msg.direction === 'I'
                        ? html`<div
                            style="border-radius:9999px; background:var(--color-primary-dark);width:6px;height:6px;display:inline-block;margin:0px 2px;margin-bottom:1px;"
                          ></div>`
                        : null}
                      ${contact.last_msg.text}
                    </div>
                  `
                : null}
            </div>
            <div
              style="font-size:0.8em;display:flex;flex-direction:column;align-items:center;width:30px"
            >
              <div style="text-align:center;padding:4px;padding-bottom:2px;">
                ${timeSince(
                  new Date(contact.ticket.closed_on || contact.last_seen_on)
                )}
              </div>
              <div style="font-size:0.7em;">
                ${contact.ticket.assignee
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
