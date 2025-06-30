import { css, html, TemplateResult } from 'lit';
import { ContactStoreElement } from 'contacts/ContactStoreElement';
import { Icon } from 'vectoricon';
import { capitalize } from 'utils';

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
      .urn {
        display: flex;
        padding: 0.4em 1em 0.8em 1em;
        border-bottom: 1px solid #e6e6e6;
        margin-bottom: 0.5em;
      }

      .urn .path {
        margin-left: 0.2em;
      }

      .wrapper {
        padding-top: 0em;
      }

      .groups {
        padding: 0.4em 0.5em 0.6em 0.5em;
        border-bottom: 1px solid #e6e6e6;
        margin-bottom: 0.4em;
      }
      .group {
        margin-right: 0.7em;
        margin-bottom: 0.7em;
      }

      .label {
        font-size: 0.8em;
        color: rgb(136, 136, 136);
        margin-left: 0.5em;
        margin-bottom: 0.4em;
      }
    `;
  }

  // Not sure if we want to include name here or not, so hold onto this for the moment
  // ${this.data.name ? html`<temba-contact-field name="Name" value=${this.data.name} disabled></temba-contact-field>`:null}

  public render(): TemplateResult {
    if (!this.data) {
      return;
    }

    const lang = this.store.getLanguageName(this.data.language);

    return html`
      <div class="wrapper">
        ${this.data.groups.length > 0
          ? html` <div class="groups">
              <div class="label">Groups</div>
              ${this.data.groups.map((group) => {
                return html`<temba-label
                  class="group"
                  onclick="goto(event)"
                  href="/contact/group/${group.uuid}/"
                  icon=${group.is_dynamic ? Icon.group_smart : Icon.group}
                  clickable
                >
                  ${group.name}
                </temba-label>`;
              })}
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
