import { css, html, TemplateResult } from 'lit';
import { ContactStoreElement } from './ContactStoreElement';
import { Icon } from '../Icons';
import { capitalize } from '../utils';
import { getLanguageName } from '../languages';

const STATUS = {
  active: 'Active',
  blocked: 'Blocked',
  stopped: 'Stopped',
  archived: 'Archived'
};

const SCHEMES = {
  tel: 'Phone',
  whatsapp: 'WhatsApp',
  fcm: 'Firebase Cloud Messaging',
  twitter: 'Twitter'
};

export class ContactDetails extends ContactStoreElement {
  static get styles() {
    return css`
      .wrapper {
        padding-top: 0em;
      }

      /* Mirrors the disabled <temba-contact-field> row so the Groups
         entry reads as just another field — same label color/size,
         same horizontal inset, same bottom separator. Margin matches
         the combined .wrapper + :host margins of contact-field
         (0.5em + 1em) so spacing between rows stays uniform. */
      .row {
        padding-bottom: 0.6em;
        border-bottom: 1px solid #ececec;
        margin-bottom: 1.5em;
      }

      .row .label {
        color: var(--text-2);
        font-size: 12px;
        font-weight: var(--w-medium);
        margin-top: 0.25em;
        margin-left: 0.25em;
      }

      .row .value {
        margin-left: 0.25em;
        margin-top: 0.1em;
        min-height: 1.75em;
        display: flex;
        flex-wrap: wrap;
        gap: 0.4em;
      }

      .group {
      }
    `;
  }

  // Not sure if we want to include name here or not, so hold onto this for the moment
  // ${this.data.name ? html`<temba-contact-field name="Name" value=${this.data.name} disabled></temba-contact-field>`:null}

  public render(): TemplateResult {
    if (!this.data) {
      return;
    }

    const lang = getLanguageName(this.data.language);

    return html`
      <div class="wrapper">
        ${this.data.groups.length > 0
          ? html` <div class="row">
              <div class="label">Groups</div>
              <div class="value">
                ${this.data.groups.map((group) => {
                  return html`<temba-label
                    class="group"
                    onclick="goto(event)"
                    href="/contact/group/${group.uuid}/"
                    icon=${group.is_dynamic ? Icon.group_smart : Icon.group}
                    type="group"
                    clickable
                  >
                    ${group.name}
                  </temba-label>`;
                })}
              </div>
            </div>`
          : null}
        ${this.data.urns.map((urn) => {
          const parts = urn.split(':');
          let scheme = SCHEMES[parts[0]];
          if (!scheme) {
            scheme = capitalize(parts[0] as any);
          }
          return html`<temba-contact-field
            name=${scheme}
            value=${parts[1]}
            disabled
          ></temba-contact-field>`;
        })}
        ${this.data.ref
          ? html`<temba-contact-field
              name="Ref"
              value=${this.data.ref}
              disabled
            ></temba-contact-field>`
          : null}

        <temba-contact-field
          name="Status"
          value=${STATUS[this.data.status]}
          disabled
        ></temba-contact-field>
        ${lang
          ? html`<temba-contact-field
              name="Language"
              value=${lang}
              disabled
            ></temba-contact-field>`
          : null}

        <temba-contact-field
          name="Created"
          value=${this.data.created_on}
          type="datetime"
          disabled
        ></temba-contact-field>
        <temba-contact-field
          name="Last Seen"
          value=${this.data.last_seen_on}
          type="datetime"
          disabled
        ></temba-contact-field>
      </div>
    `;
  }
}
