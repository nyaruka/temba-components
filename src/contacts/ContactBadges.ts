import { css, html, TemplateResult } from 'lit';
import { Group } from '../interfaces';
import { Icon } from '../vectoricon';
import { ContactStoreElement } from './ContactStoreElement';

const STATUS = {
  stopped: { name: 'Stopped' },
  blocked: { name: 'Blocked' },
  archived: { name: 'Archived' },
};

export class ContactBadges extends ContactStoreElement {
  static get styles() {
    return css`
      temba-label {
        margin: 0.3em;
      }

      .badges {
        display: flex;
        flex-wrap: wrap;
      }
    `;
  }

  public render(): TemplateResult {
    if (this.data) {
      const status = STATUS[this.data.status];

      return html`
        <div class="badges">
          ${status && this.data.status !== 'active'
            ? html`
                <temba-label
                  icon="icon.contact_${this.data.status}"
                  onclick="goto(event)"
                  href="/contact/${status.name.toLowerCase()}/"
                  secondary
                  clickable
                  shadow
                >
                  ${status.name}
                </temba-label>
              `
            : null}
          ${this.data.flow
            ? html`
                <temba-label
                  icon="flow"
                  onclick="goto(event)"
                  href="/contact/?search=flow+%3D+${encodeURIComponent(
                    '"' + this.data.flow.name + '"'
                  )}"
                  clickable
                  primary
                  shadow
                >
                  ${this.data.flow.name}
                </temba-label>
              `
            : null}
          ${this.data.language
            ? html`
                <temba-label
                  icon=${Icon.language}
                  onclick="goto(event)"
                  href="/contact/?search=language+%3D+${encodeURIComponent(
                    '"' + this.data.language + '"'
                  )}"
                  clickable
                  primary
                  shadow
                >
                  ${this.store.getLanguageName(this.data.language)}
                </temba-label>
              `
            : null}
          ${this.data.groups.map((group: Group) => {
            return html`
              <temba-label
                class="group"
                onclick="goto(event)"
                href="/contact/filter/${group.uuid}/"
                icon=${group.is_dynamic ? Icon.group_smart : Icon.group}
                clickable
                shadow
              >
                ${group.name}
              </temba-label>
            `;
          })}
        </div>
      `;
    } else {
      return null;
    }
  }
}
